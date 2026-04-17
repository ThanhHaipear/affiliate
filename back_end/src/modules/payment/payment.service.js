const prisma = require("../../config/prisma");
const env = require("../../config/env");
const AppError = require("../../utils/app-error");
const {
  addMinutes,
  buildPaymentUrl,
  formatVnpayDate,
  getRequestIp,
  normalizeOrderInfo,
  verifyResponse,
} = require("../../utils/vnpay");
const paymentRepository = require("./payment.repository");

const VNPAY_SUPPORTED_METHODS = new Set(["VNPAY", "CARD"]);
const ADMIN_REVIEW_PAYMENT_METHODS = new Set(["VNPAY", "CARD"]);

const buildVnpayTxnRef = (orderId) => `${orderId}-${Date.now()}`;

const extractOrderIdFromTxnRef = (txnRef) => {
  const raw = String(txnRef || "").trim();
  if (!raw) {
    return null;
  }

  const [orderIdPart] = raw.split("-");
  const orderId = Number(orderIdPart);
  return Number.isInteger(orderId) ? orderId : null;
};

const ensureVnpayConfigured = () => {
  if (!env.vnpayTmnCode || !env.vnpayHashSecret || !env.vnpayReturnUrl) {
    throw new AppError("VNPAY is not configured", 500);
  }
};

const getOrderWithPayments = async (orderId) =>
  prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true },
  });

const buildVnpayCallbackResult = async (payload) => {
  ensureVnpayConfigured();

  const verified = verifyResponse(payload, env.vnpayHashSecret);
  if (!verified) {
    return {
      verified: false,
      success: false,
      responseCode: payload.vnp_ResponseCode || null,
      transactionStatus: payload.vnp_TransactionStatus || null,
      orderId: payload.vnp_TxnRef || null,
      transactionNo: payload.vnp_TransactionNo || null,
      bankCode: payload.vnp_BankCode || null,
      paymentUpdated: false,
      alreadyConfirmed: false,
      orderStatus: null,
      paymentStatus: null,
      message: "Invalid signature",
      rspCode: "97",
      rspMessage: "Invalid signature",
    };
  }

  const orderId = extractOrderIdFromTxnRef(payload.vnp_TxnRef);
  const order = Number.isInteger(orderId) ? await getOrderWithPayments(orderId) : null;
  if (!order) {
    return {
      verified: true,
      success: false,
      responseCode: payload.vnp_ResponseCode || null,
      transactionStatus: payload.vnp_TransactionStatus || null,
      orderId: payload.vnp_TxnRef || null,
      transactionNo: payload.vnp_TransactionNo || null,
      bankCode: payload.vnp_BankCode || null,
      paymentUpdated: false,
      alreadyConfirmed: false,
      orderStatus: null,
      paymentStatus: null,
      message: "Order not found",
      rspCode: "01",
      rspMessage: "Order not found",
    };
  }

  const payment = order.payments?.[0] || null;
  if (!payment) {
    return {
      verified: true,
      success: false,
      responseCode: payload.vnp_ResponseCode || null,
      transactionStatus: payload.vnp_TransactionStatus || null,
      orderId: order.id.toString(),
      transactionNo: payload.vnp_TransactionNo || null,
      bankCode: payload.vnp_BankCode || null,
      paymentUpdated: false,
      alreadyConfirmed: false,
      orderStatus: order.status,
      paymentStatus: null,
      message: "Payment not found",
      rspCode: "01",
      rspMessage: "Order not found",
    };
  }

  const expectedAmount = Number(payment.amount) * 100;
  const actualAmount = Number(payload.vnp_Amount);
  if (!Number.isFinite(actualAmount) || expectedAmount !== actualAmount) {
    return {
      verified: true,
      success: false,
      responseCode: payload.vnp_ResponseCode || null,
      transactionStatus: payload.vnp_TransactionStatus || null,
      orderId: order.id.toString(),
      transactionNo: payload.vnp_TransactionNo || null,
      bankCode: payload.vnp_BankCode || null,
      paymentUpdated: false,
      alreadyConfirmed: false,
      orderStatus: order.status,
      paymentStatus: payment.status,
      message: "Invalid amount",
      rspCode: "04",
      rspMessage: "Invalid amount",
    };
  }

  const isSuccess = payload.vnp_ResponseCode === "00" && payload.vnp_TransactionStatus === "00";
  const alreadyConfirmed = payment.status === "PAID" || order.status === "PAID" || order.status === "COMPLETED";

  let nextOrder = order;
  let paymentUpdated = false;

  if (isSuccess && !alreadyConfirmed) {
    nextOrder = await paymentRepository.markPaid(order.id, `VNPAY-${payload.vnp_TransactionNo || payload.vnp_BankTranNo || payload.vnp_TxnRef}`);
    paymentUpdated = true;
  }

  return {
    verified: true,
    success: isSuccess,
    responseCode: payload.vnp_ResponseCode || null,
    transactionStatus: payload.vnp_TransactionStatus || null,
    orderId: nextOrder.id.toString(),
    transactionNo: payload.vnp_TransactionNo || null,
    bankCode: payload.vnp_BankCode || null,
    paymentUpdated,
    alreadyConfirmed,
    orderStatus: nextOrder.status,
    paymentStatus: nextOrder.payments?.[0]?.status || payment.status,
    message: isSuccess ? "Payment verified" : "Payment was not successful at VNPAY",
    rspCode: isSuccess ? (alreadyConfirmed ? "02" : "00") : "00",
    rspMessage: isSuccess
      ? alreadyConfirmed
        ? "Order already confirmed"
        : "Confirm Success"
      : "Confirm Success",
  };
};

exports.payOrder = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({ where: { id: BigInt(orderId) } });
  const payment = await prisma.payment.findFirst({ where: { orderId: BigInt(orderId) } });

  if (!order || order.buyerId !== accountId) throw new AppError("Order not found", 404);
  if (!payment) throw new AppError("Payment not found", 404);
  if (order.status !== "PENDING_PAYMENT") throw new AppError("Order is not waiting for payment", 400);
  if (payment.status !== "PENDING") throw new AppError("Payment has already been processed", 400);

  return paymentRepository.markPaid(orderId, payload.transactionCode);
};

exports.createVnpayPaymentUrl = async (accountId, orderId, payload, req) => {
  ensureVnpayConfigured();

  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true },
  });

  if (!order || order.buyerId !== accountId) {
    throw new AppError("Order not found", 404);
  }

  const payment = order.payments?.[0];
  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  if (!VNPAY_SUPPORTED_METHODS.has(payment.method)) {
    throw new AppError("This order is not configured for VNPAY payment", 400);
  }

  if (order.status !== "PENDING_PAYMENT" || payment.status !== "PENDING") {
    throw new AppError("Order is not waiting for VNPAY payment", 400);
  }

  const createdAt = new Date();
  const expiresAt = addMinutes(createdAt, env.vnpayExpireMinutes);
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.vnpayTmnCode,
    vnp_Amount: Number(payment.amount) * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: buildVnpayTxnRef(order.id),
    vnp_OrderInfo: normalizeOrderInfo(`Thanh toan don hang ${order.orderCode}`),
    vnp_OrderType: env.vnpayOrderType,
    vnp_ReturnUrl: env.vnpayReturnUrl,
    vnp_IpAddr: getRequestIp(req),
    vnp_Locale: payload.language || env.vnpayLocale,
    vnp_CreateDate: formatVnpayDate(createdAt),
    vnp_ExpireDate: formatVnpayDate(expiresAt),
  };

  if (payload.bankCode) {
    params.vnp_BankCode = payload.bankCode;
  }

  return {
    paymentUrl: buildPaymentUrl(env.vnpayPaymentUrl, params, env.vnpayHashSecret),
    orderId: order.id.toString(),
    orderCode: order.orderCode,
    expiresAt: expiresAt.toISOString(),
  };
};

exports.changePaymentMethod = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true },
  });

  if (!order || order.buyerId !== accountId) {
    throw new AppError("Order not found", 404);
  }

  const payment = order.payments?.[0];
  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  if (order.status !== "PENDING_PAYMENT" || payment.status !== "PENDING") {
    throw new AppError("Only pending unpaid orders can change payment method", 400);
  }

  if (payment.method === payload.paymentMethod) {
    throw new AppError("Order is already using this payment method", 400);
  }

  return paymentRepository.changePendingPaymentMethod(orderId, accountId, payload.paymentMethod);
};

exports.confirmVnpayReturn = async (payload) => {
  const result = await buildVnpayCallbackResult(payload);

  if (!result.verified) {
    throw new AppError(result.message, 400);
  }

  if (result.rspCode === "01") {
    throw new AppError(result.message, 404);
  }

  if (result.rspCode === "04") {
    throw new AppError(result.message, 400);
  }

  return result;
};

exports.handleVnpayIpn = async (payload) => {
  const result = await buildVnpayCallbackResult(payload);
  return { RspCode: result.rspCode, Message: result.rspMessage };
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

  const pendingRefund = await prisma.refund.findFirst({
    where: { orderId: BigInt(orderId), status: "PENDING" }
  });
  if (pendingRefund) {
    throw new AppError("This order has a pending refund request and cannot be completed", 400);
  }

  return paymentRepository.confirmSellerReceivedMoney(orderId, accountId, payload.note);
};

exports.refundOrder = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { seller: true, payments: true }
  });
  if (!order) throw new AppError("Order not found", 404);
  if (["REFUNDED", "CANCELLED"].includes(order.status)) throw new AppError("Order already refunded or cancelled", 400);
  if (order.sellerConfirmedReceivedMoney) throw new AppError("Completed orders cannot be refunded from this screen", 400);

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

  const pendingRefund = await prisma.refund.findFirst({
    where: { orderId: BigInt(orderId), status: "PENDING" }
  });
  if (pendingRefund) {
    throw new AppError("A refund request is already pending admin review", 400);
  }

  if (ADMIN_REVIEW_PAYMENT_METHODS.has(payment.method) && payment.status === "PAID") {
    const refundRequest = await paymentRepository.createRefundRequest({
      orderId,
      actorId: accountId,
      reason: payload.reason,
    });

    return {
      action: "REFUND_REQUESTED",
      refundRequest,
    };
  }

  return paymentRepository.refundOrder({ orderId, actorId: accountId, reason: payload.reason });
};

exports.cancelOrder = async (accountId, orderId, payload) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true }
  });

  if (!order || order.buyerId !== accountId) throw new AppError("Order not found", 404);
  if (order.sellerConfirmedReceivedMoney) throw new AppError("Completed orders cannot be cancelled", 400);

  const payment = order.payments?.[0];
  if (!payment) {
    throw new AppError("Payment not found", 404);
  }

  const pendingRefund = await prisma.refund.findFirst({
    where: { orderId: BigInt(orderId), status: "PENDING" }
  });
  if (pendingRefund) {
    throw new AppError("A refund request is already pending admin review", 400);
  }

  if (ADMIN_REVIEW_PAYMENT_METHODS.has(payment.method) && payment.status === "PAID" && order.status === "PAID") {
    const refundRequest = await paymentRepository.createRefundRequest({
      orderId,
      actorId: accountId,
      reason: payload?.reason || "Customer requested cancellation after VNPAY payment",
    });

    return {
      action: "REFUND_REQUESTED",
      refundRequest,
    };
  }

  if (order.status !== "PENDING_PAYMENT") throw new AppError("Only unpaid orders can be cancelled", 400);
  if (payment.status !== "PENDING") {
    throw new AppError("Only pending payments can be cancelled", 400);
  }

  return paymentRepository.cancelPendingPaymentOrder(orderId, accountId, payload?.reason);
};

exports.cancelOrderBySeller = async (accountId, orderId, payload) => {
  const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true }
  });

  if (!seller || !order || order.sellerId !== seller.id) throw new AppError("Order not found", 404);
  if (order.sellerConfirmedReceivedMoney) throw new AppError("Completed orders cannot be cancelled", 400);
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
