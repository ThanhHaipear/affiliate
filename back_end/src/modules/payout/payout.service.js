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
const payoutRepository = require("./payout.repository");

exports.listBatches = () => payoutRepository.listBatches();
exports.createBatch = (adminId, payload) => payoutRepository.createBatch(adminId, payload);
exports.processBatch = (batchId, adminId, payload) =>
  payoutRepository.processBatch(batchId, adminId, payload.transactionCodePrefix);

const buildPayoutTxnRef = (batchId) => `PAYOUT-${batchId}-${Date.now()}`;

const extractBatchIdFromTxnRef = (txnRef) => {
  const raw = String(txnRef || "").trim();
  if (!raw) {
    return null;
  }

  const [prefix, batchIdPart] = raw.split("-");
  if (prefix !== "PAYOUT") {
    return null;
  }

  const batchId = Number(batchIdPart);
  return Number.isInteger(batchId) ? batchId : null;
};

const ensureVnpayConfigured = () => {
  if (!env.vnpayTmnCode || !env.vnpayHashSecret || !env.vnpayPayoutReturnUrl) {
    throw new AppError("VNPAY payout is not configured", 500);
  }
};

exports.createVnpayPaymentUrl = async (batchId, adminId, payload, req) => {
  ensureVnpayConfigured();

  const batch = await payoutRepository.findBatchById(batchId);
  if (!batch) {
    throw new AppError("Payout batch not found", 404);
  }

  if (!["CREATED", "PROCESSING"].includes(batch.status)) {
    throw new AppError("Only created or processing payout batches can start VNPAY payout", 400);
  }

  const totalAmount = Number(batch.totalAmount || 0);
  if (totalAmount <= 0) {
    throw new AppError("Payout batch amount must be greater than 0", 400);
  }

  const createdAt = new Date();
  const expiresAt = addMinutes(createdAt, env.vnpayExpireMinutes);
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.vnpayTmnCode,
    vnp_Amount: totalAmount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: buildPayoutTxnRef(batch.id),
    vnp_OrderInfo: normalizeOrderInfo(`Payout batch ${batch.id} ${batch.type || "WITHDRAWAL"}`),
    vnp_OrderType: env.vnpayOrderType,
    vnp_ReturnUrl: env.vnpayPayoutReturnUrl,
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
    batchId: batch.id.toString(),
    totalAmount: batch.totalAmount,
    expiresAt: expiresAt.toISOString(),
    status: batch.status,
    initiatedBy: adminId,
  };
};

exports.confirmVnpayReturn = async (adminId, payload) => {
  ensureVnpayConfigured();

  const verified = verifyResponse(payload, env.vnpayHashSecret);
  if (!verified) {
    throw new AppError("Invalid signature", 400);
  }

  const batchId = extractBatchIdFromTxnRef(payload.vnp_TxnRef);
  if (!batchId) {
    throw new AppError("Payout batch not found", 404);
  }

  const batch = await payoutRepository.findBatchById(batchId);
  if (!batch) {
    throw new AppError("Payout batch not found", 404);
  }

  const expectedAmount = Number(batch.totalAmount || 0) * 100;
  const actualAmount = Number(payload.vnp_Amount);
  if (!Number.isFinite(actualAmount) || expectedAmount !== actualAmount) {
    throw new AppError("Invalid amount", 400);
  }

  const success = payload.vnp_ResponseCode === "00" && payload.vnp_TransactionStatus === "00";
  const alreadyPaid = batch.status === "COMPLETED";

  let nextBatch = batch;
  let paymentUpdated = false;

  if (success && !alreadyPaid) {
    nextBatch = await payoutRepository.processBatch(
      batchId,
      adminId,
      `VNPAY-${payload.vnp_TransactionNo || payload.vnp_BankTranNo || batchId}`,
    );
    paymentUpdated = true;
  }

  return {
    verified: true,
    success,
    batchId: nextBatch.id.toString(),
    responseCode: payload.vnp_ResponseCode || null,
    transactionStatus: payload.vnp_TransactionStatus || null,
    transactionNo: payload.vnp_TransactionNo || null,
    bankCode: payload.vnp_BankCode || null,
    paymentUpdated,
    alreadyPaid,
    status: nextBatch.status,
    message: success ? "Payout batch payment verified" : "Payout batch payment was not successful at VNPAY",
  };
};
