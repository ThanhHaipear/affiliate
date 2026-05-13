const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const adminService = require("./admin.service");

exports.getDashboard = asyncHandler(async (_req, res) => {
  const data = await adminService.getDashboard();
  successResponse(res, data, "Admin dashboard loaded");
});

exports.getAccounts = asyncHandler(async (req, res) => {
  const data = await adminService.getAccounts(req.validated?.query || req.query || {});
  successResponse(res, data, "Admin accounts loaded");
});

exports.getProducts = asyncHandler(async (req, res) => {
  const data = await adminService.getProducts(req.validated?.query || req.query || {});
  successResponse(res, data, "Admin products loaded");
});

exports.getCategories = asyncHandler(async (_req, res) => {
  const data = await adminService.getCategories();
  successResponse(res, data, "Admin categories loaded");
});

exports.createCategory = asyncHandler(async (req, res) => {
  const data = await adminService.createCategory(req.user.id, req.validated?.body || req.body || {});
  successResponse(res, data, "Category created", 201);
});

exports.lockAccount = asyncHandler(async (req, res) => {
  const data = await adminService.lockAccount(req.params.accountId, req.user.id, req.validated?.body || req.body || {});
  successResponse(res, data, "Account locked");
});

exports.unlockAccount = asyncHandler(async (req, res) => {
  const data = await adminService.unlockAccount(req.params.accountId, req.user.id, req.validated?.body || req.body || {});
  successResponse(res, data, "Account unlocked");
});

exports.getOrders = asyncHandler(async (req, res) => {
  const data = await adminService.getOrders(req.validated?.query || req.query || {});
  successResponse(res, data, "Admin orders loaded");
});

exports.getFinancialStats = asyncHandler(async (req, res) => {
  const data = await adminService.getFinancialStats(req.validated?.query || req.query || {});
  successResponse(res, data, "Admin financial stats loaded");
});

exports.getFraudAlerts = asyncHandler(async (req, res) => {
  const data = await adminService.getFraudAlerts(req.validated?.query || req.query || {});
  successResponse(res, data, "Fraud alerts loaded");
});

exports.getAffiliateLinks = asyncHandler(async (req, res) => {
  const data = await adminService.getAffiliateLinks(req.validated?.query || req.query || {});
  successResponse(res, data, "Admin affiliate links loaded");
});

exports.getPlatformSettings = asyncHandler(async (_req, res) => {
  const data = await adminService.getPlatformSettings();
  successResponse(res, data, "Admin settings loaded");
});

exports.updatePlatformFee = asyncHandler(async (req, res) => {
  const data = await adminService.updatePlatformFee(req.user.id, req.validated?.body || req.body || {});
  successResponse(res, data, "Platform fee updated");
});

exports.updateWithdrawalConfig = asyncHandler(async (req, res) => {
  const data = await adminService.updateWithdrawalConfig(req.user.id, req.validated?.body || req.body || {});
  successResponse(res, data, "Withdrawal config updated");
});

exports.reviewSeller = asyncHandler(async (req, res) => {
  const data = await adminService.reviewSeller(req.params.sellerId, req.user.id, req.validated.body);
  successResponse(res, data, "Seller reviewed");
});

exports.reviewAffiliate = asyncHandler(async (req, res) => {
  const data = await adminService.reviewAffiliate(req.params.affiliateId, req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate reviewed");
});

exports.reviewProduct = asyncHandler(async (req, res) => {
  const data = await adminService.reviewProduct(req.params.productId, req.user.id, req.validated.body);
  successResponse(res, data, "Product reviewed");
});

exports.getProduct = asyncHandler(async (req, res) => {
  const data = await adminService.getProductById(req.params.productId);
  successResponse(res, data, "Admin product loaded");
});

exports.setProductVisibility = asyncHandler(async (req, res) => {
  const data = await adminService.setProductVisibility(req.params.productId, req.user.id, req.validated.body);
  successResponse(res, data, "Product visibility updated");
});

exports.reviewProductAffiliate = asyncHandler(async (req, res) => {
  const data = await adminService.reviewProductAffiliate(req.params.settingId, req.user.id, req.validated.body);
  successResponse(res, data, "Product affiliate setting reviewed");
});

exports.reviewRefund = asyncHandler(async (req, res) => {
  const data = await adminService.reviewRefund(req.params.refundId, req.user.id, req.validated.body);
  successResponse(res, data, "Refund request reviewed");
});

exports.revokeAffiliateLink = asyncHandler(async (req, res) => {
  const data = await adminService.revokeAffiliateLink(req.params.linkId, req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate link revoked by admin");
});

exports.unrevokeAffiliateLink = asyncHandler(async (req, res) => {
  const data = await adminService.unrevokeAffiliateLink(req.params.linkId, req.user.id);
  successResponse(res, data, "Affiliate link reactivated by admin");
});
