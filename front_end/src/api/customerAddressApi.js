import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getCustomerAddresses() {
  const response = await axiosClient.get("/api/customer-addresses");
  return unwrapResponseData(response);
}

async function createCustomerAddress(payload) {
  const response = await axiosClient.post("/api/customer-addresses", payload);
  return unwrapResponseData(response);
}

async function updateCustomerAddress(addressId, payload) {
  const response = await axiosClient.put(`/api/customer-addresses/${addressId}`, payload);
  return unwrapResponseData(response);
}

async function deleteCustomerAddress(addressId) {
  const response = await axiosClient.delete(`/api/customer-addresses/${addressId}`);
  return unwrapResponseData(response);
}

async function setDefaultCustomerAddress(addressId) {
  const response = await axiosClient.patch(`/api/customer-addresses/${addressId}/default`);
  return unwrapResponseData(response);
}

export {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
};
