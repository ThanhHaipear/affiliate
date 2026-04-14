const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const orderService = require("./order.service");

exports.listOrders = asyncHandler(async (req, res) => {
  const data = await orderService.listOrders(req.user.id, req.user.roles);
  successResponse(res, data, "Orders loaded");
});

exports.getOrder = asyncHandler(async (req, res) => {
  const data = await orderService.getOrder(req.params.orderId);
  successResponse(res, data, "Order loaded");
});
