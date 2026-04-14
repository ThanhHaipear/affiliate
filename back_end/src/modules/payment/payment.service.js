const prisma = require("../../config/prisma");
const AppError = require("../../utils/app-error");
const paymentRepository = require("./payment.repository");

exports.payOrder = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({ where: { id: BigInt(orderId) } });
  const payment = await prisma.payment.findFirst({ where: { orderId: BigInt(orderId) } });

  if (!order || order.buyerId !== accountId) throw new AppError("Order not found", 404);
  if (!payment) throw new AppError("Payment not found", 404);
  if (order.status !== "PENDING_PAYMENT") throw new AppError("Order is not waiting for payment", 400);
  if (payment.status !== "PENDING") throw new AppError("Payment has already been processed", 400);

  return paymentRepository.markPaid(orderId, payload.transactionCode);
};

exports.confirmSellerReceivedMoney = async (accountId, orderId, payload) => {
  const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true }
  });

  if (!seller || !order || order.sellerId !== seller.id) throw new AppError("Order not found", 404);
  if (["CANCELLED", "REFUNDED"].includes(order.status)) {
    throw new AppError("Cancelled or refunded orders cannot be seller-confirmed", 400);
  }

  const payment = order.payments?.[0];
  if (!payment) {
    throw new AppError("Payment not found", 404);
  }
  if (["FAILED", "REFUNDED"].includes(payment.status)) {
    throw new AppError("This payment can no longer be confirmed", 400);
  }

  if (order.sellerConfirmedReceivedMoney) throw new AppError("Order already settled", 400);

  return paymentRepository.confirmSellerReceivedMoney(orderId, accountId, payload.note);
};

exports.refundOrder = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { seller: true, payments: true }
  });
  if (!order) throw new AppError("Order not found", 404);
  if (["REFUNDED", "CANCELLED"].includes(order.status)) throw new AppError("Order already refunded or cancelled", 400);

  const isBuyer = order.buyerId === accountId;
  const isSellerOwner = order.seller?.ownerAccountId === accountId;
  if (!isBuyer && !isSellerOwner) throw new AppError("Forbidden", 403);

  const payment = order.payments?.[0];
  if (!payment) {
    throw new AppError("Payment not found", 404);
  }
  if (["FAILED", "REFUNDED"].includes(payment.status)) {
    throw new AppError("This order can no longer be refunded from this screen", 400);
  }

  return paymentRepository.refundOrder(orderId, accountId, payload.reason);
};

exports.cancelOrder = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true }
  });

  if (!order || order.buyerId !== accountId) throw new AppError("Order not found", 404);
  if (order.status !== "PENDING_PAYMENT") throw new AppError("Only unpaid orders can be cancelled", 400);

  const payment = order.payments?.[0];
  if (!payment) {
    throw new AppError("Payment not found", 404);
  }
  if (payment.status !== "PENDING") {
    throw new AppError("Only pending payments can be cancelled", 400);
  }

  return paymentRepository.cancelPendingPaymentOrder(orderId, accountId, payload?.reason);
};
