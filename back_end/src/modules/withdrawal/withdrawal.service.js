const prisma = require("../../config/prisma");
const AppError = require("../../utils/app-error");
const withdrawalRepository = require("./withdrawal.repository");

const toNumber = (value) => {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
};

const pickDefaultPaymentAccount = (accounts = [], defaultPaymentAccountId = null) => {
  const activeAccounts = accounts.filter((account) => account.status === "ACTIVE");

  if (!activeAccounts.length) {
    return null;
  }

  if (defaultPaymentAccountId) {
    const matchedAccount = activeAccounts.find((account) => String(account.id) === String(defaultPaymentAccountId));
    if (matchedAccount) {
      return matchedAccount;
    }
  }

  return activeAccounts[0];
};

const getAvailableRequestBalance = async (wallet) => {
  if (!wallet) {
    return 0;
  }

  const pendingAmount = await withdrawalRepository.sumOpenPendingAmount(wallet.id);
  return Math.max(0, toNumber(wallet.balance) - toNumber(pendingAmount));
};

exports.requestWithdrawal = async (accountId, roles, payload) => {
  if (roles.includes("AFFILIATE")) {
    const config = await withdrawalRepository.findCurrentConfig("AFFILIATE");
    if (!config) throw new AppError("Withdrawal config for affiliate is missing", 500);
    const wallet = await prisma.wallet.findFirst({ where: { ownerType: "AFFILIATE", affiliateId: accountId } });
    const paymentAccount = await prisma.affiliatePaymentAccount.findFirst({ where: { affiliateId: accountId, status: "ACTIVE" } });
    if (!wallet || !paymentAccount) throw new AppError("Affiliate wallet or payment account not found", 400);
    if (payload.amount < Number(config.minAmount) || payload.amount > Number(config.maxAmount)) throw new AppError("Amount is outside allowed range", 400);
    const availableRequestBalance = await getAvailableRequestBalance(wallet);
    if (availableRequestBalance < payload.amount) throw new AppError("Insufficient wallet balance", 400);
    return withdrawalRepository.createAffiliateWithdrawal(accountId, payload.amount, config);
  }

  if (roles.includes("SELLER")) {
    const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
    if (!seller) throw new AppError("Seller profile not found", 404);
    const config = await withdrawalRepository.findCurrentConfig("SELLER");
    if (!config) throw new AppError("Withdrawal config for seller is missing", 500);
    const wallet = await prisma.wallet.findFirst({ where: { ownerType: "SELLER", sellerId: seller.id } });
    const paymentAccount = await prisma.sellerPaymentAccount.findFirst({ where: { sellerId: seller.id, status: "ACTIVE" } });
    if (!wallet || !paymentAccount) throw new AppError("Seller wallet or payment account not found", 400);
    if (payload.amount < Number(config.minAmount) || payload.amount > Number(config.maxAmount)) throw new AppError("Amount is outside allowed range", 400);
    const availableRequestBalance = await getAvailableRequestBalance(wallet);
    if (availableRequestBalance < payload.amount) throw new AppError("Insufficient wallet balance", 400);
    return withdrawalRepository.createSellerWithdrawal(seller.id, payload.amount, config);
  }

  throw new AppError("Withdrawal is only available for affiliate or seller", 403);
};

exports.getMyWithdrawalContext = async (accountId, roles) => {
  if (roles.includes("AFFILIATE")) {
    const [wallet, config, affiliate] = await Promise.all([
      prisma.wallet.findFirst({
        where: { ownerType: "AFFILIATE", affiliateId: accountId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      withdrawalRepository.findCurrentConfig("AFFILIATE"),
      prisma.affiliate.findUnique({
        where: { accountId },
        include: {
          paymentAccounts: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    ]);

    const paymentAccount = pickDefaultPaymentAccount(affiliate?.paymentAccounts || [], affiliate?.defaultPaymentAccountId);
    const balance = toNumber(wallet?.balance);
    const minAmount = toNumber(config?.minAmount);
    const maxAmount = toNumber(config?.maxAmount);
    const availableRequestBalance = await getAvailableRequestBalance(wallet);
    const maxRequestableAmount = Math.max(0, Math.min(availableRequestBalance, maxAmount || availableRequestBalance));
    const missingRequirements = [];

    if (!wallet) {
      missingRequirements.push("Chua co vi affiliate.");
    }

    if (!paymentAccount) {
      missingRequirements.push("Chua co tai khoan nhan tien dang hoat dong.");
    }

    if (!config) {
      missingRequirements.push("Chua co cau hinh gioi han rut tien.");
    }

    if (wallet && config && availableRequestBalance < minAmount) {
      missingRequirements.push("So du co the rut hien tai chua dat muc rut toi thieu.");
    }

    return {
      ownerType: "AFFILIATE",
      wallet,
      paymentAccount,
      config,
      availableBalance: balance,
      availableRequestBalance,
      minAmount,
      maxAmount,
      maxRequestableAmount,
      canRequest: missingRequirements.length === 0,
      missingRequirements,
    };
  }

  if (roles.includes("SELLER")) {
    const seller = await prisma.seller.findFirst({
      where: { ownerAccountId: accountId },
      include: {
        paymentAccounts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!seller) {
      throw new AppError("Seller profile not found", 404);
    }

    const [wallet, config] = await Promise.all([
      prisma.wallet.findFirst({
        where: { ownerType: "SELLER", sellerId: seller.id },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      withdrawalRepository.findCurrentConfig("SELLER"),
    ]);

    const paymentAccount = pickDefaultPaymentAccount(seller.paymentAccounts || [], seller.defaultPaymentAccountId);
    const balance = toNumber(wallet?.balance);
    const minAmount = toNumber(config?.minAmount);
    const maxAmount = toNumber(config?.maxAmount);
    const availableRequestBalance = await getAvailableRequestBalance(wallet);
    const maxRequestableAmount = Math.max(0, Math.min(availableRequestBalance, maxAmount || availableRequestBalance));
    const missingRequirements = [];

    if (!wallet) {
      missingRequirements.push("Chua co vi seller.");
    }

    if (!paymentAccount) {
      missingRequirements.push("Chua co tai khoan nhan tien dang hoat dong.");
    }

    if (!config) {
      missingRequirements.push("Chua co cau hinh gioi han rut tien.");
    }

    if (wallet && config && availableRequestBalance < minAmount) {
      missingRequirements.push("So du co the rut hien tai chua dat muc rut toi thieu.");
    }

    return {
      ownerType: "SELLER",
      wallet,
      paymentAccount,
      config,
      availableBalance: balance,
      availableRequestBalance,
      minAmount,
      maxAmount,
      maxRequestableAmount,
      canRequest: missingRequirements.length === 0,
      missingRequirements,
    };
  }

  throw new AppError("Withdrawal is only available for affiliate or seller", 403);
};

exports.listMyWithdrawals = async (accountId, roles) => {
  if (roles.includes("AFFILIATE")) {
    const wallet = await prisma.wallet.findFirst({ where: { ownerType: "AFFILIATE", affiliateId: accountId } });
    return wallet ? withdrawalRepository.listWithdrawals({ walletId: wallet.id }) : [];
  }

  if (roles.includes("SELLER")) {
    const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
    if (!seller) return [];
    const wallet = await prisma.wallet.findFirst({ where: { ownerType: "SELLER", sellerId: seller.id } });
    return wallet ? withdrawalRepository.listWithdrawals({ walletId: wallet.id }) : [];
  }

  return [];
};

exports.listPendingWithdrawals = () => withdrawalRepository.listWithdrawals({ status: "PENDING" });

exports.listAdminWithdrawals = (filters = {}) => {
  const statuses = filters.statuses?.length ? filters.statuses : undefined;
  return withdrawalRepository.listWithdrawals(statuses ? { status: { in: statuses } } : {});
};

exports.getAdminWithdrawalSummary = () => withdrawalRepository.getAdminWithdrawalSummary();

exports.reviewWithdrawal = async (withdrawalId, adminId, payload) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: BigInt(withdrawalId) },
    include: { wallet: true },
  });

  if (!withdrawal) {
    throw new AppError("Withdrawal not found", 404);
  }

  if (withdrawal.status !== "PENDING") {
    throw new AppError("Only pending withdrawals can be reviewed", 400);
  }

  if (payload.status === "APPROVED" && withdrawal.wallet.balance < withdrawal.amount) {
    throw new AppError("Insufficient wallet balance at approval time", 400);
  }

  return withdrawalRepository.reviewWithdrawal(withdrawalId, adminId, payload);
};
