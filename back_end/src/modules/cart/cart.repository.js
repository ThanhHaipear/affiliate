const prisma = require("../../config/prisma");
const { generateOrderCode } = require("../../utils/code");

const getCurrentPlatformFee = (tx) =>
  tx.platformFeeConfig.findFirst({
    where: {
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

async function createInventoryReservation(tx, { variantId, quantity, referenceId, note, referenceType = "ORDER" }) {
  const inventory = await tx.inventory.findUnique({ where: { variantId } });
  if (!inventory) {
    throw new Error("Inventory not found for this variant");
  }

  const availableStock = Number(inventory.quantity) - Number(inventory.reservedQuantity);
  if (availableStock < quantity) {
    throw new Error(`Only ${Math.max(0, availableStock)} items are available in stock`);
  }

  const nextReserved = Number(inventory.reservedQuantity) + quantity;
  await tx.inventory.update({
    where: { variantId },
    data: { reservedQuantity: nextReserved, updatedAt: new Date() },
  });

  await tx.inventoryTransaction.create({
    data: {
      variantId,
      type: "RESERVE",
      quantity,
      stockAfter: inventory.quantity,
      reservedAfter: nextReserved,
      referenceType,
      referenceId,
      idempotencyKey: `${referenceType}_RESERVE_${referenceId}_${variantId}_${Date.now()}`,
      note,
      createdAt: new Date(),
    },
  });
}

async function getShippingAddress(tx, accountId, addressId) {
  const rows = await tx.$queryRaw`
    SELECT
      id,
      recipient_name AS recipientName,
      phone,
      province,
      district,
      ward,
      detail
    FROM customer_addresses
    WHERE id = ${BigInt(addressId)} AND account_id = ${accountId}
    LIMIT 1
  `;

  const address = rows[0] || null;
  if (!address) {
    throw new Error("Shipping address not found");
  }

  return address;
}

function normalizeSelectedItemIds(selectedItemIds = []) {
  return [...new Set((selectedItemIds || []).map((itemId) => BigInt(itemId)))];
}

function allocateDiscountsBySeller(groups = [], totalDiscount = 0) {
  const normalizedDiscount = Math.max(0, Number(totalDiscount || 0));
  if (!normalizedDiscount || !groups.length) {
    return new Map(groups.map((group) => [group.sellerId, 0]));
  }

  const totalSubtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const allocations = new Map();

  if (!totalSubtotal) {
    const evenShare = Math.floor(normalizedDiscount / groups.length);
    let assigned = 0;
    groups.forEach((group, index) => {
      const amount = index === groups.length - 1 ? normalizedDiscount - assigned : evenShare;
      allocations.set(group.sellerId, amount);
      assigned += amount;
    });
    return allocations;
  }

  let assigned = 0;
  groups.forEach((group, index) => {
    const amount = index === groups.length - 1
      ? normalizedDiscount - assigned
      : Math.floor((normalizedDiscount * group.subtotal) / totalSubtotal);
    allocations.set(group.sellerId, amount);
    assigned += amount;
  });

  return allocations;
}

function buildCartItemIdentityWhere(cartId, variantId, attribution) {
  return {
    cartId,
    variantId,
    affiliateId: attribution?.affiliateId ?? null,
    attributionSessionId: attribution?.id ?? null,
    affiliateLinkId: attribution?.affiliateLinkId ?? null,
  };
}

function getInventoryAvailableStock(inventory = null) {
  if (!inventory) {
    return 0;
  }

  return Math.max(0, Number(inventory.quantity || 0) - Number(inventory.reservedQuantity || 0));
}

async function getCartVariantQuantity(tx, cartId, variantId, excludeItemId = null) {
  const items = await tx.cartItem.findMany({
    where: {
      cartId,
      variantId,
      ...(excludeItemId ? { id: { not: BigInt(excludeItemId) } } : {}),
    },
    select: {
      quantity: true,
    },
  });

  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

exports.getCart = async (accountId) => {
  let cart = await prisma.cart.findFirst({
    where: { accountId },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            include: {
              images: {
                orderBy: { sortOrder: "asc" },
              },
              seller: true,
              affiliateSetting: true,
            },
          },
          variant: { include: { inventory: true } },
          affiliateLink: true,
          attributionSession: true,
          affiliate: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { accountId, createdAt: new Date(), updatedAt: new Date() },
      include: { items: { orderBy: { createdAt: "desc" } } },
    });
  }

  return cart;
};

exports.addItem = async (accountId, payload) =>
  prisma.$transaction(async (tx) => {
    let cart = await tx.cart.findFirst({ where: { accountId } });
    if (!cart) {
      cart = await tx.cart.create({ data: { accountId, createdAt: new Date(), updatedAt: new Date() } });
    }

    const attribution = payload.attributionToken
      ? await tx.attributionSession.findUnique({ where: { token: payload.attributionToken } })
      : null;

    const variant = await tx.productVariant.findUnique({
      where: { id: payload.variantId },
      include: { inventory: true },
    });

    if (!variant || !variant.inventory) {
      throw new Error("Product variant is unavailable");
    }

    const shouldMergeWithExisting = payload.mergeWithExisting !== false;
    const existing = shouldMergeWithExisting
      ? await tx.cartItem.findFirst({
        where: buildCartItemIdentityWhere(cart.id, payload.variantId, attribution),
      })
      : null;

    if (payload.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const availableStock = getInventoryAvailableStock(variant.inventory);
    const currentVariantQuantityInCart = await getCartVariantQuantity(tx, cart.id, payload.variantId);
    const nextVariantQuantityInCart = currentVariantQuantityInCart + Number(payload.quantity || 0);

    if (nextVariantQuantityInCart > availableStock) {
      throw new Error(`Only ${availableStock} items are available in stock`);
    }

    const nextQuantity = (existing?.quantity || 0) + payload.quantity;
    if (nextQuantity > availableStock) {
      throw new Error(`Only ${availableStock} items are available in stock`);
    }

    if (existing) {
      return tx.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQuantity,
          updatedAt: new Date(),
        },
      });
    }

    return tx.cartItem.create({
      data: {
        cartId: cart.id,
        productId: payload.productId,
        variantId: payload.variantId,
        quantity: payload.quantity,
        affiliateId: attribution?.affiliateId,
        attributionSessionId: attribution?.id,
        affiliateLinkId: attribution?.affiliateLinkId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

exports.updateItemQuantity = async (accountId, itemId, quantity) =>
  prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({ where: { accountId } });
    if (!cart) throw new Error("Cart not found");

    const item = await tx.cartItem.findFirst({
      where: { id: BigInt(itemId), cartId: cart.id },
      include: { variant: { include: { inventory: true } } },
    });

    if (!item) throw new Error("Cart item not found");
    if (quantity < 1) throw new Error("Quantity must be greater than 0");

    const availableStock = getInventoryAvailableStock(item.variant.inventory);
    const otherVariantQuantityInCart = await getCartVariantQuantity(tx, cart.id, item.variantId, item.id);
    const nextVariantQuantityInCart = otherVariantQuantityInCart + Number(quantity || 0);

    if (nextVariantQuantityInCart > availableStock) {
      throw new Error(`Only ${availableStock} items are available in stock`);
    }

    return tx.cartItem.update({
      where: { id: item.id },
      data: { quantity, updatedAt: new Date() },
    });
  });

exports.removeItem = async (accountId, itemId) =>
  prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({ where: { accountId } });
    if (!cart) throw new Error("Cart not found");

    const item = await tx.cartItem.findFirst({
      where: { id: BigInt(itemId), cartId: cart.id },
    });
    if (!item) throw new Error("Cart item not found");

    await tx.cartItem.delete({ where: { id: item.id } });

    return { id: itemId, removed: true };
  });

exports.checkout = async (accountId, payload) =>
  prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({
      where: { accountId },
      include: {
        items: {
          include: {
            product: { include: { affiliateSetting: true } },
            variant: { include: { inventory: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

    const selectedIds = normalizeSelectedItemIds(payload.selectedItemIds);
    const checkoutItems = selectedIds.length
      ? cart.items.filter((item) => selectedIds.includes(item.id))
      : cart.items;

    if (!checkoutItems.length) {
      throw new Error("No cart items selected for checkout");
    }

    const shippingAddress = await getShippingAddress(tx, accountId, payload.addressId);
    const feeConfig = await getCurrentPlatformFee(tx);
    if (!feeConfig) throw new Error("Missing active platform fee config");

    const platformFeeType = "PERCENT";
    const platformFeeValue = Number(feeConfig.feeValue);
    const orderCode = generateOrderCode();
    const perShopShippingFee = Number(payload.shippingFee || 0);
    const snapshots = [];

    for (const item of checkoutItems) {
      const inventory = item.variant.inventory;
      const availableStock = Number(inventory?.quantity || 0) - Number(inventory?.reservedQuantity || 0);

      if (!inventory || availableStock < item.quantity) {
        throw new Error(`Only ${Math.max(0, availableStock)} items are available for variant ${item.variantId}`);
      }

      const lineTotal = Number(item.variant.price) * item.quantity;
      const commissionValue = item.product.affiliateSetting ? Number(item.product.affiliateSetting.commissionValue) : 0;
      const commissionAmount = item.affiliateId
        ? Math.floor((lineTotal * commissionValue) / 100)
        : 0;
      const platformFeeAmount = Math.floor((lineTotal * platformFeeValue) / 100);
      const sellerNetAmount = lineTotal - commissionAmount - platformFeeAmount;

      snapshots.push({
        item,
        inventory,
        lineTotal,
        commissionType: "PERCENT",
        commissionValue,
        commissionAmount,
        platformFeeAmount,
        sellerNetAmount,
      });
    }
    const groupedBySeller = new Map();
    snapshots.forEach((snapshot) => {
      const sellerId = snapshot.item.product.sellerId;
      const current = groupedBySeller.get(sellerId) || {
        sellerId,
        snapshots: [],
        subtotal: 0,
        platformFeeAmount: 0,
      };
      current.snapshots.push(snapshot);
      current.subtotal += snapshot.lineTotal;
      current.platformFeeAmount += snapshot.platformFeeAmount;
      groupedBySeller.set(sellerId, current);
    });

    const sellerGroups = Array.from(groupedBySeller.values());
    const discountAllocations = allocateDiscountsBySeller(sellerGroups, payload.discountAmount);
    const createdOrders = [];

    for (const group of sellerGroups) {
      const groupDiscountAmount = discountAllocations.get(group.sellerId) || 0;
      const totalAmount = group.subtotal + perShopShippingFee - groupDiscountAmount;
      const order = await tx.order.create({
        data: {
          orderCode,
          buyerId: accountId,
          buyerName: payload.buyerName || shippingAddress.recipientName,
          buyerEmail: payload.buyerEmail,
          buyerPhone: payload.buyerPhone || shippingAddress.phone,
          sellerId: group.sellerId,
          status: "PENDING_PAYMENT",
          subtotal: BigInt(group.subtotal),
          shippingFee: BigInt(perShopShippingFee),
          discountAmount: BigInt(groupDiscountAmount),
          totalAmount: BigInt(totalAmount),
          sellerConfirmedReceivedMoney: false,
          platformFeeType,
          platformFeeValue: BigInt(platformFeeValue),
          platformFeeAmount: BigInt(group.platformFeeAmount),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.$executeRaw`
        UPDATE orders
        SET
          shipping_address_id = ${BigInt(payload.addressId)},
          shipping_recipient_name = ${shippingAddress.recipientName},
          shipping_phone = ${shippingAddress.phone},
          shipping_province = ${shippingAddress.province},
          shipping_district = ${shippingAddress.district},
          shipping_ward = ${shippingAddress.ward},
          shipping_detail = ${shippingAddress.detail},
          shipping_method = ${payload.shippingMethod}
        WHERE id = ${order.id}
      `;

      const commissionSnapshotsByAffiliate = new Map();

      for (const snapshot of group.snapshots) {
        await createInventoryReservation(tx, {
          variantId: snapshot.item.variantId,
          quantity: snapshot.item.quantity,
          referenceId: order.id,
          referenceType: "ORDER",
          note: "Reserve stock when customer checkout creates order",
        });

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: snapshot.item.productId,
            variantId: snapshot.item.variantId,
            productNameSnapshot: snapshot.item.product.name,
            variantNameSnapshot: snapshot.item.variant.variantName,
            skuSnapshot: snapshot.item.variant.sku,
            quantity: snapshot.item.quantity,
            price: snapshot.item.variant.price,
            lineTotal: BigInt(snapshot.lineTotal),
            affiliateId: snapshot.item.affiliateId,
            attributionSessionId: snapshot.item.attributionSessionId,
            affiliateLinkId: snapshot.item.affiliateLinkId,
            commissionTypeSnapshot: snapshot.commissionType,
            commissionValueSnapshot: snapshot.commissionType ? BigInt(snapshot.commissionValue) : null,
            commissionAmount: BigInt(snapshot.commissionAmount),
            platformFeeTypeSnapshot: platformFeeType,
            platformFeeValueSnapshot: BigInt(platformFeeValue),
            platformFeeAmount: BigInt(snapshot.platformFeeAmount),
            sellerNetAmount: BigInt(snapshot.sellerNetAmount),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        if (snapshot.item.affiliateId && snapshot.commissionAmount > 0) {
          const current = commissionSnapshotsByAffiliate.get(snapshot.item.affiliateId) || {
            total: 0,
            items: [],
          };

          current.total += snapshot.commissionAmount;
          current.items.push({
            orderItemId: orderItem.id,
            productId: snapshot.item.productId,
            amount: snapshot.commissionAmount,
          });

          commissionSnapshotsByAffiliate.set(snapshot.item.affiliateId, current);
        }
      }

      for (const [affiliateId, aggregate] of commissionSnapshotsByAffiliate.entries()) {
        const commission = await tx.affiliateCommission.create({
          data: {
            orderId: order.id,
            affiliateId,
            sellerId: group.sellerId,
            totalCommission: BigInt(aggregate.total),
            status: "PENDING",
            fraudCheckStatus: "PENDING",
            note: "Pending commission recorded at checkout",
            createdAt: new Date(),
          },
        });

        if (aggregate.items.length) {
          await tx.affiliateCommissionItem.createMany({
            data: aggregate.items.map((item) => ({
              commissionId: commission.id,
              orderItemId: item.orderItemId,
              productId: item.productId,
              amount: BigInt(item.amount),
            })),
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: payload.paymentMethod,
          status: "PENDING",
          amount: BigInt(totalAmount),
          createdAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          oldStatus: null,
          newStatus: "PENDING_PAYMENT",
          note: "Order created",
          changedAt: new Date(),
        },
      });

      createdOrders.push(order.id);
    }

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        ...(selectedIds.length ? { id: { in: selectedIds } } : {}),
      },
    });

    const orders = await tx.order.findMany({
      where: { id: { in: createdOrders } },
      include: { items: true, payments: true },
      orderBy: { id: "asc" },
    });

    return {
      orderCode,
      orders,
      totalOrders: orders.length,
      totalShippingFee: perShopShippingFee * sellerGroups.length,
    };
  });

exports.__private = {
  allocateDiscountsBySeller,
  buildCartItemIdentityWhere,
};
