import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getAdminOverview() {
  const response = await axiosClient.get("/api/admin/dashboard");
  return unwrapResponseData(response);
}

async function getAdminUsers(params) {
  const response = await axiosClient.get("/api/admin/accounts", { params });
  return unwrapResponseData(response);
}

async function lockUser(userId, payload) {
  const response = await axiosClient.patch(`/api/admin/accounts/${userId}/lock`, payload || {});
  return unwrapResponseData(response);
}

async function unlockUser(userId) {
  const response = await axiosClient.patch(`/api/admin/accounts/${userId}/unlock`);
  return unwrapResponseData(response);
}

async function approveSeller(sellerId) {
  const response = await axiosClient.patch(`/api/admin/sellers/${sellerId}/review`, {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectSeller(sellerId, payload) {
  const response = await axiosClient.patch(`/api/admin/sellers/${sellerId}/review`, {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function approveAffiliate(affiliateId) {
  const response = await axiosClient.patch(`/api/admin/affiliates/${affiliateId}/review`, {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectAffiliate(affiliateId, payload) {
  const response = await axiosClient.patch(`/api/admin/affiliates/${affiliateId}/review`, {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function approveProduct(productId) {
  const response = await axiosClient.patch(`/api/admin/products/${productId}/review`, {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectProduct(productId, payload) {
  const response = await axiosClient.patch(`/api/admin/products/${productId}/review`, {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function approveAffiliateSetting(settingId) {
  const response = await axiosClient.patch(`/api/admin/product-affiliate-settings/${settingId}/review`, {
    status: "APPROVED",
  });
  return unwrapResponseData(response);
}

async function rejectAffiliateSetting(settingId, payload) {
  const response = await axiosClient.patch(`/api/admin/product-affiliate-settings/${settingId}/review`, {
    status: "REJECTED",
    rejectReason: payload?.rejectReason || "",
  });
  return unwrapResponseData(response);
}

async function getAdminOrders(params) {
  const response = await axiosClient.get("/api/admin/orders", { params });
  return unwrapResponseData(response);
}

async function getAdminFinancialStats(params) {
  const response = await axiosClient.get("/api/admin/financial-stats", { params });
  return unwrapResponseData(response);
}

async function updatePlatformFee(payload) {
  const response = await axiosClient.put("/api/admin/settings/platform-fee", payload);
  return unwrapResponseData(response);
}

async function updateWithdrawalConfig(payload) {
  const response = await axiosClient.put("/api/admin/settings/withdrawal-config", payload);
  return unwrapResponseData(response);
}

async function getAdminSettings() {
  const response = await axiosClient.get("/api/admin/settings");
  return unwrapResponseData(response);
}

async function getPayoutBatches(params) {
  const response = await axiosClient.get("/api/payout-batches", { params });
  return unwrapResponseData(response);
}

async function getPendingWithdrawals(params) {
  const response = await axiosClient.get("/api/withdrawals/pending/list", { params });
  return unwrapResponseData(response);
}

async function getAdminWithdrawals(params) {
  const response = await axiosClient.get("/api/withdrawals/admin/list", { params });
  return unwrapResponseData(response);
}

async function getAdminWithdrawalSummary() {
  const response = await axiosClient.get("/api/withdrawals/admin/summary");
  return unwrapResponseData(response);
}

async function reviewWithdrawal(withdrawalId, payload) {
  const response = await axiosClient.patch(`/api/withdrawals/${withdrawalId}/review`, payload);
  return unwrapResponseData(response);
}

async function reviewRefundRequest(refundId, payload) {
  const response = await axiosClient.patch(`/api/admin/refunds/${refundId}/review`, payload);
  return unwrapResponseData(response);
}

async function getFraudAlerts(params) {
  const response = await axiosClient.get("/api/admin/fraud-alerts", { params });
  return unwrapResponseData(response);
}

export {
  approveAffiliate,
  approveAffiliateSetting,
  approveProduct,
  approveSeller,
  getAdminFinancialStats,
  getAdminOrders,
  getAdminOverview,
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
  reviewWithdrawal,
  unlockUser,
  updatePlatformFee,
  updateWithdrawalConfig,
};
