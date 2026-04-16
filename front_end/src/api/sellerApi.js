import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
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
  const response = await axiosClient.get(ENDPOINTS.seller.profile);
  return unwrapResponseData(response);
}

async function getSellerStats() {
  const response = await axiosClient.get(ENDPOINTS.seller.stats);
  return unwrapResponseData(response);
}

async function updateSellerProfile(payload) {
  const response = await axiosClient.put(ENDPOINTS.seller.profile, payload);
  return unwrapResponseData(response);
}

async function getSellerOrders(params) {
  const response = await axiosClient.get(ENDPOINTS.orders.list, { params });
  return unwrapResponseData(response);
}

async function confirmSellerReceivedMoney(orderId) {
  const response = await axiosClient.post(ENDPOINTS.payments.sellerConfirm(orderId), {});
  return unwrapResponseData(response);
}

async function refundSellerOrder(orderId, payload) {
  const response = await axiosClient.post(ENDPOINTS.payments.refund(orderId), payload);
  return unwrapResponseData(response);
}

async function cancelSellerOrder(orderId, payload) {
  const response = await axiosClient.post(ENDPOINTS.payments.sellerCancel(orderId), payload || {});
  return unwrapResponseData(response);
}

async function getSellerWithdrawals(params) {
  const response = await axiosClient.get(ENDPOINTS.withdrawals.me, { params });
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
