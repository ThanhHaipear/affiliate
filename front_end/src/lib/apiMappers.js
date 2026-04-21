function toNumber(value) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function translateCommissionReason(reason = "", { orderStatus, sellerConfirmed, status } = {}) {
  const normalizedReason = String(reason || "").trim();

  if (!normalizedReason) {
    if (orderStatus === "CANCELLED") {
      return "Đơn hàng đã bị hủy nên không đủ điều kiện nhận hoa hồng.";
    }

    if (orderStatus === "REFUNDED") {
      return "Đơn hàng đã được hoàn tiền nên không đủ điều kiện nhận hoa hồng.";
    }

    if (!sellerConfirmed && status === "PENDING") {
      return "Hoa hồng đang tạm giữ và chờ seller xác nhận đã nhận tiền.";
    }

    if (["APPROVED", "WALLET_CREDITED", "PAID_OUT"].includes(status)) {
      return "Hoa hồng đã đủ điều kiện và được ghi nhận vào ví affiliate.";
    }

    return "";
  }

  const lowerReason = normalizedReason.toLowerCase();

  if (lowerReason.includes("pending commission recorded at checkout")) {
    return "Hoa hồng tạm tính đã được ghi nhận khi khách hoàn tất thanh toán.";
  }

  if (lowerReason.includes("credited") && lowerReason.includes("wallet")) {
    return "Hoa hồng đã được cộng vào ví affiliate.";
  }

  if (lowerReason.includes("rejected")) {
    return "Hoa hồng đã bị từ chối.";
  }

  return normalizedReason;
}

function getAccountDisplayName(account = {}) {
  return (
    account?.adminProfile?.fullName ||
    account?.affiliate?.fullName ||
    account?.customerProfile?.fullName ||
    account?.sellers?.[0]?.shopName ||
    account?.email ||
    account?.phone ||
    (account?.id ? `Account #${account.id}` : "--")
  );
}

function getAccountActorRole(account = {}) {
  const roles = (account?.accountRoles || []).map((item) => item.role?.code).filter(Boolean);

  if (roles.includes("ADMIN")) return "Admin";
  if (roles.includes("SELLER")) return "Seller";
  if (roles.includes("AFFILIATE")) return "Affiliate";
  if (roles.includes("CUSTOMER")) return "Customer";
  return "Account";
}

function buildAccountActorLabel(account = null, fallbackId = null) {
  if (!account) {
    return fallbackId ? `Account #${fallbackId}` : "--";
  }

  return `${getAccountActorRole(account)}: ${getAccountDisplayName(account)}`;
}

function getAvailableInventory(variant = {}) {
  const quantity = toNumber(variant?.inventory?.quantity);
  const reserved = toNumber(variant?.inventory?.reservedQuantity);
  return Math.max(0, quantity - reserved);
}

function sumVariantInventory(variants = []) {
  return variants.reduce((total, variant) => total + getAvailableInventory(variant), 0);
}

function mapProductDto(product = {}) {
  if ("approval_status" in product && "price" in product) {
    return product;
  }

  const affiliateSetting = product.affiliateSetting || {};
  const primaryVariant = product.variants?.[0] || {};

  return {
    id: product.id,
    slug: product.slug || String(product.id || ""),
    name: product.name || "Unnamed product",
    description: product.description || "",
    category: product.category?.name || "General",
    image: product.images?.[0]?.url || "https://placehold.co/1200x800?text=Product",
    price: toNumber(product.basePrice ?? primaryVariant.price),
    stock: sumVariantInventory(product.variants),
    seller_id: product.sellerId ?? product.seller?.id ?? null,
    seller_name: product.seller?.shopName || "Unknown seller",
    approval_status: product.status || "PENDING",
    seller_hidden: Boolean(product.sellerHiddenAt),
    admin_hidden: Boolean(product.lockedAt),
    visibility_status: product.lockedAt
      ? "HIDDEN_BY_ADMIN"
      : product.sellerHiddenAt
        ? "HIDDEN_BY_SELLER"
        : "ACTIVE",
    rating: product.ratingAverage == null ? null : Number(product.ratingAverage),
    review_count: toNumber(product.reviewCount),
    sold: toNumber(product.soldCount),
    affiliate_enabled: Boolean(affiliateSetting.isEnabled),
    affiliate_setting_status: affiliateSetting.approvalStatus || "PENDING",
    commission_type: affiliateSetting.commissionType || "PERCENT",
    commission_value: toNumber(affiliateSetting.commissionValue),
    variant_id: primaryVariant.id ?? null,
    variants:
      product.variants?.map((variant) => ({
        id: variant.id,
        name: variant.variantName || variant.sku || `Variant ${variant.id}`,
        price: toNumber(variant.price),
        quantity: getAvailableInventory(variant),
      })) || [],
    gallery: product.images?.map((image) => image.url) || [],
    raw: product,
  };
}

function mapOrderDto(order = {}) {
  if ("order_status" in order && "payment_status" in order) {
    return order;
  }

  return {
    id: order.id,
    code: order.orderCode || `#${order.id ?? ""}`,
    seller_id: order.sellerId ?? order.seller?.id ?? null,
    seller_name: order.seller?.shopName || (order.sellerId ? `Shop #${order.sellerId}` : "Shop"),
    product_name: order.items?.[0]?.productNameSnapshot || `Order ${order.orderCode || order.id || ""}`,
    amount: toNumber(order.totalAmount),
    order_status: order.status || "CREATED",
    payment_status: order.payments?.[0]?.status || "PENDING",
    created_at: order.createdAt || null,
    seller_confirmed_received_money: Boolean(order.sellerConfirmedReceivedMoney),
    raw: order,
  };
}

function mapCommissionDto(commission = {}) {
  if ("pending_amount" in commission && "actual_amount" in commission) {
    return commission;
  }

  const order = commission.order || {};
  const firstItem = commission.items?.[0];
  const orderItems = order.items || [];
  const orderStatus = order.status || "CREATED";
  const sellerConfirmed = Boolean(order.sellerConfirmedReceivedMoney);
  const commissionStatus = commission.status || "PENDING";
  const totalCommission = toNumber(commission.totalCommission);
  const eligibleByOrder = orderStatus !== "CANCELLED" && orderStatus !== "REFUNDED";
  const pendingAmount =
    eligibleByOrder && !sellerConfirmed && commissionStatus === "PENDING"
      ? totalCommission
      : 0;
  const actualAmount =
    eligibleByOrder && sellerConfirmed && ["APPROVED", "WALLET_CREDITED", "PAID_OUT"].includes(commissionStatus)
      ? totalCommission
      : 0;
  const platformFeeAmount = orderItems.reduce((sum, item) => sum + toNumber(item.platformFeeAmount), 0);
  const affiliateCommissionAmount = orderItems.reduce((sum, item) => sum + toNumber(item.commissionAmount), 0) || totalCommission;

  return {
    id: commission.id,
    order_code: order.orderCode || `#${order.id ?? ""}`,
    product_name:
      firstItem?.product?.name ||
      firstItem?.orderItem?.productNameSnapshot ||
      (firstItem?.productId ? `Product #${firstItem.productId}` : "Commission item"),
    pending_amount: pendingAmount,
    actual_amount: actualAmount,
    platform_fee_amount: platformFeeAmount,
    affiliate_commission_amount: affiliateCommissionAmount,
    order_amount: toNumber(order.totalAmount),
    seller_confirmed_received_money: sellerConfirmed,
    order_status: orderStatus,
    status: commissionStatus,
    reason: translateCommissionReason(commission.rejectReason || commission.note || "", {
      orderStatus,
      sellerConfirmed,
      status: commissionStatus,
    }),
    raw: commission,
  };
}

function mapCartItemDto(item = {}) {
  const mappedProduct = mapProductDto({
    ...(item.product || {}),
    variants: item.product?.variants || (item.variant ? [item.variant] : []),
  });
  const currentAvailableStock = getAvailableInventory(item.variant || {});
  const productUnavailable =
    mappedProduct.visibility_status !== "ACTIVE" ||
    mappedProduct.approval_status !== "APPROVED";
  const isUnavailable = productUnavailable || currentAvailableStock <= 0;

  return {
    id: item.id,
    quantity: toNumber(item.quantity),
    variantId: item.variantId ?? item.variant?.id ?? mappedProduct.variant_id,
    variant: item.variant?.variantName || item.variant?.sku || `Variant ${item.variantId ?? ""}`,
    affiliateId: item.affiliateId ?? item.affiliate?.accountId ?? null,
    affiliateName: item.affiliate?.fullName || null,
    affiliateLinkId: item.affiliateLinkId ?? item.affiliateLink?.id ?? null,
    attributionSessionId: item.attributionSessionId ?? item.attributionSession?.id ?? null,
    isAffiliateAttributed: Boolean(item.affiliateId || item.affiliateLinkId || item.attributionSessionId),
    currentAvailableStock,
    hasStockConflict: isUnavailable || toNumber(item.quantity) > currentAvailableStock,
    isUnavailable,
    product: mappedProduct,
    raw: item,
  };
}

function mapCartDto(cart = {}) {
  const items = (cart.items || []).map(mapCartItemDto);

  return {
    id: cart.id,
    items,
    subtotal: items.reduce(
      (sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity,
      0,
    ),
    raw: cart,
  };
}

function aggregateDisplayCartItems(items = []) {
  const groups = new Map();

  for (const item of items) {
    const key = `${item.product.id}::${item.variantId}`;
    const existing = groups.get(key);

    const allocation = {
      id: item.id,
      quantity: item.quantity,
      affiliateId: item.affiliateId,
      affiliateName: item.affiliateName,
      affiliateLinkId: item.affiliateLinkId,
      attributionSessionId: item.attributionSessionId,
      isAffiliateAttributed: item.isAffiliateAttributed,
      currentAvailableStock: item.currentAvailableStock,
      hasStockConflict: item.hasStockConflict,
      isUnavailable: item.isUnavailable,
      unitPrice: item.product.salePrice || item.product.price,
      lineTotal: (item.product.salePrice || item.product.price) * item.quantity,
      createdAt: item.raw?.createdAt || null,
      updatedAt: item.raw?.updatedAt || null,
      label: item.isAffiliateAttributed
        ? `Thông qua affiliate${item.affiliateName ? ` ${item.affiliateName}` : item.affiliateId ? ` #${item.affiliateId}` : ""}`
        : "Đơn trực tiếp",
      raw: item,
    };

    if (!existing) {
      groups.set(key, {
        id: key,
        groupKey: key,
        displayOrder: groups.size,
        product: item.product,
        variant: item.variant,
        variantId: item.variantId,
        quantity: item.quantity,
        lineTotal: allocation.lineTotal,
        hasAffiliateAttributed: item.isAffiliateAttributed,
        currentAvailableStock: item.currentAvailableStock,
        hasStockConflict: item.hasStockConflict,
        isUnavailable: item.isUnavailable,
        itemIds: [String(item.id)],
        allocations: [allocation],
        latestActivityAt: allocation.updatedAt || allocation.createdAt || null,
      });
      continue;
    }

    existing.quantity += item.quantity;
    existing.lineTotal += allocation.lineTotal;
    existing.hasAffiliateAttributed = existing.hasAffiliateAttributed || item.isAffiliateAttributed;
    existing.currentAvailableStock = Math.min(existing.currentAvailableStock, item.currentAvailableStock);
    existing.hasStockConflict = existing.hasStockConflict || item.hasStockConflict;
    existing.isUnavailable = existing.isUnavailable || item.isUnavailable;
    existing.itemIds.push(String(item.id));
    existing.allocations.push(allocation);
    const candidateActivityAt = allocation.updatedAt || allocation.createdAt || null;
    const currentActivityAt = existing.latestActivityAt || null;
    if (!currentActivityAt || (candidateActivityAt && new Date(candidateActivityAt) > new Date(currentActivityAt))) {
      existing.latestActivityAt = candidateActivityAt;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      allocations: [...group.allocations].sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      }),
    }))
    .sort((left, right) => {
      if (left.isUnavailable !== right.isUnavailable) {
        return left.isUnavailable ? 1 : -1;
      }

      return left.displayOrder - right.displayOrder;
    });
}

function summarizeCartAttributions(group = {}) {
  const buckets = new Map();

  (group.allocations || []).forEach((allocation) => {
    const key = allocation.isAffiliateAttributed
      ? `affiliate:${allocation.affiliateId || allocation.affiliateLinkId || allocation.attributionSessionId || allocation.label}`
      : "direct";
    const existing = buckets.get(key) || {
      key,
      label: allocation.label,
      quantity: 0,
      isAffiliateAttributed: allocation.isAffiliateAttributed,
    };

    existing.quantity += toNumber(allocation.quantity);
    buckets.set(key, existing);
  });

  return Array.from(buckets.values()).sort((left, right) => {
    if (left.isAffiliateAttributed === right.isAffiliateAttributed) {
      return right.quantity - left.quantity;
    }

    return left.isAffiliateAttributed ? -1 : 1;
  });
}

function aggregateOrderItemsForDisplay(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const key = String(item.productId);
    const existing = groups.get(key);
    const lineTotal = toNumber(item.lineTotal || item.price);

    if (!existing) {
      groups.set(key, {
        groupKey: key,
        productId: item.productId,
        productName: item.productNameSnapshot || `San pham #${item.productId}`,
        variantNames: new Set(item.variantNameSnapshot ? [item.variantNameSnapshot] : []),
        quantity: toNumber(item.quantity),
        lineTotal,
        reviewOrderItemId: item.id,
        hasReviewed: Boolean(item.productReview),
        rawItems: [item],
      });
      return;
    }

    existing.quantity += toNumber(item.quantity);
    existing.lineTotal += lineTotal;
    if (item.variantNameSnapshot) {
      existing.variantNames.add(item.variantNameSnapshot);
    }
    existing.hasReviewed = existing.hasReviewed || Boolean(item.productReview);
    existing.rawItems.push(item);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    variantLabel: Array.from(group.variantNames).join(", "),
  }));
}

function mapWalletDto(wallet = {}) {
  return {
    id: wallet.id,
    owner_type: wallet.ownerType || "",
    balance: toNumber(wallet.balance),
    transactions: wallet.transactions || [],
    processing_amount: (wallet.transactions || [])
      .filter((item) => item.type === "WITHDRAWAL_HOLD")
      .reduce((sum, item) => sum + Math.abs(toNumber(item.amount)), 0),
    raw: wallet,
  };
}

function mapNotificationDto(notification = {}) {
  return {
    id: notification.id,
    title: notification.title || "Thông báo",
    description: notification.content || notification.description || "",
    type: notification.type || "GENERAL",
    unread: typeof notification.isRead === "boolean" ? !notification.isRead : !Boolean(notification.read),
    created_at: notification.createdAt || notification.created_at || null,
    raw: notification,
  };
}

function mapAffiliateLinkDto(link = {}) {
  const mappedProduct = mapProductDto(link.product || {});
  const revokedByRoles = (link.revokedByAccount?.accountRoles || []).map((item) => item.role?.code).filter(Boolean);
  const revokedByAdmin = revokedByRoles.includes("ADMIN");

  return {
    id: link.id,
    short_code: link.shortCode || "",
    created_at: link.createdAt || null,
    status: link.status || "ACTIVE",
    status_display: link.status === "REVOKED" ? (revokedByAdmin ? "REVOKED_BY_ADMIN" : "REVOKED_BY_AFFILIATE") : (link.status || "ACTIVE"),
    revoked_at: link.revokedAt || null,
    revoked_by: link.revokedBy || null,
    revoked_by_admin: revokedByAdmin,
    revoked_by_label: buildAccountActorLabel(link.revokedByAccount, link.revokedBy),
    product_name: mappedProduct.name,
    product_description: mappedProduct.description,
    product_image: mappedProduct.image,
    product_price: mappedProduct.price,
    product_category: mappedProduct.category,
    product_stock: mappedProduct.stock,
    product_visibility_status: mappedProduct.visibility_status,
    product_approval_status: mappedProduct.approval_status,
    affiliate_setting_status: mappedProduct.affiliate_setting_status,
    affiliate_enabled: mappedProduct.affiliate_enabled,
    commission_value: mappedProduct.commission_value,
    shop_name: mappedProduct.seller_name,
    click_count: (link.clicks || []).length,
    order_count: (link.orderItems || []).length,
    product_id: link.productId || mappedProduct.id || null,
    raw: link,
  };
}

function mapWithdrawalDto(withdrawal = {}) {
  return {
    id: withdrawal.id,
    amount: toNumber(withdrawal.amount),
    requested_at: withdrawal.requestedAt || withdrawal.requested_at || null,
    status: withdrawal.status || "PROCESSING",
    raw: withdrawal,
  };
}

function mapWithdrawalContextDto(context = {}) {
  const paymentAccount = context.paymentAccount || {};
  const config = context.config || {};

  return {
    owner_type: context.ownerType || "",
    available_balance: toNumber(context.availableBalance ?? context.wallet?.balance),
    min_amount: toNumber(context.minAmount ?? config.minAmount),
    max_amount: toNumber(context.maxAmount ?? config.maxAmount),
    max_requestable_amount: toNumber(context.maxRequestableAmount),
    can_request: Boolean(context.canRequest),
    missing_requirements: context.missingRequirements || [],
    payment_account: {
      id: paymentAccount.id || null,
      type: paymentAccount.type || "",
      bank_name: paymentAccount.bankName || "",
      account_name: paymentAccount.accountName || "",
      account_number: paymentAccount.accountNumber || "",
      branch: paymentAccount.branch || "",
      status: paymentAccount.status || "",
      raw: paymentAccount,
    },
    wallet: context.wallet || null,
    config,
    raw: context,
  };
}
export {
  mapAffiliateLinkDto,
  aggregateDisplayCartItems,
  aggregateOrderItemsForDisplay,
  buildAccountActorLabel,
  mapNotificationDto,
  mapCartDto,
  mapCartItemDto,
  mapCommissionDto,
  mapOrderDto,
  mapProductDto,
  summarizeCartAttributions,
  mapWalletDto,
  mapWithdrawalContextDto,
  mapWithdrawalDto,
};



