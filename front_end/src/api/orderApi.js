import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function getCustomerOrders(params) {
  const response = await axiosClient.get(ENDPOINTS.orders.list, { params });
  return unwrapResponseData(response);
}

async function getCustomerOrderDetail(orderId) {
  const response = await axiosClient.get(ENDPOINTS.orders.detail(orderId));
  return unwrapResponseData(response);
}

async function cancelCustomerOrder(orderId, payload) {
  const response = await axiosClient.post(ENDPOINTS.payments.cancel(orderId), payload || {});
  return unwrapResponseData(response);
}

async function getCart() {
  const response = await axiosClient.get(ENDPOINTS.cart.root);
  return unwrapResponseData(response);
}

async function updateCartItem(itemId, payload) {
  const requestPayload =
    payload === undefined && typeof itemId === "object" ? itemId : { ...payload, itemId };
  const response = await axiosClient.post(ENDPOINTS.cart.items, {
    ...requestPayload,
  });
  return unwrapResponseData(response);
}

async function setCartItemQuantity(itemId, payload) {
  const response = await axiosClient.put(ENDPOINTS.cart.itemDetail(itemId), payload);
  return unwrapResponseData(response);
}

async function removeCartItem(itemId) {
  const response = await axiosClient.delete(ENDPOINTS.cart.itemDetail(itemId));
  return unwrapResponseData(response);
}

async function createCheckoutOrder(payload) {
  const response = await axiosClient.post(ENDPOINTS.cart.checkout, payload);
  return unwrapResponseData(response);
}

async function createVnpayPaymentUrl(orderId, payload) {
  const response = await axiosClient.post(ENDPOINTS.payments.vnpayUrl(orderId), payload || {});
  return unwrapResponseData(response);
}

async function confirmVnpayReturn(payload) {
  const response = await axiosClient.post(ENDPOINTS.payments.vnpayReturnConfirm, payload);
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
