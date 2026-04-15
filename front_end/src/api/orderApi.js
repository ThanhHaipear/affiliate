import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getCustomerOrders(params) {
  const response = await axiosClient.get("/api/orders", { params });
  return unwrapResponseData(response);
}

async function getCustomerOrderDetail(orderId) {
  const response = await axiosClient.get(`/api/orders/${orderId}`);
  return unwrapResponseData(response);
}

async function cancelCustomerOrder(orderId, payload) {
  const response = await axiosClient.post(`/api/payments/${orderId}/cancel`, payload || {});
  return unwrapResponseData(response);
}

async function getCart() {
  const response = await axiosClient.get("/api/cart");
  return unwrapResponseData(response);
}

async function updateCartItem(itemId, payload) {
  const requestPayload =
    payload === undefined && typeof itemId === "object" ? itemId : { ...payload, itemId };
  const response = await axiosClient.post("/api/cart/items", {
    ...requestPayload,
  });
  return unwrapResponseData(response);
}

async function setCartItemQuantity(itemId, payload) {
  const response = await axiosClient.put(`/api/cart/items/${itemId}`, payload);
  return unwrapResponseData(response);
}

async function removeCartItem(itemId) {
  const response = await axiosClient.delete(`/api/cart/items/${itemId}`);
  return unwrapResponseData(response);
}

async function createCheckoutOrder(payload) {
  const response = await axiosClient.post("/api/cart/checkout", payload);
  return unwrapResponseData(response);
}

async function createVnpayPaymentUrl(orderId, payload) {
  const response = await axiosClient.post(`/api/payments/${orderId}/vnpay-url`, payload || {});
  return unwrapResponseData(response);
}

async function confirmVnpayReturn(payload) {
  const response = await axiosClient.post("/api/payments/vnpay-return/confirm", payload);
  return unwrapResponseData(response);
}

export {
  createCheckoutOrder,
  createVnpayPaymentUrl,
  cancelCustomerOrder,
  confirmVnpayReturn,
  getCart,
  getCustomerOrderDetail,
  getCustomerOrders,
  removeCartItem,
  setCartItemQuantity,
  updateCartItem,
};
