const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const appealService = require("./appeal.service");

exports.createAppeal = asyncHandler(async (req, res) => {
  const data = await appealService.createAppeal(req.user.id, req.validated.body);
  successResponse(res, data, "Kiến nghị đã được tạo", 201);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const data = await appealService.sendMessage(req.user.id, req.params.appealId, req.validated.body);
  successResponse(res, data, "Tin nhắn đã được gửi");
});

exports.getMyAppeals = asyncHandler(async (req, res) => {
  const data = await appealService.getMyAppeals(req.user.id);
  successResponse(res, data, "Danh sách kiến nghị");
});

exports.getAppeal = asyncHandler(async (req, res) => {
  const data = await appealService.getAppealById(req.params.appealId);
  successResponse(res, data, "Chi tiết kiến nghị");
});

exports.adminGetAllAppeals = asyncHandler(async (req, res) => {
  const data = await appealService.getAllAppeals(req.query || {});
  successResponse(res, data, "Danh sách kiến nghị (admin)");
});

exports.adminReply = asyncHandler(async (req, res) => {
  const data = await appealService.adminReply(req.user.id, req.params.appealId, req.validated.body);
  successResponse(res, data, "Phản hồi kiến nghị thành công");
});
