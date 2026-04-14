import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getWalletSummary(params) {
  const response = await axiosClient.get("/api/wallets/me", { params });
  return unwrapResponseData(response);
}

async function getWithdrawalRequests(params) {
  const response = await axiosClient.get("/api/withdrawals/me", { params });
  return unwrapResponseData(response);
}

async function getWithdrawalRequestContext() {
  const response = await axiosClient.get("/api/withdrawals/me/context");
  return unwrapResponseData(response);
}

async function createWithdrawalRequest(payload) {
  const response = await axiosClient.post("/api/withdrawals", payload);
  return unwrapResponseData(response);
}

export { createWithdrawalRequest, getWalletSummary, getWithdrawalRequestContext, getWithdrawalRequests };
