const prisma = require("../../config/prisma");
const { notifyAdmins } = require("../../utils/admin-notifications");
const { summarizeOrderFinancialStats } = require("../../utils/order-financial-stats");

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
