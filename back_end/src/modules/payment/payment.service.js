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
const buildVnpayGroupTxnRef = (orderCode) => `G_${orderCode}_${Date.now()}`;

const extractPaymentReferenceFromTxnRef = (txnRef) => {
  const raw = String(txnRef || "").trim();
  if (!raw) {
    return null;
  }

  const groupMatch = raw.match(/^G_(.+)_(\d+)$/);
  if (groupMatch) {
    return {
      type: "ORDER_CODE",
      orderCode: groupMatch[1],
      raw,
    };
  }

  const [orderIdPart] = raw.split("-");
  const orderId = Number(orderIdPart);
  if (!Number.isInteger(orderId)) {
    return null;
  }

  return {
    type: "ORDER_ID",
    orderId,
    raw,
  };
};

const serializeOrderIds = (orders = []) => orders.map((order) => order.id.toString());

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

const getOrdersWithPaymentsByOrderCode = async (orderCode) =>
  prisma.order.findMany({
    where: { orderCode },
    include: { payments: true },
    orderBy: { id: "asc" },
  });

const getCheckoutOrdersForBuyer = async (accountId, orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: { payments: true },
  });

  if (!order || order.buyerId !== accountId) {
    throw new AppError("Order not found", 404);
  }

  const orders = await prisma.order.findMany({
    where: {
      buyerId: accountId,
      orderCode: order.orderCode,
    },
    include: { payments: true },
    orderBy: { id: "asc" },
  });

  return orders;
};

const ensureBuyerOwnsGroupedOrders = async (accountId, orderId) => {
  const orders = await getCheckoutOrdersForBuyer(accountId, orderId);
  if (!orders.length) {
    throw new AppError("Order not found", 404);
  }
  return orders;
};

const ensureOrdersReadyForVnpay = (orders = []) => {
  if (!orders.length) {
    throw new AppError("Order not found", 404);
  }

  const invalidOrder = orders.find((order) => {
    const payment = order.payments?.[0];
    if (!payment) {
      return true;
    }

    if (!VNPAY_SUPPORTED_METHODS.has(payment.method)) {
      return true;
    }

    if (order.status !== "PENDING_PAYMENT" || payment.status !== "PENDING") {
      return true;
    }

    return false;
  });

  if (invalidOrder) {
    throw new AppError("Order is not waiting for VNPAY payment", 400);
  }

  return orders;
};

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

  const paymentReference = extractPaymentReferenceFromTxnRef(payload.vnp_TxnRef);
  const orders = paymentReference?.type === "ORDER_CODE"
    ? await getOrdersWithPaymentsByOrderCode(paymentReference.orderCode)
    : Number.isInteger(paymentReference?.orderId)
      ? [await getOrderWithPayments(paymentReference.orderId)].filter(Boolean)
      : [];

  if (!orders.length) {
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

  const payments = orders.map((order) => order.payments?.[0] || null);
  if (payments.some((payment) => !payment)) {
    const primaryOrder = orders[0];
    return {
      verified: true,
      success: false,
      responseCode: payload.vnp_ResponseCode || null,
      transactionStatus: payload.vnp_TransactionStatus || null,
      orderId: primaryOrder.id.toString(),
      orderCode: primaryOrder.orderCode,
      orderIds: serializeOrderIds(orders),
      totalOrders: orders.length,
      transactionNo: payload.vnp_TransactionNo || null,
      bankCode: payload.vnp_BankCode || null,
      paymentUpdated: false,
      alreadyConfirmed: false,
      orderStatus: primaryOrder.status,
      paymentStatus: null,
      message: "Payment not found",
      rspCode: "01",
      rspMessage: "Order not found",
    };
  }

  const expectedAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0) * 100;
  const actualAmount = Number(payload.vnp_Amount);
  if (!Number.isFinite(actualAmount) || expectedAmount !== actualAmount) {
    const primaryOrder = orders[0];
    return {
      verified: true,
      success: false,
      responseCode: payload.vnp_ResponseCode || null,
      transactionStatus: payload.vnp_TransactionStatus || null,
      orderId: primaryOrder.id.toString(),
      orderCode: primaryOrder.orderCode,
      orderIds: serializeOrderIds(orders),
      totalOrders: orders.length,
      transactionNo: payload.vnp_TransactionNo || null,
      bankCode: payload.vnp_BankCode || null,
      paymentUpdated: false,
      alreadyConfirmed: false,
      orderStatus: primaryOrder.status,
      paymentStatus: payments[0]?.status || null,
      message: "Invalid amount",
      rspCode: "04",
      rspMessage: "Invalid amount",
    };
  }

  const isSuccess = payload.vnp_ResponseCode === "00" && payload.vnp_TransactionStatus === "00";
  const alreadyConfirmed = orders.every((order, index) =>
    payments[index]?.status === "PAID" || order.status === "PAID" || order.status === "COMPLETED");

  let nextOrders = orders;
  let paymentUpdated = false;

  if (isSuccess && !alreadyConfirmed) {
    nextOrders = orders.length > 1
      ? await paymentRepository.markPaidBatch(
        orders.map((order) => order.id),
        `VNPAY-${payload.vnp_TransactionNo || payload.vnp_BankTranNo || payload.vnp_TxnRef}`,
      )
      : [await paymentRepository.markPaid(
        orders[0].id,
        `VNPAY-${payload.vnp_TransactionNo || payload.vnp_BankTranNo || payload.vnp_TxnRef}`,
      )];
    paymentUpdated = true;
  }

  const primaryOrder = nextOrders[0];

  return {
    verified: true,
    success: isSuccess,
    responseCode: payload.vnp_ResponseCode || null,
    transactionStatus: payload.vnp_TransactionStatus || null,
    orderId: primaryOrder.id.toString(),
    orderCode: primaryOrder.orderCode,
    orderIds: serializeOrderIds(nextOrders),
    totalOrders: nextOrders.length,
    transactionNo: payload.vnp_TransactionNo || null,
    bankCode: payload.vnp_BankCode || null,
    paymentUpdated,
    alreadyConfirmed,
    orderStatus: primaryOrder.status,
    paymentStatus: nextOrders[0]?.payments?.[0]?.status || payments[0]?.status || null,
    message: isSuccess ? "Payment verified" : "Payment was not successful at VNPAY",
    rspCode: isSuccess ? (alreadyConfirmed ? "02" : "00") : "00",
    rspMessage: isSuccess
      ? alreadyConfirmed
        ? "Order already confirmed"
        : "Confirm Success"
      : "Confirm Success",
  };
};

exports.createVnpayPaymentUrl = async (accountId, orderId, payload, req) => {
  ensureVnpayConfigured();

  const checkoutOrders = ensureOrdersReadyForVnpay(await getCheckoutOrdersForBuyer(accountId, orderId));
  const primaryOrder = checkoutOrders[0];
  const totalAmount = checkoutOrders.reduce((sum, order) => sum + Number(order.payments?.[0]?.amount || 0), 0);
  const sharedMethod = checkoutOrders[0]?.payments?.[0]?.method || "VNPAY";

  const createdAt = new Date();
  const expiresAt = addMinutes(createdAt, env.vnpayExpireMinutes);
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.vnpayTmnCode,
    vnp_Amount: totalAmount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: checkoutOrders.length > 1 ? buildVnpayGroupTxnRef(primaryOrder.orderCode) : buildVnpayTxnRef(primaryOrder.id),
    vnp_OrderInfo: normalizeOrderInfo(
      checkoutOrders.length > 1
        ? `Thanh toan nhom don hang ${primaryOrder.orderCode}`
        : `Thanh toan don hang ${primaryOrder.orderCode}`,
    ),
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
    orderId: primaryOrder.id.toString(),
    orderIds: serializeOrderIds(checkoutOrders),
    orderCode: primaryOrder.orderCode,
    totalOrders: checkoutOrders.length,
    paymentMethod: sharedMethod,
    expiresAt: expiresAt.toISOString(),
  };
};

exports.changePaymentMethod = async (accountId, orderId, payload) => {
  const groupedOrders = await ensureBuyerOwnsGroupedOrders(accountId, orderId);
  const invalidOrder = groupedOrders.find((order) => {
    const payment = order.payments?.[0];
    return !payment || order.status !== "PENDING_PAYMENT" || payment.status !== "PENDING";
  });

  if (invalidOrder) {
    throw new AppError("Only pending unpaid orders can change payment method", 400);
  }

  const hasAnyDifferentMethod = groupedOrders.some((order) => order.payments?.[0]?.method !== payload.paymentMethod);
  if (!hasAnyDifferentMethod) {
    throw new AppError("Order is already using this payment method", 400);
  }

  return paymentRepository.changePendingPaymentMethodForOrders(
    groupedOrders.map((order) => order.id),
    accountId,
    payload.paymentMethod,
  );
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

  if (isBuyer && order.status === "PENDING_PAYMENT" && payment.method === "COD" && payment.status === "PENDING") {
    return paymentRepository.cancelPendingPaymentOrder(orderId, accountId, payload.reason);
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
  const groupedOrders = await ensureBuyerOwnsGroupedOrders(accountId, orderId);
  const hasCompletedOrder = groupedOrders.some((order) => order.sellerConfirmedReceivedMoney);
  if (hasCompletedOrder) {
    throw new AppError("Completed orders cannot be cancelled", 400);
  }

  const pendingRefund = await prisma.refund.findFirst({
    where: {
      orderId: {
        in: groupedOrders.map((order) => order.id),
      },
      status: "PENDING",
    }
  });
  if (pendingRefund) {
    throw new AppError("A refund request is already pending admin review", 400);
  }

  const payments = groupedOrders.map((order) => order.payments?.[0] || null);
  if (payments.some((payment) => !payment)) {
    throw new AppError("Payment not found", 404);
  }

  const allPaidVnpayGroup = groupedOrders.every((order, index) =>
    ADMIN_REVIEW_PAYMENT_METHODS.has(payments[index].method) &&
    payments[index].status === "PAID" &&
    order.status === "PAID");

  if (allPaidVnpayGroup) {
    const refundRequests = await paymentRepository.createRefundRequestsForOrders({
      orderIds: groupedOrders.map((order) => order.id),
      actorId: accountId,
      reason: payload?.reason || "Customer requested cancellation after VNPAY payment",
    });

    return {
      action: "REFUND_REQUESTED",
      refundRequests,
      totalOrders: groupedOrders.length,
      orderCode: groupedOrders[0].orderCode,
    };
  }

  const invalidPendingOrder = groupedOrders.find((order, index) =>
    order.status !== "PENDING_PAYMENT" || payments[index].status !== "PENDING");

  if (invalidPendingOrder) {
    throw new AppError("Only pending payments can be cancelled", 400);
  }

  return paymentRepository.cancelPendingPaymentOrders(
    groupedOrders.map((order) => order.id),
    accountId,
    payload?.reason,
  );
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
