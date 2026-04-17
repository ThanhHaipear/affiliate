const AppError = require("../../utils/app-error");
const orderRepository = require("./order.repository");

exports.listOrders = (accountId, roles) => orderRepository.listOrders(accountId, roles);
exports.getOrder = async (accountId, roles, orderId) => {
  const order = await orderRepository.getOrder(accountId, roles, orderId);
  if (!order) throw new AppError("Order not found", 404);
  return order;
};
