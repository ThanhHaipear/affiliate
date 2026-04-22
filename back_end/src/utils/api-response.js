const realtimeService = require("../realtime/realtime.service");

const serialize = (value) => JSON.parse(JSON.stringify(value, (_key, current) =>
  typeof current === 'bigint' ? current.toString() : current
));

exports.serialize = serialize;

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REALTIME_EXCLUDED_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh-token",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/reset-password/verify",
  "/api/auth/change-password",
  "/api/payout-batches/vnpay-return/confirm",
];

exports.successResponse = (res, data, message = 'Success', statusCode = 200) => {
  const requestPath = res.req?.originalUrl || res.req?.url || "";
  const shouldEmitRealtime =
    MUTATION_METHODS.has(res.req?.method) &&
    !REALTIME_EXCLUDED_PATHS.some((prefix) => requestPath.startsWith(prefix));

  if (shouldEmitRealtime) {
    realtimeService.emitMutation({
      method: res.req.method,
      path: requestPath,
      statusCode,
      message,
    });
  }

  return res.status(statusCode).json({
    success: true,
    message,
    data: serialize(data)
  });
};
