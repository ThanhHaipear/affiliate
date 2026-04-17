const AppError = require("../../utils/app-error");
const adminRepository = require("./admin.repository");

exports.getDashboard = async () => {
  const [pendingSellers, pendingAffiliates, pendingCatalogProducts, pendingProducts] =
    await Promise.all([
      adminRepository.findPendingSellers(),
      adminRepository.findPendingAffiliates(),
      adminRepository.findPendingCatalogProducts(),
      adminRepository.findPendingProducts(),
    ]);

  return { pendingSellers, pendingAffiliates, pendingCatalogProducts, pendingProducts };
};

exports.getAccounts = async (query) => adminRepository.listAccounts(query);

exports.lockAccount = async (accountId, adminId, payload) => {
  try {
    return await adminRepository.lockAccount({
      accountId: Number(accountId),
      adminId,
      reason: payload?.reason,
      target: payload?.target || "ALL",
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.unlockAccount = async (accountId, adminId, payload) => {
  try {
    return await adminRepository.unlockAccount({
      accountId: Number(accountId),
      adminId,
      target: payload?.target || "ALL",
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.getOrders = async (query) =>
  adminRepository.listOrders({
    status: query?.status,
    sellerConfirmed:
      query?.sellerConfirmed === undefined ? undefined : query.sellerConfirmed === "true",
  });

exports.getFinancialStats = async (query) =>
  adminRepository.getFinancialStats({
    status: query?.status,
    sellerConfirmed:
      query?.sellerConfirmed === undefined ? undefined : query.sellerConfirmed === "true",
  });

exports.getFraudAlerts = async (query) =>
  adminRepository.listFraudAlerts({
    status: query?.status,
    severity: query?.severity,
  });

exports.getPlatformSettings = async () => adminRepository.getPlatformSettings();

exports.updatePlatformFee = async (adminId, payload) => {
  try {
    return await adminRepository.updatePlatformFee({
      feeValue: payload.feeValue,
      adminId,
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.updateWithdrawalConfig = async (adminId, payload) => {
  try {
    return await adminRepository.updateWithdrawalConfig({
      minAmount: payload.minAmount,
      maxAmount: payload.maxAmount,
      adminId,
    });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.reviewSeller = async (sellerId, adminId, payload) => {
  try {
    return await adminRepository.reviewSeller({ sellerId: Number(sellerId), adminId, ...payload });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.reviewAffiliate = async (affiliateId, adminId, payload) => {
  try {
    return await adminRepository.reviewAffiliate({ affiliateId: Number(affiliateId), adminId, ...payload });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.reviewProduct = async (productId, adminId, payload) => {
  try {
    return await adminRepository.reviewProduct({ productId: Number(productId), adminId, ...payload });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

exports.reviewProductAffiliate = async (settingId, adminId, payload) =>
  adminRepository.reviewProductAffiliate({ settingId, adminId, ...payload });

exports.reviewRefund = async (refundId, adminId, payload) => {
  try {
    return await adminRepository.reviewRefund({ refundId, adminId, ...payload });
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
