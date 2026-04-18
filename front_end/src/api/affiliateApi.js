import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function getAffiliateOverview() {
  const response = await axiosClient.get(ENDPOINTS.affiliate.stats);
  return unwrapResponseData(response);
}

async function getAffiliateProfile() {
  const response = await axiosClient.get(ENDPOINTS.affiliate.profile);
  return unwrapResponseData(response);
}

async function updateAffiliateProfile(payload) {
  const response = await axiosClient.put(ENDPOINTS.affiliate.profile, payload);
  return unwrapResponseData(response);
}

async function uploadAffiliateAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("scope", "avatar");

  const response = await axiosClient.post(ENDPOINTS.uploads.images, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const data = unwrapResponseData(response);
  return Array.isArray(data) ? data[0] : data;
}

async function addAffiliateChannel(payload) {
  const response = await axiosClient.post(ENDPOINTS.affiliate.channels, payload);
  return unwrapResponseData(response);
}

async function addAffiliatePaymentAccount(payload) {
  const response = await axiosClient.post(ENDPOINTS.affiliate.paymentAccounts, payload);
  return unwrapResponseData(response);
}

async function getAffiliateMarketplaceProducts(params) {
  const response = await axiosClient.get(ENDPOINTS.products.list, { params });
  return unwrapResponseData(response);
}

async function createAffiliateLink(payload) {
  const response = await axiosClient.post(ENDPOINTS.tracking.links, payload);
  return unwrapResponseData(response);
}

async function revokeAffiliateLink(linkId) {
  const response = await axiosClient.patch(ENDPOINTS.tracking.linkRevoke(linkId));
  return unwrapResponseData(response);
}

async function unrevokeAffiliateLink(linkId) {
  const response = await axiosClient.patch(ENDPOINTS.tracking.linkUnrevoke(linkId));
  return unwrapResponseData(response);
}

async function getAffiliateLinks(params) {
  const response = await axiosClient.get(ENDPOINTS.tracking.links, { params });
  return unwrapResponseData(response);
}

async function getAffiliateCommissions(params) {
  const response = await axiosClient.get(ENDPOINTS.commissions.me, { params });
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
  unrevokeAffiliateLink,
  updateAffiliateProfile,
  uploadAffiliateAvatar,
};
