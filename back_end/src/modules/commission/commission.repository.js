const prisma = require("../../config/prisma");

const commissionInclude = {
  items: {
    include: {
      orderItem: true,
      product: true,
    },
  },
  order: {
    include: {
      items: true,
      payments: true,
    },
  },
};

exports.listMyCommissions = async (accountId, roles) => {
  if (roles.includes("AFFILIATE")) {
    return prisma.affiliateCommission.findMany({
      where: { affiliateId: accountId },
      include: commissionInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  if (roles.includes("SELLER")) {
    const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
    return prisma.affiliateCommission.findMany({
      where: { sellerId: seller?.id },
      include: commissionInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.affiliateCommission.findMany({
    include: commissionInclude,
    orderBy: { createdAt: "desc" },
  });
};
