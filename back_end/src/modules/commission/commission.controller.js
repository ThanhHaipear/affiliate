const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const commissionService = require("./commission.service");

exports.listMyCommissions = asyncHandler(async (req, res) => {
  const data = await commissionService.listMyCommissions(req.user.id, req.user.roles);
  successResponse(res, data, "Commissions loaded");
});
