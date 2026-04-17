const AppError = require("../../utils/app-error");
const affiliateRepository = require("./affiliate.repository");

const getAffiliateOrThrow = async (accountId) => {
  const affiliate = await affiliateRepository.findAffiliate(accountId);
  if (!affiliate) throw new AppError("Affiliate profile not found", 404);
  return affiliate;
};

const getApprovedAffiliateOrThrow = async (accountId) => {
  const affiliate = await getAffiliateOrThrow(accountId);
  if (affiliate.kycStatus !== "APPROVED") {
    throw new AppError("Affiliate account is not approved", 403);
  }
  return affiliate;
};

exports.getProfile = (accountId) => getAffiliateOrThrow(accountId);
exports.updateProfile = async (accountId, payload) => {
  await getAffiliateOrThrow(accountId);
  return affiliateRepository.updateProfile(accountId, payload);
};
exports.submitKyc = async (accountId, payload) => {
  await getAffiliateOrThrow(accountId);
  return affiliateRepository.submitKyc(accountId, payload);
};
exports.addChannel = async (accountId, payload) => {
  await getAffiliateOrThrow(accountId);
  return affiliateRepository.createChannel(accountId, payload);
};
exports.addPaymentAccount = async (accountId, payload) => {
  await getAffiliateOrThrow(accountId);
  return affiliateRepository.createPaymentAccount(accountId, payload);
};
exports.getStats = async (accountId) => {
  await getApprovedAffiliateOrThrow(accountId);
  return affiliateRepository.getStats(accountId);
};
