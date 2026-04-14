const AppError = require("../../utils/app-error");
const orderRepository = require("./order.repository");

exports.listOrders = (accountId, roles) => orderRepository.listOrders(accountId, roles);
exports.getOrder = async (orderId) => {
  const order = await orderRepository.getOrder(orderId);
  if (!order) throw new AppError("Order not found", 404);
  return order;
};
