import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function getWalletSummary(params) {
  const response = await axiosClient.get(ENDPOINTS.wallets.me, { params });
  return unwrapResponseData(response);
}

async function getWithdrawalRequests(params) {
  const response = await axiosClient.get(ENDPOINTS.withdrawals.me, { params });
  return unwrapResponseData(response);
}

async function getWithdrawalRequestContext() {
  const response = await axiosClient.get(ENDPOINTS.withdrawals.context);
  return unwrapResponseData(response);
}

async function createWithdrawalRequest(payload) {
  const response = await axiosClient.post(ENDPOINTS.withdrawals.create, payload);
  return unwrapResponseData(response);
}

export { createWithdrawalRequest, getWalletSummary, getWithdrawalRequestContext, getWithdrawalRequests };
