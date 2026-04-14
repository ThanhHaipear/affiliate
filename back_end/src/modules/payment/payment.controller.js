const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const paymentService = require("./payment.service");

exports.payOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.payOrder(req.user.id, req.params.orderId, req.validated.body);
  successResponse(res, data, "Order paid");
});

exports.confirmSellerReceivedMoney = asyncHandler(async (req, res) => {
  const data = await paymentService.confirmSellerReceivedMoney(req.user.id, req.params.orderId, req.validated.body);
  successResponse(res, data, "Seller settlement completed");
});

exports.refundOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.refundOrder(req.user.id, req.params.orderId, req.validated.body);
  successResponse(res, data, "Order refunded");
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.cancelOrder(req.user.id, req.params.orderId, req.validated.body);
  successResponse(res, data, "Order cancelled");
});
