const prisma = require("../../config/prisma");
const { generateTxnCode } = require("../../utils/code");

exports.findCurrentConfig = (targetType) => prisma.withdrawalConfig.findFirst({
  where: {
    targetType,
    effectiveFrom: { lte: new Date() },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
  },
  orderBy: { effectiveFrom: "desc" },
});

exports.sumOpenPendingAmount = async (walletId) => {
  const result = await prisma.withdrawal.aggregate({
    _sum: { amount: true },
    where: { walletId, status: "PENDING" },
  });

  return result._sum.amount || BigInt(0);
};

exports.createAffiliateWithdrawal = (affiliateId, amount, config) => prisma.$transaction(async (tx) => {
  const wallet = await tx.wallet.findFirst({ where: { ownerType: "AFFILIATE", affiliateId } });
  const paymentAccount = await tx.affiliatePaymentAccount.findFirst({ where: { affiliateId, status: "ACTIVE" } });

  const withdrawal = await tx.withdrawal.create({
    data: {
      walletId: wallet.id,
      ownerType: "AFFILIATE",
      amount: BigInt(amount),
      affiliatePaymentAccountId: paymentAccount?.id,
      appliedMin: config.minAmount,
      appliedMax: config.maxAmount,
      requestedAt: new Date(),
    },
  });

  await tx.activityLog.create({
    data: {
      accountId: affiliateId,
      action: "WITHDRAWAL_REQUESTED",
      targetType: "WITHDRAWAL",
      targetId: withdrawal.id,
      description: `Affiliate withdrawal requested: ${amount}`,
      createdAt: new Date(),
    },
  });

  await tx.notification.create({
    data: {
      accountId: affiliateId,
      title: "Withdrawal requested",
      content: `Your withdrawal request for ${amount} has been created and is waiting for admin approval.`,
      type: "WITHDRAWAL_REQUESTED",
      targetType: "WITHDRAWAL",
      targetId: withdrawal.id,
      createdAt: new Date(),
    },
  });

  return withdrawal;
});

exports.createSellerWithdrawal = (sellerId, amount, config) => prisma.$transaction(async (tx) => {
  const wallet = await tx.wallet.findFirst({ where: { ownerType: "SELLER", sellerId } });
  const paymentAccount = await tx.sellerPaymentAccount.findFirst({ where: { sellerId, status: "ACTIVE" } });
  const seller = await tx.seller.findUnique({ where: { id: sellerId } });

  const withdrawal = await tx.withdrawal.create({
    data: {
      walletId: wallet.id,
      ownerType: "SELLER",
      amount: BigInt(amount),
      sellerPaymentAccountId: paymentAccount?.id,
      appliedMin: config.minAmount,
      appliedMax: config.maxAmount,
      requestedAt: new Date(),
    },
  });

  await tx.activityLog.create({
    data: {
      accountId: seller.ownerAccountId,
      action: "WITHDRAWAL_REQUESTED",
      targetType: "WITHDRAWAL",
      targetId: withdrawal.id,
      description: `Seller withdrawal requested: ${amount}`,
      createdAt: new Date(),
    },
  });

  await tx.notification.create({
    data: {
      accountId: seller.ownerAccountId,
      title: "Withdrawal requested",
      content: `Your withdrawal request for ${amount} has been created and is waiting for admin approval.`,
      type: "WITHDRAWAL_REQUESTED",
      targetType: "WITHDRAWAL",
      targetId: withdrawal.id,
      createdAt: new Date(),
    },
  });

  return withdrawal;
});

exports.reviewWithdrawal = (withdrawalId, adminId, payload) => prisma.$transaction(async (tx) => {
  const transition = await tx.withdrawal.updateMany({
    where: { id: BigInt(withdrawalId), status: "PENDING" },
    data: {
      status: payload.status,
      note: payload.status === "REJECTED" ? payload.rejectReason || null : undefined,
    },
  });

  if (transition.count === 0) {
    throw new Error("Withdrawal is no longer pending");
  }

  const withdrawal = await tx.withdrawal.findUnique({
    where: { id: BigInt(withdrawalId) },
    include: {
      wallet: { include: { affiliate: true, seller: true } },
      affiliatePaymentAccount: true,
      sellerPaymentAccount: true,
      payoutBatch: true,
    },
  });

  const recipientAccountId = withdrawal.wallet.affiliateId || withdrawal.wallet.seller?.ownerAccountId;

  if (payload.status === "APPROVED") {
    const nextBalance = withdrawal.wallet.balance - withdrawal.amount;

    await tx.wallet.update({
      where: { id: withdrawal.walletId },
      data: { balance: nextBalance, updatedAt: new Date() },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: withdrawal.walletId,
        type: "WITHDRAWAL_HOLD",
        amount: -withdrawal.amount,
        referenceType: "WITHDRAWAL",
        referenceId: withdrawal.id,
        idempotencyKey: generateTxnCode(),
        description: `Withdrawal ${withdrawal.id} approved by admin`,
        createdAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "WITHDRAWAL_APPROVED",
        targetType: "WITHDRAWAL",
        targetId: withdrawal.id,
        description: `Withdrawal ${withdrawal.id} approved and wallet deducted`,
        createdAt: new Date(),
      },
    });

    if (recipientAccountId) {
      await tx.notification.create({
        data: {
          accountId: recipientAccountId,
          title: "Withdrawal approved",
          content: `Your withdrawal ${withdrawal.id} has been approved and the amount has been deducted from your wallet.`,
          type: "WITHDRAWAL_APPROVED",
          targetType: "WITHDRAWAL",
          targetId: withdrawal.id,
          createdAt: new Date(),
        },
      });
    }
  } else {
    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "WITHDRAWAL_REJECTED",
        targetType: "WITHDRAWAL",
        targetId: withdrawal.id,
        description: payload.rejectReason || `Withdrawal ${withdrawal.id} rejected`,
        createdAt: new Date(),
      },
    });

    if (recipientAccountId) {
      await tx.notification.create({
        data: {
          accountId: recipientAccountId,
          title: "Withdrawal rejected",
          content: payload.rejectReason || `Your withdrawal ${withdrawal.id} has been rejected by admin.`,
          type: "WITHDRAWAL_REJECTED",
          targetType: "WITHDRAWAL",
          targetId: withdrawal.id,
          createdAt: new Date(),
        },
      });
    }
  }

  return tx.withdrawal.findUnique({
    where: { id: BigInt(withdrawalId) },
    include: { wallet: true, affiliatePaymentAccount: true, sellerPaymentAccount: true, payoutBatch: true },
  });
});

exports.listWithdrawals = (filters = {}) => prisma.withdrawal.findMany({
  where: filters,
  include: { wallet: true, affiliatePaymentAccount: true, sellerPaymentAccount: true, payoutBatch: true },
  orderBy: { requestedAt: "desc" },
});
exports.getAdminWithdrawalSummary = async () => {
  const approvedStatuses = ["APPROVED", "PROCESSING", "PAID"];

  const [approvedAggregate, affiliateApprovedCount, sellerApprovedCount] = await Promise.all([
    prisma.withdrawal.aggregate({
      _sum: { amount: true },
      where: { status: { in: approvedStatuses } },
    }),
    prisma.withdrawal.count({
      where: { ownerType: "AFFILIATE", status: { in: approvedStatuses } },
    }),
    prisma.withdrawal.count({
      where: { ownerType: "SELLER", status: { in: approvedStatuses } },
    }),
  ]);

  return {
    approvedAmount: approvedAggregate._sum.amount || BigInt(0),
    approvedCount: affiliateApprovedCount + sellerApprovedCount,
    affiliateApprovedCount,
    sellerApprovedCount,
  };
};