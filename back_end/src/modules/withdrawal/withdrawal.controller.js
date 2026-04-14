const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const withdrawalService = require("./withdrawal.service");

exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const data = await withdrawalService.requestWithdrawal(req.user.id, req.user.roles, req.validated.body);
  successResponse(res, data, "Withdrawal requested", 201);
});

exports.listMyWithdrawals = asyncHandler(async (req, res) => {
  const data = await withdrawalService.listMyWithdrawals(req.user.id, req.user.roles);
  successResponse(res, data, "Withdrawals loaded");
});

exports.getMyWithdrawalContext = asyncHandler(async (req, res) => {
  const data = await withdrawalService.getMyWithdrawalContext(req.user.id, req.user.roles);
  successResponse(res, data, "Withdrawal context loaded");
});

exports.listPendingWithdrawals = asyncHandler(async (_req, res) => {
  const data = await withdrawalService.listPendingWithdrawals();
  successResponse(res, data, "Pending withdrawals loaded");
});

exports.listAdminWithdrawals = asyncHandler(async (req, res) => {
  const data = await withdrawalService.listAdminWithdrawals(req.validated.query);
  successResponse(res, data, "Admin withdrawals loaded");
});

exports.getAdminWithdrawalSummary = asyncHandler(async (_req, res) => {
  const data = await withdrawalService.getAdminWithdrawalSummary();
  successResponse(res, data, "Withdrawal summary loaded");
});

exports.reviewWithdrawal = asyncHandler(async (req, res) => {
  const data = await withdrawalService.reviewWithdrawal(req.validated.params.withdrawalId, req.user.id, req.validated.body);
  successResponse(res, data, "Withdrawal reviewed");
});
