const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const paymentService = require("./payment.service");

exports.payOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.payOrder(req.user.id, req.params.orderId, req.validated.body);
  successResponse(res, data, "Order paid");
});

exports.createVnpayPaymentUrl = asyncHandler(async (req, res) => {
  const data = await paymentService.createVnpayPaymentUrl(req.user.id, req.params.orderId, req.validated.body, req);
  successResponse(res, data, "VNPAY payment URL created");
});

exports.confirmVnpayReturn = asyncHandler(async (req, res) => {
  const data = await paymentService.confirmVnpayReturn(req.validated.body);
  successResponse(res, data, "VNPAY return verified");
});

exports.handleVnpayIpn = asyncHandler(async (req, res) => {
  const data = await paymentService.handleVnpayIpn(req.query);
  res.status(200).json(data);
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

exports.cancelOrderBySeller = asyncHandler(async (req, res) => {
  const data = await paymentService.cancelOrderBySeller(req.user.id, req.params.orderId, req.validated.body);
  successResponse(res, data, "Order cancelled");
});
