const prisma = require("../../config/prisma");

exports.getWalletsForUser = async (accountId, roles) => {
  const wallets = [];

  if (roles.includes("AFFILIATE")) {
    wallets.push(await prisma.wallet.findFirst({ where: { ownerType: "AFFILIATE", affiliateId: accountId }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } }));
  }

  if (roles.includes("SELLER")) {
    const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
    if (seller) {
      wallets.push(await prisma.wallet.findFirst({ where: { ownerType: "SELLER", sellerId: seller.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } }));
    }
  }

  if (roles.includes("ADMIN")) {
    wallets.push(await prisma.wallet.findFirst({ where: { ownerType: "PLATFORM" }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } }));
  }

  return wallets.filter(Boolean);
};
