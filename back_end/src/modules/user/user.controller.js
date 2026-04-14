const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const userService = require("./user.service");

exports.getProfile = asyncHandler(async (req, res) => {
  const data = await userService.getProfile(req.user.id);
  successResponse(res, data, "Customer profile loaded");
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const data = await userService.updateProfile(req.user.id, req.validated.body);
  successResponse(res, data, "Customer profile updated");
});
