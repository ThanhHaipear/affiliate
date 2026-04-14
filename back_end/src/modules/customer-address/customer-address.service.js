const AppError = require("../../utils/app-error");
const customerAddressRepository = require("./customer-address.repository");

function toAppError(error) {
  if (error.message === "Address not found") {
    return new AppError("Không tìm thấy địa chỉ giao hàng.", 404);
  }

  return new AppError(error.message || "Không xử lý được địa chỉ giao hàng.", 400);
}

exports.listAddresses = (accountId) => customerAddressRepository.listAddresses(accountId);

exports.createAddress = async (accountId, payload) => {
  try {
    return await customerAddressRepository.createAddress(accountId, payload);
  } catch (error) {
    throw toAppError(error);
  }
};

exports.updateAddress = async (accountId, addressId, payload) => {
  try {
    return await customerAddressRepository.updateAddress(accountId, addressId, payload);
  } catch (error) {
    throw toAppError(error);
  }
};

exports.deleteAddress = async (accountId, addressId) => {
  try {
    return await customerAddressRepository.deleteAddress(accountId, addressId);
  } catch (error) {
    throw toAppError(error);
  }
};

exports.setDefaultAddress = async (accountId, addressId) => {
  try {
    return await customerAddressRepository.setDefaultAddress(accountId, addressId);
  } catch (error) {
    throw toAppError(error);
  }
};
