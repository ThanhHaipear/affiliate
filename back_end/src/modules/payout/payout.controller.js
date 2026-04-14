const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const payoutService = require("./payout.service");

exports.listBatches = asyncHandler(async (_req, res) => {
  const data = await payoutService.listBatches();
  successResponse(res, data, "Payout batches loaded");
});

exports.createBatch = asyncHandler(async (req, res) => {
  const data = await payoutService.createBatch(req.user.id, req.validated.body);
  successResponse(res, data, "Payout batch created", 201);
});

exports.processBatch = asyncHandler(async (req, res) => {
  const data = await payoutService.processBatch(req.params.batchId, req.user.id, req.validated.body);
  successResponse(res, data, "Payout batch processed");
});
