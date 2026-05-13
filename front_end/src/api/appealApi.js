import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function createAppeal(payload) {
  const response = await axiosClient.post(ENDPOINTS.appeals.create, payload);
  return unwrapResponseData(response);
}

async function getMyAppeals() {
  const response = await axiosClient.get(ENDPOINTS.appeals.me);
  return unwrapResponseData(response);
}

async function getAppealDetail(appealId) {
  const response = await axiosClient.get(ENDPOINTS.appeals.detail(appealId));
  return unwrapResponseData(response);
}

async function sendAppealMessage(appealId, payload) {
  const response = await axiosClient.post(ENDPOINTS.appeals.sendMessage(appealId), payload);
  return unwrapResponseData(response);
}

async function getAdminAppeals(params) {
  const response = await axiosClient.get(ENDPOINTS.appeals.adminAll, { params });
  return unwrapResponseData(response);
}

async function adminReplyAppeal(appealId, payload) {
  const response = await axiosClient.post(ENDPOINTS.appeals.adminReply(appealId), payload);
  return unwrapResponseData(response);
}

export {
  createAppeal,
  getMyAppeals,
  getAppealDetail,
  sendAppealMessage,
  getAdminAppeals,
  adminReplyAppeal,
};
