const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const sellerService = require("./seller.service");

exports.getProfile = asyncHandler(async (req, res) => {
  const data = await sellerService.getProfile(req.user.id);
  successResponse(res, data, "Seller profile loaded");
});

exports.listOrders = asyncHandler(async (req, res) => {
  const data = await sellerService.listOrders(req.user.id);
  successResponse(res, data, "Seller orders loaded");
});

exports.listProducts = asyncHandler(async (req, res) => {
  const data = await sellerService.listProducts(req.user.id);
  successResponse(res, data, "Seller products loaded");
});

exports.getProduct = asyncHandler(async (req, res) => {
  const data = await sellerService.getProduct(req.user.id, req.params.productId);
  successResponse(res, data, "Seller product loaded");
});

exports.listAffiliateSettings = asyncHandler(async (req, res) => {
  const data = await sellerService.listAffiliateSettings(req.user.id);
  successResponse(res, data, "Seller affiliate settings loaded");
});

exports.getStats = asyncHandler(async (req, res) => {
  const data = await sellerService.getStats(req.user.id);
  successResponse(res, data, "Seller stats loaded");
});

exports.upsertProfile = asyncHandler(async (req, res) => {
  const data = await sellerService.upsertProfile(req.user.id, req.validated.body);
  successResponse(res, data, "Seller profile saved");
});

exports.submitKyc = asyncHandler(async (req, res) => {
  const data = await sellerService.submitKyc(req.user.id, req.validated.body);
  successResponse(res, data, "Seller KYC submitted");
});

exports.addPaymentAccount = asyncHandler(async (req, res) => {
  const data = await sellerService.addPaymentAccount(req.user.id, req.validated.body);
  successResponse(res, data, "Seller payment account created", 201);
});

exports.upsertProductAffiliateSetting = asyncHandler(async (req, res) => {
  const data = await sellerService.upsertProductAffiliateSetting(req.user.id, req.params.productId, req.validated.body);
  successResponse(res, data, "Product affiliate setting saved");
});
