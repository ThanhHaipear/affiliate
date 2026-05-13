const prisma = require("../../config/prisma");
const { notifyAdmins } = require("../../utils/admin-notifications");
const { summarizeOrderFinancialStats } = require("../../utils/order-financial-stats");
const { parsePagination } = require("../../utils/pagination");

exports.findSellerByOwner = (accountId) => prisma.seller.findFirst({
  where: { ownerAccountId: accountId },
  include: { paymentAccounts: true, kyc: { include: { documents: true } } }
});

exports.listOrders = (sellerId) => prisma.order.findMany({
  where: { sellerId },
  include: {
    items: true,
    payments: true,
    refunds: { orderBy: { createdAt: "desc" } },
  },
  orderBy: { createdAt: "desc" },
});

exports.listProducts = (sellerId) => prisma.product.findMany({
  where: { sellerId },
  include: {
    category: true,
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
    seller: true,
  },
  orderBy: { createdAt: "desc" },
});

exports.findProductBySeller = (sellerId, productId) => prisma.product.findFirst({
  where: { sellerId, id: productId },
  include: {
    category: true,
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
    seller: true,
  }
});

exports.listAffiliateSettings = (sellerId) => prisma.productAffiliateSetting.findMany({
  where: { sellerId },
  include: {
    product: {
      include: {
        images: true,
        category: true,
      },
    },
  },
  orderBy: { createdAt: "desc" },
});

exports.getStats = async (sellerId) => {
  const orders = await prisma.order.findMany({
    where: { sellerId },
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

exports.upsertProfile = async (accountId, data) => {
  const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
  if (!seller) {
    return prisma.seller.create({
      data: {
        ownerAccountId: accountId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  return prisma.seller.update({ where: { id: seller.id }, data: { ...data, updatedAt: new Date() } });
};

exports.submitKyc = async (sellerId, payload) => prisma.$transaction(async (tx) => {
  const kyc = await tx.sellerKyc.upsert({
    where: { sellerId },
    update: {
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      fullNameOnDocument: payload.fullNameOnDocument,
      permanentAddress: payload.permanentAddress,
      issuedPlace: payload.issuedPlace,
      status: "PENDING",
      rejectReason: null,
      updatedAt: new Date()
    },
    create: {
      sellerId,
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      fullNameOnDocument: payload.fullNameOnDocument,
      permanentAddress: payload.permanentAddress,
      issuedPlace: payload.issuedPlace,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await tx.kycDocument.deleteMany({ where: { sellerKycId: kyc.id } });
  await tx.kycDocument.createMany({
    data: payload.documentUrls.map((fileUrl) => ({ sellerKycId: kyc.id, documentKind: "IDENTITY", fileUrl, createdAt: new Date() }))
  });

  return tx.sellerKyc.findUnique({ where: { sellerId }, include: { documents: true } });
});

exports.createPaymentAccount = async (sellerId, payload) => prisma.$transaction(async (tx) => {
  const account = await tx.sellerPaymentAccount.create({
    data: {
      sellerId,
      type: payload.type,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber,
      bankName: payload.bankName,
      branch: payload.branch,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  if (payload.makeDefault) {
    await tx.seller.update({ where: { id: sellerId }, data: { defaultPaymentAccountId: account.id, updatedAt: new Date() } });
  }

  return account;
});

exports.upsertProductAffiliateSetting = (sellerId, productId, payload) => prisma.$transaction(async (tx) => {
  const now = new Date();
  const setting = await tx.productAffiliateSetting.upsert({
    where: { productId },
    update: {
      sellerId,
      commissionType: "PERCENT",
      commissionValue: BigInt(payload.commissionValue),
      isEnabled: payload.isEnabled ?? true,
      approvalStatus: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      rejectReason: null,
      updatedAt: now
    },
    create: {
      sellerId,
      productId,
      commissionType: "PERCENT",
      commissionValue: BigInt(payload.commissionValue),
      isEnabled: payload.isEnabled ?? true,
      approvalStatus: "PENDING",
      createdAt: now,
      updatedAt: now
    }
  });

  await notifyAdmins(tx, {
    title: "Affiliate subqueue",
    content: `Affiliate setting for product #${productId} has entered the affiliate review queue.`,
    type: "ADMIN_PENDING_AFFILIATE_SUBQUEUE",
    targetType: "PRODUCT",
    targetId: BigInt(productId),
    createdAt: now,
  });

  return setting;
});

exports.setProductVisibility = (sellerId, productId, visible) => prisma.$transaction(async (tx) => {
  const product = await tx.product.findFirst({
    where: { sellerId, id: productId },
    include: {
      category: true,
      images: true,
      variants: { include: { inventory: true } },
      affiliateSetting: true,
      seller: true,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (visible && product.lockedAt) {
    throw new Error("Product is hidden by admin and cannot be shown by seller");
  }

  const now = new Date();
  const updated = await tx.product.update({
    where: { id: productId },
    data: {
      sellerHiddenAt: visible ? null : now,
      updatedAt: now,
    },
    include: {
      category: true,
      images: true,
      variants: { include: { inventory: true } },
      affiliateSetting: true,
      seller: true,
    },
  });

  await tx.activityLog.create({
    data: {
      accountId: product.seller.ownerAccountId,
      action: visible ? "SELLER_SHOW_PRODUCT" : "SELLER_HIDE_PRODUCT",
      targetType: "PRODUCT",
      targetId: BigInt(productId),
      description: `${visible ? "Seller showed" : "Seller hid"} product ${product.name || `#${productId}`}`,
      createdAt: now,
    },
  });

  return updated;
});

exports.listAffiliates = async (sellerId, query = {}) => {
  const { page, limit, skip } = parsePagination({ page: query.page, limit: query.limit || 8 });
  const search = (query.search || "").trim();
  const sortBy = query.sortBy || "totalOrders";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  // Find all distinct affiliates who have affiliate links to this seller's products
  const sellerProducts = await prisma.product.findMany({
    where: { sellerId },
    select: { id: true },
  });
  const productIds = sellerProducts.map((p) => p.id);

  if (!productIds.length) {
    return { items: [], total: 0, page, limit, totalPages: 0 };
  }

  // Find unique affiliate IDs linked to seller's products
  const affiliateLinks = await prisma.affiliateLink.findMany({
    where: { productId: { in: productIds } },
    select: { affiliateId: true },
    distinct: ["affiliateId"],
  });
  let affiliateIds = affiliateLinks.map((l) => l.affiliateId);

  if (!affiliateIds.length) {
    return { items: [], total: 0, page, limit, totalPages: 0 };
  }

  // If search query, filter affiliates by name or email
  if (search) {
    const matchingAffiliates = await prisma.affiliate.findMany({
      where: {
        accountId: { in: affiliateIds },
        OR: [
          { fullName: { contains: search } },
          { account: { email: { contains: search } } },
          { account: { phone: { contains: search } } },
        ],
      },
      select: { accountId: true },
    });
    affiliateIds = matchingAffiliates.map((a) => a.accountId);

    if (!affiliateIds.length) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  // Fetch affiliate profiles
  const affiliates = await prisma.affiliate.findMany({
    where: { accountId: { in: affiliateIds } },
    include: {
      account: {
        select: { id: true, email: true, phone: true, status: true },
      },
    },
  });

  // Fetch order items for this seller's products that came from these affiliates
  const orderItems = await prisma.orderItem.findMany({
    where: {
      affiliateId: { in: affiliateIds },
      order: { sellerId },
    },
    include: {
      order: {
        select: { id: true, status: true, totalAmount: true },
      },
    },
  });

  // Aggregate stats per affiliate
  const statsMap = new Map();
  for (const item of orderItems) {
    const key = item.affiliateId;
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        totalOrders: new Set(),
        totalRevenue: 0,
        totalCommission: 0,
        completedOrders: new Set(),
      });
    }
    const stat = statsMap.get(key);
    stat.totalOrders.add(item.order.id.toString());
    stat.totalRevenue += Number(item.lineTotal || 0);
    stat.totalCommission += Number(item.commissionAmount || 0);
    if (item.order.status === "COMPLETED") {
      stat.completedOrders.add(item.order.id.toString());
    }
  }

  // Fetch affiliate link counts
  const linkCounts = await prisma.affiliateLink.groupBy({
    by: ["affiliateId"],
    where: {
      affiliateId: { in: affiliateIds },
      productId: { in: productIds },
    },
    _count: { id: true },
  });
  const linkCountMap = new Map(linkCounts.map((l) => [l.affiliateId, l._count.id]));

  // Build result items
  let items = affiliates.map((affiliate) => {
    const stat = statsMap.get(affiliate.accountId) || {
      totalOrders: new Set(),
      totalRevenue: 0,
      totalCommission: 0,
      completedOrders: new Set(),
    };

    return {
      affiliateId: affiliate.accountId,
      fullName: affiliate.fullName || null,
      email: affiliate.account?.email || null,
      phone: affiliate.account?.phone || null,
      avatarUrl: affiliate.avatarUrl || null,
      kycStatus: affiliate.kycStatus,
      activityStatus: affiliate.activityStatus,
      totalLinks: linkCountMap.get(affiliate.accountId) || 0,
      totalOrders: stat.totalOrders.size,
      completedOrders: stat.completedOrders.size,
      totalRevenue: stat.totalRevenue,
      totalCommission: stat.totalCommission,
      createdAt: affiliate.createdAt,
    };
  });

  // Sort
  const sortKey = ["totalOrders", "totalRevenue", "totalCommission", "totalLinks", "completedOrders"].includes(sortBy)
    ? sortBy
    : "totalOrders";
  items.sort((a, b) => sortOrder === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  items = items.slice(skip, skip + limit);

  return { items, total, page, limit, totalPages };
};
