const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const { buildAuditData } = require("../../utils/audit");
const trackingService = require("./tracking.service");

exports.listLinks = asyncHandler(async (req, res) => {
  const data = await trackingService.listLinks(req.user.id);
  successResponse(res, data, "Affiliate links loaded");
});

exports.createLink = asyncHandler(async (req, res) => {
  const data = await trackingService.createLink(req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate link ready", 201);
});

exports.revokeLink = asyncHandler(async (req, res) => {
  const data = await trackingService.revokeLink(req.user.id, req.validated.params.linkId);
  successResponse(res, data, "Affiliate link revoked");
});

exports.trackClick = asyncHandler(async (req, res) => {
  const data = await trackingService.trackClick(req.validated.body, buildAuditData(req));
  successResponse(res, data, "Click tracked", 201);
});
