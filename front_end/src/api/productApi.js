import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getProducts(params) {
  const response = await axiosClient.get("/api/products", { params });
  return unwrapResponseData(response);
}

async function getProductDetail(productIdOrSlug) {
  const response = await axiosClient.get(`/api/products/${productIdOrSlug}`);
  return unwrapResponseData(response);
}

async function getSellerProducts(params) {
  const response = await axiosClient.get("/api/seller/products", { params });
  return unwrapResponseData(response);
}

async function getSellerProductDetail(productId) {
  const response = await axiosClient.get(`/api/seller/products/${productId}`);
  return unwrapResponseData(response);
}

async function uploadSellerProductImages(files, scope = "product") {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("scope", scope);

  const response = await axiosClient.post("/api/uploads/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrapResponseData(response);
}

async function createSellerProduct(payload) {
  const response = await axiosClient.post("/api/products", payload);
  return unwrapResponseData(response);
}

async function updateSellerProduct(productId, payload) {
  const response = await axiosClient.put(`/api/products/${productId}`, payload);
  return unwrapResponseData(response);
}

async function getSellerAffiliateSettings() {
  const response = await axiosClient.get("/api/seller/affiliate-settings");
  return unwrapResponseData(response);
}

async function updateSellerAffiliateSetting(productId, payload) {
  const response = await axiosClient.put(`/api/seller/products/${productId}/affiliate-setting`, payload);
  return unwrapResponseData(response);
}

export {
  createSellerProduct,
  getProductDetail,
  getProducts,
  getSellerAffiliateSettings,
  getSellerProductDetail,
  getSellerProducts,
  updateSellerAffiliateSetting,
  updateSellerProduct,
  uploadSellerProductImages,
};
