import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getAffiliateOverview() {
  const response = await axiosClient.get("/api/affiliate/stats");
  return unwrapResponseData(response);
}

async function getAffiliateProfile() {
  const response = await axiosClient.get("/api/affiliate/profile");
  return unwrapResponseData(response);
}

async function updateAffiliateProfile(payload) {
  const response = await axiosClient.put("/api/affiliate/profile", payload);
  return unwrapResponseData(response);
}

async function uploadAffiliateAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("scope", "avatar");

  const response = await axiosClient.post("/api/uploads/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const data = unwrapResponseData(response);
  return Array.isArray(data) ? data[0] : data;
}

async function addAffiliateChannel(payload) {
  const response = await axiosClient.post("/api/affiliate/channels", payload);
  return unwrapResponseData(response);
}

async function addAffiliatePaymentAccount(payload) {
  const response = await axiosClient.post("/api/affiliate/payment-accounts", payload);
  return unwrapResponseData(response);
}

async function getAffiliateMarketplaceProducts(params) {
  const response = await axiosClient.get("/api/products", { params });
  return unwrapResponseData(response);
}

async function createAffiliateLink(payload) {
  const response = await axiosClient.post("/api/tracking/links", payload);
  return unwrapResponseData(response);
}

async function revokeAffiliateLink(linkId) {
  const response = await axiosClient.patch(`/api/tracking/links/${linkId}/revoke`);
  return unwrapResponseData(response);
}

async function getAffiliateLinks(params) {
  const response = await axiosClient.get("/api/tracking/links", { params });
  return unwrapResponseData(response);
}

async function getAffiliateCommissions(params) {
  const response = await axiosClient.get("/api/commissions/me", { params });
  return unwrapResponseData(response);
}

export {
  addAffiliateChannel,
  addAffiliatePaymentAccount,
  createAffiliateLink,
  getAffiliateCommissions,
  getAffiliateLinks,
  getAffiliateMarketplaceProducts,
  getAffiliateOverview,
  getAffiliateProfile,
  revokeAffiliateLink,
  updateAffiliateProfile,
  uploadAffiliateAvatar,
};
