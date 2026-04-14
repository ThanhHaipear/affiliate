const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const customerAddressService = require("./customer-address.service");

exports.listAddresses = asyncHandler(async (req, res) => {
  const data = await customerAddressService.listAddresses(req.user.id);
  successResponse(res, data, "Loaded customer addresses");
});

exports.createAddress = asyncHandler(async (req, res) => {
  const data = await customerAddressService.createAddress(req.user.id, req.validated.body);
  successResponse(res, data, "Created customer address", 201);
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const data = await customerAddressService.updateAddress(req.user.id, req.validated.params.addressId, req.validated.body);
  successResponse(res, data, "Updated customer address");
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const data = await customerAddressService.deleteAddress(req.user.id, req.validated.params.addressId);
  successResponse(res, data, "Deleted customer address");
});

exports.setDefaultAddress = asyncHandler(async (req, res) => {
  const data = await customerAddressService.setDefaultAddress(req.user.id, req.validated.params.addressId);
  successResponse(res, data, "Updated default customer address");
});
