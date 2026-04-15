import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";
import { getWalletSummary } from "./walletApi";

async function getSellerOverview() {
  const [profile, orders, wallets] = await Promise.all([
    getSellerProfile(),
    getSellerOrders(),
    getWalletSummary(),
  ]);

  return {
    profile,
    orders,
    wallets,
  };
}

async function getSellerProfile() {
  const response = await axiosClient.get("/api/seller/profile");
  return unwrapResponseData(response);
}

async function getSellerStats() {
  const response = await axiosClient.get("/api/seller/stats");
  return unwrapResponseData(response);
}

async function updateSellerProfile(payload) {
  const response = await axiosClient.put("/api/seller/profile", payload);
  return unwrapResponseData(response);
}

async function getSellerOrders(params) {
  const response = await axiosClient.get("/api/orders", { params });
  return unwrapResponseData(response);
}

async function confirmSellerReceivedMoney(orderId) {
  const response = await axiosClient.post(`/api/payments/${orderId}/seller-confirm`, {});
  return unwrapResponseData(response);
}

async function refundSellerOrder(orderId, payload) {
  const response = await axiosClient.post(`/api/payments/${orderId}/refund`, payload);
  return unwrapResponseData(response);
}

async function cancelSellerOrder(orderId, payload) {
  const response = await axiosClient.post(`/api/payments/${orderId}/seller-cancel`, payload || {});
  return unwrapResponseData(response);
}

async function getSellerWithdrawals(params) {
  const response = await axiosClient.get("/api/withdrawals/me", { params });
  return unwrapResponseData(response);
}

export {
  confirmSellerReceivedMoney,
  cancelSellerOrder,
  getSellerOrders,
  getSellerOverview,
  getSellerProfile,
  getSellerStats,
  getSellerWithdrawals,
  refundSellerOrder,
  updateSellerProfile,
};
