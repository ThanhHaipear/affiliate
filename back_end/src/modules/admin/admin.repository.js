const prisma = require("../../config/prisma");
const { summarizeOrderFinancialStats } = require("../../utils/order-financial-stats");
const paymentRepository = require("../payment/payment.repository");

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
  orderBy: { updatedAt: "desc" },
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
  orderBy: { updatedAt: "desc" },
});

exports.listCategories = () =>
  prisma.category.findMany({
    include: {
      parent: true,
      children: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });

exports.createCategory = ({ name, parentId, adminId }) =>
  prisma.$transaction(async (tx) => {
    let slugBase = slugify(name);
    if (!slugBase) {
      slugBase = `category-${Date.now()}`;
    }

    let slug = slugBase;
    let sequence = 1;
    while (await tx.category.findFirst({ where: { slug } })) {
      sequence += 1;
      slug = `${slugBase}-${sequence}`;
    }

    const now = new Date();
    const created = await tx.category.create({
      data: {
        name,
        parentId: parentId || null,
        slug,
        createdAt: now,
      },
      include: {
        parent: true,
        children: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_CREATE_CATEGORY",
        targetType: "CATEGORY",
        targetId: BigInt(created.id),
        description: `Admin created category ${created.name}`,
        createdAt: now,
      },
    });

    return created;
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

async function ensureRole(tx, code) {
  const role = await tx.role.findUnique({ where: { code } });
  if (!role) {
    throw new Error(`Role ${code} not found`);
  }

  return role;
}

async function addRoleIfMissing(tx, accountId, roleCode) {
  const role = await ensureRole(tx, roleCode);
  const existing = await tx.accountRole.findFirst({
    where: { accountId, roleId: role.id },
  });

  if (!existing) {
    await tx.accountRole.create({
      data: { accountId, roleId: role.id },
    });
  }
}

async function removeRoleIfPresent(tx, accountId, roleCode) {
  const role = await ensureRole(tx, roleCode);
  await tx.accountRole.deleteMany({
    where: { accountId, roleId: role.id },
  });
}

function getAccountIncludeConfig() {
  return {
    accountRoles: { include: { role: true } },
    customerProfile: true,
    adminProfile: true,
    affiliate: true,
    sellers: true,
  };
}

async function syncAccountStatusByRoles(tx, accountId, adminId, reason = null) {
  const refreshed = await tx.account.findUnique({
    where: { id: accountId },
    include: {
      accountRoles: true,
    },
  });

  if (!refreshed) {
    throw new Error("Account not found");
  }

  if (!refreshed.accountRoles.length) {
    await tx.account.update({
      where: { id: accountId },
      data: {
        status: "LOCKED",
        lockReason: reason || "Locked because all active roles were disabled by admin",
        lockedAt: new Date(),
        lockedBy: adminId,
        updatedAt: new Date(),
      },
    });
  } else if (refreshed.status === "LOCKED") {
    await tx.account.update({
      where: { id: accountId },
      data: {
        status: "ACTIVE",
        lockReason: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      },
    });
  }

  return tx.account.findUnique({
    where: { id: accountId },
    include: getAccountIncludeConfig(),
  });
}

exports.lockAccount = ({ accountId, adminId, reason, target = "ALL" }) =>
  prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: getAccountIncludeConfig(),
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (target === "CUSTOMER") {
      if (!account.customerProfile) {
        throw new Error("Account does not have customer capability");
      }

      const hasCustomerRole = account.accountRoles.some((item) => item.role.code === "CUSTOMER");
      if (!hasCustomerRole) {
        throw new Error("Customer role is already locked or unavailable");
      }

      await removeRoleIfPresent(tx, accountId, "CUSTOMER");
      await tx.account.update({
        where: { id: accountId },
        data: {
          lockReason: reason || "Customer role locked by admin",
          updatedAt: new Date(),
        },
      });
      await tx.activityLog.create({
        data: {
          accountId: adminId,
          action: "ADMIN_LOCK_CUSTOMER_ROLE",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          description: `Customer role locked for account ${accountId}`,
          createdAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          accountId,
          title: "Customer role locked",
          content: reason || "Your customer role has been locked by admin.",
          type: "CUSTOMER_ROLE_LOCKED",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          createdAt: new Date(),
        },
      });

      return syncAccountStatusByRoles(tx, accountId, adminId, reason);
    }

    if (target === "AFFILIATE") {
      if (!account.affiliate) {
        throw new Error("Account does not have affiliate capability");
      }

      const hasAffiliateRole = account.accountRoles.some((item) => item.role.code === "AFFILIATE");
      if (!hasAffiliateRole) {
        throw new Error("Affiliate role is already locked or unavailable");
      }

      await removeRoleIfPresent(tx, accountId, "AFFILIATE");
      await tx.affiliate.update({
        where: { accountId },
        data: {
          activityStatus: "LOCKED",
          lockReason: reason || "Locked by admin",
          lockedAt: new Date(),
          lockedBy: adminId,
          updatedAt: new Date(),
        },
      });
      await tx.activityLog.create({
        data: {
          accountId: adminId,
          action: "ADMIN_LOCK_AFFILIATE_ROLE",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          description: `Affiliate role locked for account ${accountId}`,
          createdAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          accountId,
          title: "Affiliate role locked",
          content: reason || "Your affiliate role has been locked by admin.",
          type: "AFFILIATE_ROLE_LOCKED",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          createdAt: new Date(),
        },
      });

      return syncAccountStatusByRoles(tx, accountId, adminId, reason);
    }

    const updated = await tx.account.update({
      where: { id: accountId },
      data: {
        status: "LOCKED",
        lockReason: reason || "Locked by admin",
        lockedAt: new Date(),
        lockedBy: adminId,
        updatedAt: new Date(),
      },
      include: getAccountIncludeConfig(),
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

exports.unlockAccount = ({ accountId, adminId, target = "ALL" }) =>
  prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: getAccountIncludeConfig(),
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (target === "CUSTOMER") {
      if (!account.customerProfile) {
        throw new Error("Account does not have customer capability");
      }

      if (account.status === "LOCKED" && account.accountRoles.length > 0) {
        throw new Error("Account is fully locked, unlock the whole account first");
      }

      const hasCustomerRole = account.accountRoles.some((item) => item.role.code === "CUSTOMER");
      if (hasCustomerRole) {
        throw new Error("Customer role is already active");
      }

      await addRoleIfMissing(tx, accountId, "CUSTOMER");
      if (account.status !== "LOCKED") {
        await tx.account.update({
          where: { id: accountId },
          data: {
            lockReason: null,
            updatedAt: new Date(),
          },
        });
      }
      await tx.activityLog.create({
        data: {
          accountId: adminId,
          action: "ADMIN_UNLOCK_CUSTOMER_ROLE",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          description: `Customer role unlocked for account ${accountId}`,
          createdAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          accountId,
          title: "Customer role unlocked",
          content: "Your customer role has been unlocked by admin.",
          type: "CUSTOMER_ROLE_UNLOCKED",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          createdAt: new Date(),
        },
      });

      return syncAccountStatusByRoles(tx, accountId, adminId);
    }

    if (target === "AFFILIATE") {
      if (!account.affiliate) {
        throw new Error("Account does not have affiliate capability");
      }

      if (account.status === "LOCKED" && account.accountRoles.length > 0) {
        throw new Error("Account is fully locked, unlock the whole account first");
      }

      if (account.affiliate.activityStatus !== "LOCKED") {
        throw new Error("Affiliate role is already active");
      }

      await addRoleIfMissing(tx, accountId, "AFFILIATE");
      await tx.affiliate.update({
        where: { accountId },
        data: {
          activityStatus: "ACTIVE",
          lockReason: null,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date(),
        },
      });
      await tx.activityLog.create({
        data: {
          accountId: adminId,
          action: "ADMIN_UNLOCK_AFFILIATE_ROLE",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          description: `Affiliate role unlocked for account ${accountId}`,
          createdAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          accountId,
          title: "Affiliate role unlocked",
          content: "Your affiliate role has been unlocked by admin.",
          type: "AFFILIATE_ROLE_UNLOCKED",
          targetType: "ACCOUNT",
          targetId: BigInt(accountId),
          createdAt: new Date(),
        },
      });

      return syncAccountStatusByRoles(tx, accountId, adminId);
    }

    const updated = await tx.account.update({
      where: { id: accountId },
      data: {
        status: "ACTIVE",
        lockReason: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      },
      include: getAccountIncludeConfig(),
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

exports.listAffiliateLinks = ({ q, affiliateId, status }) => {
  const where = {};

  if (affiliateId) {
    where.affiliateId = Number(affiliateId);
  }

  if (status) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { shortCode: { contains: q } },
      { affiliate: { is: { fullName: { contains: q } } } },
      { affiliate: { is: { account: { is: { email: { contains: q } } } } } },
      { product: { is: { name: { contains: q } } } },
      { product: { is: { seller: { is: { shopName: { contains: q } } } } } },
    ];
  }

  return prisma.affiliateLink.findMany({
    where,
    include: {
      affiliate: {
        include: {
          account: true,
        },
      },
      product: {
        include: {
          seller: true,
          affiliateSetting: true,
          category: true,
          images: {
            orderBy: { sortOrder: "asc" },
          },
          variants: {
            include: {
              inventory: true,
            },
            orderBy: { id: "asc" },
          },
        },
      },
      revokedByAccount: {
        include: {
          accountRoles: {
            include: {
              role: true,
            },
          },
          adminProfile: true,
          customerProfile: true,
          affiliate: true,
          sellers: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      clicks: true,
      orderItems: true,
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

exports.updatePlatformFee = ({ feeValue, adminId }) =>
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
        feeType: "PERCENT",
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
        description: `Platform fee updated to PERCENT:${feeValue}`,
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
    if (!seller) {
      throw new Error("Seller not found");
    }

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

    if (status === "APPROVED") {
      await addRoleIfMissing(tx, seller.ownerAccountId, "SELLER");
    } else {
      await removeRoleIfPresent(tx, seller.ownerAccountId, "SELLER");
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
    if (!affiliate) {
      throw new Error("Affiliate not found");
    }

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
      data: {
        kycStatus: status,
        activityStatus: status === "APPROVED" ? "ACTIVE" : affiliate.activityStatus,
        updatedAt: new Date(),
      },
    });

    if (status === "APPROVED") {
      await addRoleIfMissing(tx, affiliateId, "AFFILIATE");
    } else {
      await removeRoleIfPresent(tx, affiliateId, "AFFILIATE");
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

exports.getProductById = (productId) => prisma.product.findUnique({
  where: { id: Number(productId) },
  include: {
    seller: true,
    category: true,
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
  },
});

exports.listProducts = ({ limit } = {}) => prisma.product.findMany({
  include: {
    seller: true,
    category: true,
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
  },
  orderBy: { updatedAt: "desc" },
  ...(limit ? { take: limit } : {}),
});

exports.setProductVisibility = ({ productId, adminId, visible, reason }) =>
  prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: Number(productId) },
      include: {
        seller: true,
        category: true,
        images: true,
        variants: { include: { inventory: true } },
        affiliateSetting: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const now = new Date();
    const updated = await tx.product.update({
      where: { id: Number(productId) },
      data: visible
        ? {
            sellerHiddenAt: null,
            lockReason: null,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          }
        : {
            lockReason: reason || "Hidden by admin",
            lockedAt: now,
            lockedBy: adminId,
            updatedAt: now,
          },
      include: {
        seller: true,
        category: true,
        images: true,
        variants: { include: { inventory: true } },
        affiliateSetting: true,
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: visible ? "ADMIN_SHOW_PRODUCT" : "ADMIN_HIDE_PRODUCT",
        targetType: "PRODUCT",
        targetId: BigInt(productId),
        description: `${visible ? "Admin showed" : "Admin hid"} product ${product.name || `#${productId}`}`,
        createdAt: now,
      },
    });

    await tx.notification.create({
      data: {
        accountId: product.seller.ownerAccountId,
        title: visible ? "Product shown by admin" : "Product hidden by admin",
        content: visible
          ? `Admin has made product ${product.name || `#${productId}`} visible again.`
          : reason || `Admin has hidden product ${product.name || `#${productId}`}.`,
        type: visible ? "PRODUCT_SHOWN_BY_ADMIN" : "PRODUCT_HIDDEN_BY_ADMIN",
        targetType: "PRODUCT",
        targetId: BigInt(productId),
        createdAt: now,
      },
    });

    return updated;
  });

exports.revokeAffiliateLink = ({ linkId, adminId, reason }) =>
  prisma.$transaction(async (tx) => {
    const link = await tx.affiliateLink.findUnique({
      where: { id: BigInt(linkId) },
      include: {
        affiliate: {
          include: {
            account: true,
          },
        },
        product: true,
        revokedByAccount: {
          include: {
            accountRoles: {
              include: {
                role: true,
              },
            },
            adminProfile: true,
            customerProfile: true,
            affiliate: true,
            sellers: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!link) {
      throw new Error("Affiliate link not found");
    }

    if (link.status === "REVOKED") {
      return link;
    }

    const now = new Date();
    const updated = await tx.affiliateLink.update({
      where: { id: BigInt(linkId) },
      data: {
        status: "REVOKED",
        revokedAt: now,
        revokedBy: adminId,
        revokeReason: reason || "Khóa bởi admin",
        updatedAt: now,
      },
      include: {
        affiliate: {
          include: {
            account: true,
          },
        },
        product: {
          include: {
            seller: true,
            affiliateSetting: true,
            category: true,
            images: {
              orderBy: { sortOrder: "asc" },
            },
            variants: {
              include: {
                inventory: true,
              },
              orderBy: { id: "asc" },
            },
          },
        },
        revokedByAccount: {
          include: {
            accountRoles: {
              include: {
                role: true,
              },
            },
          },
        },
        clicks: true,
        orderItems: true,
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_REVOKE_AFFILIATE_LINK",
        targetType: "AFFILIATE_LINK",
        targetId: BigInt(linkId),
        description: `Admin revoked affiliate link ${link.shortCode}. Reason: ${reason || "N/A"}`,
        createdAt: now,
      },
    });

    await tx.notification.create({
      data: {
        accountId: link.affiliateId,
        title: "Link affiliate bị khóa bởi admin",
        content: `Link ${link.shortCode} cho sản phẩm ${link.product?.name || `#${link.productId}`} đã bị admin khóa.\n\nLý do: ${reason || "Không có lý do cụ thể."}`,
        type: "AFFILIATE_LINK_REVOKED_BY_ADMIN",
        targetType: "AFFILIATE_LINK",
        targetId: BigInt(linkId),
        createdAt: now,
      },
    });

    return updated;
  });

exports.unrevokeAffiliateLink = ({ linkId, adminId }) =>
  prisma.$transaction(async (tx) => {
    const link = await tx.affiliateLink.findUnique({
      where: { id: BigInt(linkId) },
      include: {
        affiliate: {
          include: {
            account: true,
          },
        },
        product: true,
        revokedByAccount: {
          include: {
            accountRoles: {
              include: {
                role: true,
              },
            },
            adminProfile: true,
            customerProfile: true,
            affiliate: true,
            sellers: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!link) {
      throw new Error("Affiliate link not found");
    }

    if (link.status !== "REVOKED") {
      return link;
    }

    const now = new Date();
    const updated = await tx.affiliateLink.update({
      where: { id: BigInt(linkId) },
      data: {
        status: "ACTIVE",
        revokedAt: null,
        revokedBy: null,
        updatedAt: now,
      },
      include: {
        affiliate: {
          include: {
            account: true,
          },
        },
        product: {
          include: {
            seller: true,
            affiliateSetting: true,
            category: true,
            images: {
              orderBy: { sortOrder: "asc" },
            },
            variants: {
              include: {
                inventory: true,
              },
              orderBy: { id: "asc" },
            },
          },
        },
        revokedByAccount: {
          include: {
            accountRoles: {
              include: {
                role: true,
              },
            },
            adminProfile: true,
            customerProfile: true,
            affiliate: true,
            sellers: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        clicks: true,
        orderItems: true,
      },
    });

    await tx.activityLog.create({
      data: {
        accountId: adminId,
        action: "ADMIN_UNREVOKE_AFFILIATE_LINK",
        targetType: "AFFILIATE_LINK",
        targetId: BigInt(linkId),
        description: `Admin reactivated affiliate link ${link.shortCode}`,
        createdAt: now,
      },
    });

    await tx.notification.create({
      data: {
        accountId: link.affiliateId,
        title: "Affiliate link reactivated by admin",
        content: `Your affiliate link ${link.shortCode} for product ${link.product?.name || `#${link.productId}`} has been reactivated by admin.`,
        type: "AFFILIATE_LINK_UNREVOKED_BY_ADMIN",
        targetType: "AFFILIATE_LINK",
        targetId: BigInt(linkId),
        createdAt: now,
      },
    });

    return updated;
  });

