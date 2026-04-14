const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const affiliateService = require("./affiliate.service");

exports.getProfile = asyncHandler(async (req, res) => {
  const data = await affiliateService.getProfile(req.user.id);
  successResponse(res, data, "Affiliate profile loaded");
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const data = await affiliateService.updateProfile(req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate profile updated");
});

exports.submitKyc = asyncHandler(async (req, res) => {
  const data = await affiliateService.submitKyc(req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate KYC submitted");
});

exports.addChannel = asyncHandler(async (req, res) => {
  const data = await affiliateService.addChannel(req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate channel created", 201);
});

exports.addPaymentAccount = asyncHandler(async (req, res) => {
  const data = await affiliateService.addPaymentAccount(req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate payment account created", 201);
});

exports.getStats = asyncHandler(async (req, res) => {
  const data = await affiliateService.getStats(req.user.id);
  successResponse(res, data, "Affiliate stats loaded");
});
