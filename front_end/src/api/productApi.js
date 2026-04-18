import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function getProducts(params) {
  const response = await axiosClient.get(ENDPOINTS.products.list, { params });
  return unwrapResponseData(response);
}

async function getProductDetail(productIdOrSlug) {
  const response = await axiosClient.get(ENDPOINTS.products.detail(productIdOrSlug));
  return unwrapResponseData(response);
}

async function getProductReviews(productId) {
  const response = await axiosClient.get(ENDPOINTS.products.reviews(productId));
  return unwrapResponseData(response);
}

async function createProductReview(productId, payload) {
  const response = await axiosClient.post(ENDPOINTS.products.reviews(productId), payload);
  return unwrapResponseData(response);
}

async function getSellerProducts(params) {
  const response = await axiosClient.get(ENDPOINTS.seller.products, { params });
  return unwrapResponseData(response);
}

async function getSellerProductDetail(productId) {
  const response = await axiosClient.get(ENDPOINTS.seller.productDetail(productId));
  return unwrapResponseData(response);
}

async function setSellerProductVisibility(productId, payload) {
  const response = await axiosClient.patch(ENDPOINTS.seller.productVisibility(productId), payload);
  return unwrapResponseData(response);
}

async function uploadSellerProductImages(files, scope = "product") {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("scope", scope);

  const response = await axiosClient.post(ENDPOINTS.uploads.images, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrapResponseData(response);
}

async function createSellerProduct(payload) {
  const response = await axiosClient.post(ENDPOINTS.products.list, payload);
  return unwrapResponseData(response);
}

async function updateSellerProduct(productId, payload) {
  const response = await axiosClient.put(ENDPOINTS.products.detail(productId), payload);
  return unwrapResponseData(response);
}

async function getSellerAffiliateSettings() {
  const response = await axiosClient.get(ENDPOINTS.seller.affiliateSettings);
  return unwrapResponseData(response);
}

async function updateSellerAffiliateSetting(productId, payload) {
  const response = await axiosClient.put(ENDPOINTS.seller.productAffiliateSetting(productId), payload);
  return unwrapResponseData(response);
}

export {
  createProductReview,
  createSellerProduct,
  getProductDetail,
  getProducts,
  getProductReviews,
  getSellerAffiliateSettings,
  getSellerProductDetail,
  getSellerProducts,
  setSellerProductVisibility,
  updateSellerAffiliateSetting,
  updateSellerProduct,
  uploadSellerProductImages,
};
