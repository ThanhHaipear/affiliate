const prisma = require("../../config/prisma");
const { summarizeOrderFinancialStats } = require("../../utils/order-financial-stats");
const paymentRepository = require("../payment/payment.repository");

function buildAccountWhere({ q, role, status }) {
  const where = {};
  const and = [];

  if (q) {
    and.push({
      OR: [
        { email: { contains: q } },
        { phone: { contains: q } },
        { customerProfile: { is: { fullName: { contains: q } } } },
        { adminProfile: { is: { fullName: { contains: q } } } },
        { affiliate: { is: { fullName: { contains: q } } } },
        { sellers: { some: { shopName: { contains: q } } } },
      ],
    });
  }

  if (role) {
    and.push({
      accountRoles: {
        some: {
          role: { code: role },
        },
      },
    });
  }

  if (status) {
    and.push({ status });
  }

  if (and.length) {
    where.AND = and;
  }

  return where;
}

exports.findPendingSellers = () => prisma.seller.findMany({
  where: { approvalStatus: "PENDING" },
  include: { ownerAccount: true, paymentAccounts: true, kyc: true },
  orderBy: { createdAt: "desc" },
});

exports.findPendingAffiliates = () => prisma.affiliate.findMany({
  where: { kycStatus: "PENDING" },
  include: { account: true, paymentAccounts: true, kyc: true },
  orderBy: { createdAt: "desc" },
});

exports.findPendingCatalogProducts = () => prisma.product.findMany({
  where: { status: "PENDING", seller: { approvalStatus: "APPROVED" } },
  include: {
    seller: true,
    category: true,
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
  },
  orderBy: { createdAt: "desc" },
});

exports.findPendingProducts = () => prisma.productAffiliateSetting.findMany({
  where: { approvalStatus: "PENDING", seller: { approvalStatus: "APPROVED" } },
  include: {
    product: {
      include: {
        category: true,
        images: true,
        variants: { include: { inventory: true } },
        affiliateSetting: true,
      },
    },
    seller: true,
  },
  orderBy: { createdAt: "desc" },
});

exports.listAccounts = ({ q, role, status }) =>
  prisma.account.findMany({
    where: buildAccountWhere({ q, role, status }),
    include: {
      accountRoles: { include: { role: true } },
      customerProfile: true,
      adminProfile: true,
      affiliate: true,
      sellers: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

exports.lockAccount = ({ accountId, adminId, reason }) =>
  prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: {
        affiliate: true,
        sellers: true,
      },
    });

    const updated = await tx.account.update({
      where: { id: accountId },
      data: {
        status: "LOCKED",
        lockReason: reason || "Locked by admin",
        lockedAt: new Date(),
        lockedBy: adminId,
        updatedAt: new Date(),
      },
      include: {
        accountRoles: { include: { role: true } },
        customerProfile: true,
        adminProfile: true,
        affiliate: true,
        sellers: true,
      },
    });

    if (account?.affiliate) {
      await tx.affiliate.update({
        where: { accountId },
        data: {
          lockReason: reason || "Locked by admin",
          lockedAt: new Date(),
          lockedBy: adminId,
          updatedAt: new Date(),
        },
      });
    }

    if (account?.sellers?.length) {
      await tx.seller.updateMany({
        where: { ownerAccountId: accountId },
        data: {
          lockReason: reason || "Locked by admin",
          lockedAt: new Date(),
          lockedBy: adminId,
          updatedAt: new Date(),
        },
      });
    }

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_LOCK_ACCOUNT",
        targetType: "ACCOUNT",
        targetId: BigInt(accountId),
        description: `Account ${accountId} locked by admin`,
        createdAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        accountId,
        title: "Account locked",
        content: reason || "Your account has been locked by admin.",
        type: "ACCOUNT_LOCKED",
        targetType: "ACCOUNT",
        targetId: BigInt(accountId),
        createdAt: new Date(),
      },
    });

    return updated;
  });

exports.unlockAccount = ({ accountId, adminId }) =>
  prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: {
        affiliate: true,
        sellers: true,
      },
    });

    const updated = await tx.account.update({
      where: { id: accountId },
      data: {
        status: "ACTIVE",
        lockReason: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      },
      include: {
        accountRoles: { include: { role: true } },
        customerProfile: true,
        adminProfile: true,
        affiliate: true,
        sellers: true,
      },
    });

    if (account?.affiliate) {
      await tx.affiliate.update({
        where: { accountId },
        data: {
          lockReason: null,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date(),
        },
      });
    }

    if (account?.sellers?.length) {
      await tx.seller.updateMany({
        where: { ownerAccountId: accountId },
        data: {
          lockReason: null,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date(),
        },
      });
    }

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_UNLOCK_ACCOUNT",
        targetType: "ACCOUNT",
        targetId: BigInt(accountId),
        description: `Account ${accountId} unlocked by admin`,
        createdAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        accountId,
        title: "Account unlocked",
        content: "Your account has been unlocked by admin.",
        type: "ACCOUNT_UNLOCKED",
        targetType: "ACCOUNT",
        targetId: BigInt(accountId),
        createdAt: new Date(),
      },
    });

    return updated;
  });

exports.listOrders = ({ status, sellerConfirmed }) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (sellerConfirmed !== undefined) {
    where.sellerConfirmedReceivedMoney = sellerConfirmed;
  }

  return prisma.order.findMany({
    where,
    include: {
      buyer: true,
      seller: true,
      items: {
        include: {
          product: true,
          variant: true,
          affiliate: true,
        },
      },
      payments: true,
      commissions: true,
      refunds: {
        include: {
          requester: true,
          reviewer: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

exports.getFinancialStats = async ({ status, sellerConfirmed }) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (sellerConfirmed !== undefined) {
    where.sellerConfirmedReceivedMoney = sellerConfirmed;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        select: {
          affiliateId: true,
          commissionAmount: true,
          platformFeeAmount: true,
          sellerNetAmount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return summarizeOrderFinancialStats(orders);
};

exports.listFraudAlerts = ({ status, severity }) => {
  const where = {};

  if (status) {
    where.processStatus = status;
  }

  if (severity) {
    where.severity = severity;
  }

  return prisma.fraudAlert.findMany({
    where,
    include: {
      processedByAccount: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

exports.getPlatformSettings = async () => {
  const [activePlatformFee, latestPlatformFee, withdrawalConfigs, openFraudAlerts] = await Promise.all([
    prisma.platformFeeConfig.findFirst({
      where: {
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.platformFeeConfig.findFirst({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.withdrawalConfig.findMany({
      orderBy: { effectiveFrom: "desc" },
      take: 5,
    }),
    prisma.fraudAlert.count({ where: { processStatus: "OPEN" } }),
  ]);

  return {
    activePlatformFee,
    latestPlatformFee,
    withdrawalConfigs,
    openFraudAlerts,
  };
};

exports.updatePlatformFee = ({ feeType, feeValue, adminId }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.platformFeeConfig.updateMany({
      where: {
        effectiveTo: null,
        effectiveFrom: { lte: now },
      },
      data: { effectiveTo: now },
    });

    const created = await tx.platformFeeConfig.create({
      data: {
        feeType,
        feeValue: BigInt(Math.round(Number(feeValue))),
        effectiveFrom: now,
        createdAt: now,
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_UPDATE_PLATFORM_FEE",
        targetType: "PLATFORM_FEE_CONFIG",
        targetId: created.id,
        description: `Platform fee updated to ${feeType}:${feeValue}`,
        createdAt: now,
      },
    });

    return created;
  });

exports.updateWithdrawalConfig = ({ minAmount, maxAmount, adminId }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const targetTypes = ["AFFILIATE", "SELLER"];

    await tx.withdrawalConfig.updateMany({
      where: {
        targetType: { in: targetTypes },
        effectiveTo: null,
        effectiveFrom: { lte: now },
      },
      data: { effectiveTo: now, updatedAt: now },
    });

    await tx.withdrawalConfig.createMany({
      data: targetTypes.map((targetType) => ({
        targetType,
        minAmount: BigInt(Math.round(Number(minAmount))),
        maxAmount: BigInt(Math.round(Number(maxAmount))),
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_UPDATE_WITHDRAWAL_CONFIG",
        targetType: "WITHDRAWAL_CONFIG",
        description: `Withdrawal config updated to min:${minAmount}, max:${maxAmount} for all system wallets`,
        createdAt: now,
      },
    });

    return tx.withdrawalConfig.findMany({
      where: {
        targetType: { in: targetTypes },
        effectiveFrom: now,
      },
      orderBy: { targetType: "asc" },
    });
  });

exports.reviewSeller = ({ sellerId, adminId, status, rejectReason }) =>
  prisma.$transaction(async (tx) => {
    const seller = await tx.seller.findUnique({ where: { id: sellerId }, include: { paymentAccounts: true } });
    const updateData = {
      approvalStatus: status,
      approvedBy: adminId,
      approvedAt: new Date(),
      rejectReason: status === "REJECTED" ? rejectReason : null,
      updatedAt: new Date(),
    };

    if (status === "APPROVED" && seller.paymentAccounts.length === 0) {
      throw new Error("Seller must have at least one payment account before approval");
    }

    const updatedSeller = await tx.seller.update({ where: { id: sellerId }, data: updateData });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: status === "APPROVED" ? "ADMIN_REVIEW_SELLER_APPROVED" : "ADMIN_REVIEW_SELLER_REJECTED",
        targetType: "SELLER",
        targetId: BigInt(sellerId),
        description: `Seller ${sellerId} review result: ${status}`,
        createdAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        accountId: seller.ownerAccountId,
        title: status === "APPROVED" ? "Seller account approved" : "Seller account rejected",
        content:
          status === "APPROVED"
            ? "Your seller profile has been approved by admin."
            : rejectReason || "Your seller profile has been rejected by admin.",
        type: "SELLER_REVIEW",
        targetType: "SELLER",
        targetId: BigInt(sellerId),
        createdAt: new Date(),
      },
    });

    return updatedSeller;
  });

exports.reviewAffiliate = ({ affiliateId, adminId, status, rejectReason }) =>
  prisma.$transaction(async (tx) => {
    const affiliate = await tx.affiliate.findUnique({
      where: { accountId: affiliateId },
      include: { paymentAccounts: true, kyc: true },
    });

    if (status === "APPROVED" && affiliate.paymentAccounts.length === 0) {
      throw new Error("Affiliate must have at least one payment account before approval");
    }

    if (affiliate.kyc) {
      await tx.affiliateKyc.updateMany({
        where: { affiliateId },
        data: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectReason: status === "REJECTED" ? rejectReason : null,
          updatedAt: new Date(),
        },
      });
    }

    const updatedAffiliate = await tx.affiliate.update({
      where: { accountId: affiliateId },
      data: { kycStatus: status, updatedAt: new Date() },
    });

    const affiliateRole = await tx.role.findUnique({ where: { code: "AFFILIATE" } });
    const existingAffiliateRole = await tx.accountRole.findFirst({
      where: {
        accountId: affiliateId,
        roleId: affiliateRole.id,
      },
    });

    if (status === "APPROVED" && !existingAffiliateRole) {
      await tx.accountRole.create({
        data: {
          accountId: affiliateId,
          roleId: affiliateRole.id,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: status === "APPROVED" ? "ADMIN_REVIEW_AFFILIATE_APPROVED" : "ADMIN_REVIEW_AFFILIATE_REJECTED",
        targetType: "AFFILIATE",
        targetId: BigInt(affiliateId),
        description: `Affiliate ${affiliateId} review result: ${status}`,
        createdAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        accountId: affiliateId,
        title: status === "APPROVED" ? "Affiliate profile approved" : "Affiliate profile rejected",
        content:
          status === "APPROVED"
            ? "Your affiliate profile has been approved by admin."
            : rejectReason || "Your affiliate profile has been rejected by admin.",
        type: "AFFILIATE_REVIEW",
        targetType: "AFFILIATE",
        targetId: BigInt(affiliateId),
        createdAt: new Date(),
      },
    });

    return updatedAffiliate;
  });

exports.reviewProduct = ({ productId, adminId, status, rejectReason }) =>
  prisma.$transaction(async (tx) => {
    const existingProduct = await tx.product.findUnique({
      where: { id: Number(productId) },
      include: {
        seller: { select: { ownerAccountId: true, approvalStatus: true } },
      },
    });

    if (!existingProduct) {
      throw new Error("Product not found");
    }

    if (status === "APPROVED" && existingProduct.seller?.approvalStatus !== "APPROVED") {
      throw new Error("Seller shop is not approved, product cannot be approved");
    }

    const product = await tx.product.update({
      where: { id: Number(productId) },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: status === "REJECTED" ? rejectReason : null,
        updatedAt: new Date(),
      },
      include: {
        seller: { select: { ownerAccountId: true, approvalStatus: true } },
      },
    });

    await tx.productAffiliateSetting.updateMany({
      where: {
        productId: Number(productId),
        approvalStatus: "PENDING",
      },
      data: {
        approvalStatus: status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: status === "REJECTED" ? rejectReason : null,
        updatedAt: new Date(),
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: status === "APPROVED" ? "ADMIN_REVIEW_PRODUCT_APPROVED" : "ADMIN_REVIEW_PRODUCT_REJECTED",
        targetType: "PRODUCT",
        targetId: BigInt(productId),
        description: `Product ${productId} review result: ${status}`,
        createdAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        accountId: product.seller.ownerAccountId,
        title: status === "APPROVED" ? "Product approved" : "Product rejected",
        content:
          status === "APPROVED"
            ? `Your product #${productId} has been approved by admin.`
            : rejectReason || `Your product #${productId} has been rejected by admin.`,
        type: "PRODUCT_REVIEW",
        targetType: "PRODUCT",
        targetId: BigInt(productId),
        createdAt: new Date(),
      },
    });

    return product;
  });

exports.reviewProductAffiliate = ({ settingId, adminId, status, rejectReason }) =>
  prisma.$transaction(async (tx) => {
    const setting = await tx.productAffiliateSetting.update({
      where: { id: BigInt(settingId) },
      data: {
        approvalStatus: status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: status === "REJECTED" ? rejectReason : null,
        updatedAt: new Date(),
      },
      include: {
        product: { select: { sellerId: true, name: true } },
        seller: { select: { ownerAccountId: true } },
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action:
          status === "APPROVED"
            ? "ADMIN_REVIEW_PRODUCT_AFFILIATE_APPROVED"
            : "ADMIN_REVIEW_PRODUCT_AFFILIATE_REJECTED",
        targetType: "PRODUCT_AFFILIATE_SETTING",
        targetId: BigInt(settingId),
        description: `Product affiliate setting ${settingId} review result: ${status}`,
        createdAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        accountId: setting.seller.ownerAccountId,
        title: status === "APPROVED" ? "Affiliate setting approved" : "Affiliate setting rejected",
        content:
          status === "APPROVED"
            ? `Affiliate setting for product ${setting.product.name} has been approved.`
            : rejectReason || `Affiliate setting for product ${setting.product.name} has been rejected.`,
        type: "PRODUCT_AFFILIATE_REVIEW",
        targetType: "PRODUCT_AFFILIATE_SETTING",
        targetId: BigInt(settingId),
        createdAt: new Date(),
      },
    });

    return setting;
  });

exports.reviewRefund = ({ refundId, adminId, status, rejectReason }) =>
  paymentRepository.reviewRefundRequest({ refundId, adminId, status, rejectReason });

