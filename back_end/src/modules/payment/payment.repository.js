const prisma = require("../../config/prisma");
const env = require("../../config/env");
const { generateTxnCode } = require("../../utils/code");

const ensureWallet = async (tx, ownerType, refs) => {
  let wallet = await tx.wallet.findFirst({ where: { ownerType, ...refs } });
  if (!wallet) {
    wallet = await tx.wallet.create({ data: { ownerType, ...refs, balance: BigInt(0), updatedAt: new Date() } });
  }
  return wallet;
};

const listAdminAccountIds = async (tx) => {
  const adminAccounts = await tx.account.findMany({
    where: {
      accountRoles: {
        some: {
          role: { code: "ADMIN" },
        },
      },
    },
    select: { id: true },
  });

  return adminAccounts.map((account) => account.id);
};

const createNotifications = async (tx, notifications) => {
  for (const notification of notifications.filter(Boolean)) {
    await tx.notification.create({ data: notification });
  }
};

const dedupeNotificationsByAccount = (notifications = []) => {
  const seen = new Set();

  return notifications.filter((notification) => {
    if (!notification?.accountId) {
      return false;
    }

    const key = `${notification.accountId}:${notification.type}:${notification.targetId || ""}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const notifyAdmins = async (tx, buildNotification) => {
  const adminAccountIds = await listAdminAccountIds(tx);
  await createNotifications(
    tx,
    adminAccountIds.map((accountId) => buildNotification(accountId)),
  );
};

const appendReason = (base, reason) => {
  if (!reason) {
    return base;
  }

  return `${base}. Reason: ${reason}`;
};

const reverseSettledOrder = async (tx, order, actorId, reason) => {
  const reversedAt = new Date();
  const platformWallet = await ensureWallet(tx, "PLATFORM", { platformKey: env.defaultPlatformKey });
  const sellerWallet = await ensureWallet(tx, "SELLER", { sellerId: order.sellerId });

  let totalPlatformFee = 0;
  let totalSellerNet = 0;

  for (const item of order.items) {
    totalPlatformFee += Number(item.platformFeeAmount);
    totalSellerNet += Number(item.sellerNetAmount);

    const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
    const nextQuantity = inventory.quantity + item.quantity;

    await tx.inventory.update({
      where: { variantId: item.variantId },
      data: { quantity: nextQuantity, updatedAt: reversedAt }
    });

    await tx.inventoryTransaction.create({
      data: {
        variantId: item.variantId,
        type: "REFUND_RESTOCK",
        quantity: item.quantity,
        stockAfter: nextQuantity,
        reservedAfter: inventory.reservedQuantity,
        referenceType: "ORDER",
        referenceId: order.id,
        idempotencyKey: `REFUND_RESTOCK_${order.id}_${item.id}`,
        note: appendReason("Restock inventory after refund on settled order", reason),
        createdAt: reversedAt
      }
    });
  }

  for (const commission of order.commissions) {
    if (Number(commission.totalCommission) > 0) {
      const affiliateWallet = await ensureWallet(tx, "AFFILIATE", { affiliateId: commission.affiliateId });

      await tx.wallet.update({
        where: { id: affiliateWallet.id },
        data: { balance: affiliateWallet.balance - commission.totalCommission, updatedAt: reversedAt }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: affiliateWallet.id,
          type: "COMMISSION_REVERSAL",
          amount: -commission.totalCommission,
          referenceType: "ORDER",
          referenceId: order.id,
          idempotencyKey: `AFF_COMMISSION_REVERSAL_${order.id}_${commission.affiliateId}`,
          description: appendReason("Affiliate commission reversed due to refund", reason),
          createdAt: reversedAt
        }
      });
    }

    await tx.affiliateCommission.update({
      where: { id: commission.id },
      data: {
        status: "REJECTED",
        fraudCheckStatus: "REFUNDED",
        rejectReason: reason || "Refunded after settlement",
        note: appendReason("Commission reversed after refund", reason),
      }
    });

    await createNotifications(tx, [{
      accountId: commission.affiliateId,
      title: "Commission reversed",
      content: `Commission for order ${order.orderCode} has been reversed because the order was refunded.`,
      type: "COMMISSION_REVERSED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: reversedAt
    }]);
  }

  await tx.wallet.update({
    where: { id: platformWallet.id },
    data: { balance: platformWallet.balance - BigInt(totalPlatformFee), updatedAt: reversedAt }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: platformWallet.id,
      type: "PLATFORM_FEE_REVERSAL",
      amount: -BigInt(totalPlatformFee),
      referenceType: "ORDER",
      referenceId: order.id,
      idempotencyKey: `PLATFORM_FEE_REVERSAL_${order.id}`,
      description: appendReason("Platform fee reversed due to refund", reason),
      createdAt: reversedAt
    }
  });

  await notifyAdmins(tx, (accountId) => ({
    accountId,
    title: "Platform fee reversed",
    content: `Platform fee from order ${order.orderCode} has been reversed because the order was refunded.`,
    type: "PLATFORM_FEE_REVERSAL",
    targetType: "ORDER",
    targetId: order.id,
    createdAt: reversedAt,
  }));

  await tx.wallet.update({
    where: { id: sellerWallet.id },
    data: { balance: sellerWallet.balance - BigInt(totalSellerNet), updatedAt: reversedAt }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: sellerWallet.id,
      type: "SELLER_NET_REVERSAL",
      amount: -BigInt(totalSellerNet),
      referenceType: "ORDER",
      referenceId: order.id,
      idempotencyKey: `SELLER_NET_REVERSAL_${order.id}`,
      description: appendReason("Seller net amount reversed due to refund", reason),
      createdAt: reversedAt
    }
  });

  await createNotifications(tx, [{
    accountId: order.seller.ownerAccountId,
    title: "Seller payout reversed",
    content: `Seller net amount from order ${order.orderCode} has been reversed because the order was refunded.`,
    type: "SELLER_NET_REVERSAL",
    targetType: "ORDER",
    targetId: order.id,
    createdAt: reversedAt,
  }]);

  await tx.activityLog.create({
    data: {
      accountId: actorId,
      action: "ORDER_REFUND_REVERSAL_APPLIED",
      targetType: "ORDER",
      targetId: order.id,
      description: appendReason(`Applied refund reversal entries for order ${order.orderCode}`, reason),
      createdAt: reversedAt
    }
  });
};

const applyRefundOrder = async (tx, { orderId, actorId, reason, refundId, requestedBy, reviewedBy }) => {
  const order = await tx.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { items: true, payments: true, seller: true, commissions: true }
  });

  const refundedAt = new Date();
  let refund;

  if (refundId) {
    refund = await tx.refund.update({
      where: { id: BigInt(refundId) },
      data: {
        reason,
        status: "APPROVED",
        reviewedBy,
        updatedAt: refundedAt
      }
    });
  } else {
    refund = await tx.refund.create({
      data: {
        orderId: order.id,
        reason,
        status: "APPROVED",
        amount: order.totalAmount,
        requestedBy: requestedBy || actorId,
        reviewedBy: reviewedBy || null,
        createdAt: refundedAt,
        updatedAt: refundedAt
      }
    });
  }

  await tx.payment.updateMany({ where: { orderId: order.id, status: { in: ["PENDING", "PAID"] } }, data: { status: "REFUNDED" } });

  if (!order.sellerConfirmedReceivedMoney) {
    for (const item of order.items) {
      const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
      const nextReserved = Math.max(0, inventory.reservedQuantity - item.quantity);

      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: { reservedQuantity: nextReserved, updatedAt: new Date() }
      });

      await tx.inventoryTransaction.create({
        data: {
          variantId: item.variantId,
          type: "RESERVE_RELEASE",
          quantity: item.quantity,
          stockAfter: inventory.quantity,
          reservedAfter: nextReserved,
          referenceType: "ORDER",
          referenceId: order.id,
          idempotencyKey: `RESERVE_RELEASE_${order.id}_${item.id}`,
          note: "Release reserved stock due to refund before settlement",
          createdAt: new Date()
        }
      });
    }

    await tx.affiliateCommission.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: {
        status: "REJECTED",
        fraudCheckStatus: "REFUNDED",
        rejectReason: reason || "Refunded before settlement",
        note: appendReason("Pending commission cancelled due to refund", reason),
      }
    });

    for (const commission of order.commissions) {
      await createNotifications(tx, [{
        accountId: commission.affiliateId,
        title: "Commission cancelled",
        content: `Pending commission for order ${order.orderCode} has been cancelled because the order was refunded.`,
        type: "COMMISSION_REVERSED",
        targetType: "ORDER",
        targetId: order.id,
        createdAt: refundedAt,
      }]);
    }
  } else {
    await reverseSettledOrder(tx, order, actorId, reason);
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      status: "REFUNDED",
      sellerConfirmedReceivedMoney: false,
      sellerConfirmedAt: null,
      sellerConfirmedBy: null,
      sellerConfirmNote: order.sellerConfirmedReceivedMoney
        ? appendReason("Settlement reversed after refund", reason)
        : order.sellerConfirmNote,
      updatedAt: refundedAt
    }
  });
  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      oldStatus: order.status,
      newStatus: "REFUNDED",
      note: reason || "Refund order",
      changedBy: actorId,
      changedAt: refundedAt
    }
  });

  await tx.activityLog.create({
    data: {
      accountId: actorId,
      action: "ORDER_REFUNDED",
      targetType: "ORDER",
      targetId: order.id,
      description: `Refund created for order ${order.orderCode}`,
      createdAt: refundedAt
    }
  });

  await createNotifications(tx, [
    {
      accountId: order.buyerId,
      title: "Order refunded",
      content: `Order ${order.orderCode} has been refunded.`,
      type: "ORDER_REFUNDED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: refundedAt,
    },
    {
      accountId: order.seller.ownerAccountId,
      title: "Order refunded",
      content: `Order ${order.orderCode} has been refunded.`,
      type: "ORDER_REFUNDED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: refundedAt,
    },
  ]);

  return { orderId: order.id, refundId: refund.id };
};

exports.markPaid = (orderId, transactionCode) => prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { seller: { select: { ownerAccountId: true, shopName: true } } }
  });
  const payment = await tx.payment.findFirst({ where: { orderId: BigInt(orderId) } });

  await tx.payment.update({
    where: { id: payment.id },
    data: { status: "PAID", transactionCode: transactionCode || generateTxnCode(), paidAt: new Date() }
  });

  await tx.order.update({ where: { id: BigInt(orderId) }, data: { status: "PAID", updatedAt: new Date() } });
  await tx.orderStatusHistory.create({
    data: { orderId: BigInt(orderId), oldStatus: order.status, newStatus: "PAID", changedAt: new Date() }
  });

  await tx.activityLog.create({
    data: {
      accountId: order.buyerId,
      action: "ORDER_PAID",
      targetType: "ORDER",
      targetId: order.id,
      description: `Buyer paid order ${order.orderCode}`,
      createdAt: new Date()
    }
  });

  await tx.notification.create({
    data: {
      accountId: order.seller.ownerAccountId,
      title: "Order paid",
      content: `Order ${order.orderCode} has been marked as paid and is waiting for seller confirmation.`,
      type: "ORDER_PAID",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: new Date()
    }
  });

  return tx.order.findUnique({ where: { id: BigInt(orderId) }, include: { items: true, payments: true } });
});

exports.confirmSellerReceivedMoney = (orderId, actorId, note) => prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { items: true, seller: true, payments: true }
  });

  const payment = order.payments?.[0] || null;
  const settlementStartedAt = new Date();
  let settlementBaseStatus = order.status;

  if (payment && payment.status !== "PAID") {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        transactionCode: payment.transactionCode || generateTxnCode(),
        paidAt: payment.paidAt || settlementStartedAt,
      }
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", updatedAt: settlementStartedAt }
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: "PAID",
        changedBy: actorId,
        note: note || "Seller confirmed receiving customer payment",
        changedAt: settlementStartedAt,
      }
    });

    settlementBaseStatus = "PAID";
  }

  const platformWallet = await ensureWallet(tx, "PLATFORM", { platformKey: env.defaultPlatformKey });
  const sellerWallet = await ensureWallet(tx, "SELLER", { sellerId: order.sellerId });

  const commissionsByAffiliate = new Map();
  let totalPlatformFee = 0;
  let totalSellerNet = 0;

  for (const item of order.items) {
    totalPlatformFee += Number(item.platformFeeAmount);
    totalSellerNet += Number(item.sellerNetAmount);

    const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
    const nextQuantity = inventory.quantity - item.quantity;
    const nextReserved = Math.max(0, inventory.reservedQuantity - item.quantity);

    await tx.inventory.update({
      where: { variantId: item.variantId },
      data: { quantity: nextQuantity, reservedQuantity: nextReserved, updatedAt: new Date() }
    });

    await tx.inventoryTransaction.create({
      data: {
        variantId: item.variantId,
        type: "FINALIZE_SALE",
        quantity: item.quantity,
        stockAfter: nextQuantity,
        reservedAfter: nextReserved,
        referenceType: "ORDER",
        referenceId: order.id,
        idempotencyKey: `FINALIZE_${order.id}_${item.id}`,
        note: "Finalize stock after seller confirmed receiving money",
        createdAt: new Date()
      }
    });

    if (item.affiliateId && Number(item.commissionAmount) > 0) {
      const current = commissionsByAffiliate.get(item.affiliateId) || { total: 0, items: [] };
      current.total += Number(item.commissionAmount);
      current.items.push(item);
      commissionsByAffiliate.set(item.affiliateId, current);
    }
  }

  for (const [affiliateId, aggregate] of commissionsByAffiliate.entries()) {
    const affiliateWallet = await ensureWallet(tx, "AFFILIATE", { affiliateId });
    const commission = await tx.affiliateCommission.upsert({
      where: { orderId_affiliateId: { orderId: order.id, affiliateId } },
      update: {
        totalCommission: BigInt(aggregate.total),
        status: "WALLET_CREDITED",
        fraudCheckStatus: "PENDING",
        walletCreditedAt: new Date()
      },
      create: {
        orderId: order.id,
        affiliateId,
        sellerId: order.sellerId,
        totalCommission: BigInt(aggregate.total),
        status: "WALLET_CREDITED",
        fraudCheckStatus: "PENDING",
        walletCreditedAt: new Date(),
        note: "Seller confirmed receiving money",
        createdAt: new Date()
      }
    });

    await tx.wallet.update({
      where: { id: affiliateWallet.id },
      data: { balance: affiliateWallet.balance + BigInt(aggregate.total), updatedAt: new Date() }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: affiliateWallet.id,
        type: "COMMISSION_CREDIT",
        amount: BigInt(aggregate.total),
        referenceType: "ORDER",
        referenceId: order.id,
        idempotencyKey: `AFF_COMMISSION_${order.id}_${affiliateId}`,
        description: "Affiliate commission credited after seller confirmation",
        createdAt: new Date()
      }
    });

    await tx.notification.create({
      data: {
        accountId: affiliateId,
        title: "Commission credited",
        content: `Commission for order ${order.orderCode} has been credited to your wallet.`,
        type: "COMMISSION_CREDIT",
        targetType: "ORDER",
        targetId: order.id,
        createdAt: new Date()
      }
    });

    for (const orderItem of aggregate.items) {
      await tx.affiliateCommissionItem.upsert({
        where: { orderItemId: orderItem.id },
        update: { amount: orderItem.commissionAmount },
        create: {
          commissionId: commission.id,
          orderItemId: orderItem.id,
          productId: orderItem.productId,
          amount: orderItem.commissionAmount
        }
      });
    }
  }

  await tx.wallet.update({
    where: { id: platformWallet.id },
    data: { balance: platformWallet.balance + BigInt(totalPlatformFee), updatedAt: new Date() }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: platformWallet.id,
      type: "PLATFORM_FEE_CREDIT",
      amount: BigInt(totalPlatformFee),
      referenceType: "ORDER",
      referenceId: order.id,
      idempotencyKey: `PLATFORM_FEE_${order.id}`,
      description: "Platform fee credited from order",
      createdAt: new Date()
    }
  });

  await notifyAdmins(tx, (accountId) => ({
    accountId,
    title: "Platform fee credited",
    content: `Platform fee from order ${order.orderCode} has been credited to the platform wallet.`,
    type: "PLATFORM_FEE_CREDIT",
    targetType: "ORDER",
    targetId: order.id,
    createdAt: new Date(),
  }));

  await tx.wallet.update({
    where: { id: sellerWallet.id },
    data: { balance: sellerWallet.balance + BigInt(totalSellerNet), updatedAt: new Date() }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: sellerWallet.id,
      type: "SELLER_NET_CREDIT",
      amount: BigInt(totalSellerNet),
      referenceType: "ORDER",
      referenceId: order.id,
      idempotencyKey: `SELLER_NET_${order.id}`,
      description: "Seller net amount credited from order",
      createdAt: new Date()
    }
  });

  await createNotifications(tx, [{
    accountId: order.seller.ownerAccountId,
    title: "Seller wallet credited",
    content: `Seller net amount from order ${order.orderCode} has been credited to your wallet.`,
    type: "SELLER_NET_CREDIT",
    targetType: "ORDER",
    targetId: order.id,
    createdAt: new Date(),
  }]);

  await tx.order.update({
    where: { id: order.id },
    data: {
      sellerConfirmedReceivedMoney: true,
      sellerConfirmedAt: new Date(),
      sellerConfirmedBy: actorId,
      sellerConfirmNote: note,
      status: "COMPLETED",
      updatedAt: new Date()
    }
  });

  await tx.orderStatusHistory.create({
    data: { orderId: order.id, oldStatus: settlementBaseStatus, newStatus: "COMPLETED", changedBy: actorId, note, changedAt: new Date() }
  });

  await tx.activityLog.create({
    data: {
      accountId: actorId,
      action: "SELLER_CONFIRMED_ORDER_PAYMENT",
      targetType: "ORDER",
      targetId: order.id,
      description: `Seller confirmed received money for order ${order.orderCode}`,
      createdAt: new Date()
    }
  });

  await createNotifications(tx, [{
    accountId: order.buyerId,
    title: "Order completed",
    content: `Seller confirmed payment for order ${order.orderCode}. The order is now completed.`,
    type: "ORDER_COMPLETED",
    targetType: "ORDER",
    targetId: order.id,
    createdAt: new Date()
  }]);

  return tx.order.findUnique({ where: { id: order.id }, include: { items: true, payments: true, commissions: true } });
});

exports.refundOrder = ({ orderId, actorId, reason, refundId, requestedBy, reviewedBy }) =>
  prisma.$transaction(async (tx) =>
    applyRefundOrder(tx, { orderId, actorId, reason, refundId, requestedBy, reviewedBy }));

exports.createRefundRequest = ({ orderId, actorId, reason }) => prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: BigInt(orderId) },
    include: {
      seller: { select: { ownerAccountId: true } },
      refunds: { where: { status: "PENDING" } }
    }
  });

  if (order.refunds.length) {
    throw new Error("A refund request is already pending review for this order");
  }

  const now = new Date();
  const refund = await tx.refund.create({
    data: {
      orderId: order.id,
      reason,
      status: "PENDING",
      amount: order.totalAmount,
      requestedBy: actorId,
      createdAt: now,
      updatedAt: now
    }
  });

  await tx.activityLog.create({
    data: {
      accountId: actorId,
      action: "ORDER_REFUND_REQUESTED",
      targetType: "ORDER",
      targetId: order.id,
      description: `Refund request submitted for order ${order.orderCode}`,
      createdAt: now
    }
  });

  await notifyAdmins(tx, (accountId) => ({
    accountId,
    title: "Refund request waiting for review",
    content: `Order ${order.orderCode} has a VNPAY cancel/refund request waiting for admin review.`,
    type: "ORDER_REFUND_REQUESTED",
    targetType: "ORDER",
    targetId: order.id,
    createdAt: now,
  }));

  await createNotifications(tx, dedupeNotificationsByAccount([
    {
      accountId: order.buyerId,
      title: "Cancellation request submitted",
      content: `Your request for order ${order.orderCode} has been sent to admin for review.`,
      type: "ORDER_REFUND_REQUESTED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: now,
    },
    {
      accountId: order.seller.ownerAccountId,
      title: "Refund request submitted",
      content: `Order ${order.orderCode} has a refund request waiting for admin review.`,
      type: "ORDER_REFUND_REQUESTED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: now,
    },
  ]));

  return refund;
});

exports.reviewRefundRequest = ({ refundId, adminId, status, rejectReason }) => prisma.$transaction(async (tx) => {
  const refund = await tx.refund.findUnique({
    where: { id: BigInt(refundId) },
    include: {
      order: {
        include: {
          seller: { select: { ownerAccountId: true } }
        }
      }
    }
  });

  if (!refund) {
    throw new Error("Refund request not found");
  }

  if (refund.status !== "PENDING") {
    throw new Error("Refund request has already been reviewed");
  }

  const reviewedAt = new Date();

    if (status === "REJECTED") {
      const updated = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: "REJECTED",
        reviewedBy: adminId,
        reason: rejectReason || refund.reason,
        updatedAt: reviewedAt
      }
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ORDER_REFUND_REJECTED",
        targetType: "ORDER",
        targetId: refund.orderId,
        description: `Refund request rejected for order ${refund.order.orderCode}`,
        createdAt: reviewedAt
      }
    });

      await createNotifications(tx, dedupeNotificationsByAccount([
        {
          accountId: refund.requestedBy,
          title: "Refund request rejected",
          content: rejectReason || `Admin rejected the refund request for order ${refund.order.orderCode}.`,
          type: "ORDER_REFUND_REJECTED",
          targetType: "ORDER",
          targetId: refund.orderId,
          createdAt: reviewedAt,
        },
        {
          accountId: refund.order.buyerId,
          title: "Refund request rejected",
          content: rejectReason || `Admin rejected the refund request for order ${refund.order.orderCode}.`,
          type: "ORDER_REFUND_REJECTED",
          targetType: "ORDER",
          targetId: refund.orderId,
          createdAt: reviewedAt,
        },
        {
          accountId: refund.order.seller.ownerAccountId,
          title: "Refund request rejected",
          content: rejectReason || `Admin rejected the refund request for order ${refund.order.orderCode}.`,
          type: "ORDER_REFUND_REJECTED",
          targetType: "ORDER",
          targetId: refund.orderId,
          createdAt: reviewedAt,
        },
      ]));

    return updated;
  }

  return applyRefundOrder(tx, {
    orderId: refund.orderId,
    actorId: adminId,
    reason: refund.reason,
    refundId: refund.id,
    requestedBy: refund.requestedBy,
    reviewedBy: adminId,
  });
});

exports.cancelPendingPaymentOrder = (orderId, actorId, reason) => prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: BigInt(orderId) },
    include: {
      items: true,
      payments: true,
      seller: { select: { ownerAccountId: true } },
      commissions: true,
    },
  });

  const cancelledAt = new Date();

  for (const item of order.items) {
    const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
    const nextReserved = Math.max(0, inventory.reservedQuantity - item.quantity);

    await tx.inventory.update({
      where: { variantId: item.variantId },
      data: { reservedQuantity: nextReserved, updatedAt: cancelledAt }
    });

    await tx.inventoryTransaction.create({
      data: {
        variantId: item.variantId,
        type: "RESERVE_RELEASE",
        quantity: item.quantity,
        stockAfter: inventory.quantity,
        reservedAfter: nextReserved,
        referenceType: "ORDER",
        referenceId: order.id,
        idempotencyKey: `ORDER_CANCEL_RELEASE_${order.id}_${item.id}`,
        note: appendReason("Release reserved stock due to customer order cancellation", reason),
        createdAt: cancelledAt
      }
    });
  }

  await tx.affiliateCommission.updateMany({
    where: { orderId: order.id, status: "PENDING" },
    data: {
      status: "REJECTED",
      fraudCheckStatus: "CANCELLED",
      rejectReason: reason || "Order cancelled before payment",
      note: appendReason("Pending commission cancelled because customer cancelled the order", reason),
    }
  });

  for (const commission of order.commissions) {
    await createNotifications(tx, [{
      accountId: commission.affiliateId,
      title: "Commission cancelled",
      content: `Pending commission for order ${order.orderCode} has been cancelled because the customer cancelled the order.`,
      type: "COMMISSION_REVERSED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: cancelledAt,
    }]);
  }

  await tx.payment.updateMany({
    where: { orderId: order.id, status: "PENDING" },
    data: { status: "FAILED" }
  });

  await tx.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      updatedAt: cancelledAt
    }
  });

  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      oldStatus: order.status,
      newStatus: "CANCELLED",
      note: reason || "Customer cancelled unpaid order",
      changedBy: actorId,
      changedAt: cancelledAt
    }
  });

  await tx.activityLog.create({
    data: {
      accountId: actorId,
      action: "ORDER_CANCELLED",
      targetType: "ORDER",
      targetId: order.id,
      description: appendReason(`Customer cancelled unpaid order ${order.orderCode}`, reason),
      createdAt: cancelledAt
    }
  });

  await createNotifications(tx, [
    {
      accountId: order.buyerId,
      title: "Order cancelled",
      content: `Order ${order.orderCode} has been cancelled successfully.`,
      type: "ORDER_CANCELLED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: cancelledAt,
    },
    {
      accountId: order.seller.ownerAccountId,
      title: "Order cancelled",
      content: `Customer cancelled order ${order.orderCode} before payment was completed.`,
      type: "ORDER_CANCELLED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: cancelledAt,
    },
  ]);

  return tx.order.findUnique({ where: { id: order.id }, include: { items: true, payments: true } });
});

exports.changePendingPaymentMethod = (orderId, actorId, paymentMethod) => prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: BigInt(orderId) },
    include: {
      payments: true,
    },
  });

  const payment = order?.payments?.[0] || null;
  const changedAt = new Date();

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      method: paymentMethod,
    },
  });

  await tx.activityLog.create({
    data: {
      accountId: actorId,
      action: "ORDER_PAYMENT_METHOD_CHANGED",
      targetType: "ORDER",
      targetId: order.id,
      description: `Customer changed payment method for order ${order.orderCode} from ${payment.method} to ${paymentMethod}`,
      createdAt: changedAt,
    },
  });

  await tx.notification.create({
    data: {
      accountId: order.buyerId,
      title: "Payment method updated",
      content: `Payment method for order ${order.orderCode} has been changed to ${paymentMethod}.`,
      type: "ORDER_PAYMENT_METHOD_CHANGED",
      targetType: "ORDER",
      targetId: order.id,
      createdAt: changedAt,
    },
  });

  return tx.order.findUnique({
    where: { id: order.id },
    include: { items: true, payments: true },
  });
});
