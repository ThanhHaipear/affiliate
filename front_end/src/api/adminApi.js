import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function getAdminOverview() {
  const response = await axiosClient.get(ENDPOINTS.admin.dashboard);
  return unwrapResponseData(response);
}

async function getAdminProducts(params) {
  const response = await axiosClient.get(ENDPOINTS.admin.products, { params });
  return unwrapResponseData(response);
}

async function getAdminCategories() {
  const response = await axiosClient.get(ENDPOINTS.admin.categories);
  return unwrapResponseData(response);
}

async function createAdminCategory(payload) {
  const response = await axiosClient.post(ENDPOINTS.admin.categories, payload);
  return unwrapResponseData(response);
}

async function getAdminProductDetail(productId) {
  const response = await axiosClient.get(ENDPOINTS.admin.productDetail(productId));
  return unwrapResponseData(response);
}

async function setAdminProductVisibility(productId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.productVisibility(productId), payload);
  return unwrapResponseData(response);
}

async function getAdminUsers(params) {
  const response = await axiosClient.get(ENDPOINTS.admin.accounts, { params });
  return unwrapResponseData(response);
}

async function lockUser(userId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.accountLock(userId), payload || {});
  return unwrapResponseData(response);
}

async function unlockUser(userId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.accountUnlock(userId), {});
  return unwrapResponseData(response);
}

async function unlockUserByTarget(userId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.accountUnlock(userId), payload || {});
  return unwrapResponseData(response);
}

async function approveSeller(sellerId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.sellerReview(sellerId), {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectSeller(sellerId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.sellerReview(sellerId), {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function approveAffiliate(affiliateId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.affiliateReview(affiliateId), {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectAffiliate(affiliateId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.affiliateReview(affiliateId), {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function approveProduct(productId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.productReview(productId), {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectProduct(productId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.productReview(productId), {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function approveAffiliateSetting(settingId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.productAffiliateReview(settingId), {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectAffiliateSetting(settingId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.productAffiliateReview(settingId), {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function getAdminOrders(params) {
  const response = await axiosClient.get(ENDPOINTS.admin.orders, { params });
  return unwrapResponseData(response);
}

async function getAdminFinancialStats(params) {
  const response = await axiosClient.get(ENDPOINTS.admin.financialStats, { params });
  return unwrapResponseData(response);
}

async function updatePlatformFee(payload) {
  const response = await axiosClient.put(ENDPOINTS.admin.platformFee, payload);
  return unwrapResponseData(response);
}

async function updateWithdrawalConfig(payload) {
  const response = await axiosClient.put(ENDPOINTS.admin.withdrawalConfig, payload);
  return unwrapResponseData(response);
}

async function getAdminSettings() {
  const response = await axiosClient.get(ENDPOINTS.admin.settings);
  return unwrapResponseData(response);
}

async function getPayoutBatches(params) {
  const response = await axiosClient.get(ENDPOINTS.payoutBatches.list, { params });
  return unwrapResponseData(response);
}

async function createPayoutBatch(payload) {
  const response = await axiosClient.post(ENDPOINTS.payoutBatches.create, payload);
  return unwrapResponseData(response);
}

async function createPayoutBatchVnpayUrl(batchId, payload) {
  const response = await axiosClient.post(ENDPOINTS.payoutBatches.vnpayUrl(batchId), payload || {});
  return unwrapResponseData(response);
}

async function confirmPayoutBatchVnpayReturn(payload) {
  const response = await axiosClient.post(ENDPOINTS.payoutBatches.vnpayReturnConfirm, payload);
  return unwrapResponseData(response);
}

async function getPendingWithdrawals(params) {
  const response = await axiosClient.get(ENDPOINTS.withdrawals.pendingList, { params });
  return unwrapResponseData(response);
}

async function getAdminWithdrawals(params) {
  const response = await axiosClient.get(ENDPOINTS.withdrawals.adminList, { params });
  return unwrapResponseData(response);
}

async function getAdminWithdrawalSummary() {
  const response = await axiosClient.get(ENDPOINTS.withdrawals.adminSummary);
  return unwrapResponseData(response);
}

async function reviewWithdrawal(withdrawalId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.withdrawals.review(withdrawalId), payload);
  return unwrapResponseData(response);
}

async function reviewRefundRequest(refundId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.admin.refundsReview(refundId), payload);
  return unwrapResponseData(response);
}

async function getFraudAlerts(params) {
  const response = await axiosClient.get(ENDPOINTS.admin.fraudAlerts, { params });
  return unwrapResponseData(response);
}

async function getAdminAffiliateLinks(params) {
  const response = await axiosClient.get(ENDPOINTS.admin.affiliateLinks, { params });
  return unwrapResponseData(response);
}

async function revokeAdminAffiliateLink(linkId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.affiliateLinkRevoke(linkId), {});
  return unwrapResponseData(response);
}

async function unrevokeAdminAffiliateLink(linkId) {
  const response = await axiosClient.patch(ENDPOINTS.admin.affiliateLinkUnrevoke(linkId), {});
  return unwrapResponseData(response);
}

export {
  approveAffiliate,
  approveAffiliateSetting,
  approveProduct,
  approveSeller,
  confirmPayoutBatchVnpayReturn,
  createAdminCategory,
  createPayoutBatch,
  createPayoutBatchVnpayUrl,
  getAdminCategories,
  getAdminFinancialStats,
  getAdminAffiliateLinks,
  getAdminOrders,
  getAdminOverview,
  getAdminProducts,
  getAdminProductDetail,
  getAdminSettings,
  getAdminUsers,
  getAdminWithdrawalSummary,
  getAdminWithdrawals,
  getFraudAlerts,
  getPayoutBatches,
  getPendingWithdrawals,
  lockUser,
  rejectAffiliate,
  rejectAffiliateSetting,
  rejectProduct,
  rejectSeller,
  reviewRefundRequest,
  revokeAdminAffiliateLink,
  unrevokeAdminAffiliateLink,
  reviewWithdrawal,
  setAdminProductVisibility,
  unlockUser,
  unlockUserByTarget,
  updatePlatformFee,
  updateWithdrawalConfig,
};
