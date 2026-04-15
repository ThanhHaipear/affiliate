const crypto = require("crypto");

const encodeFormComponent = (value) =>
  encodeURIComponent(String(value))
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

const getVietnamDateParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
};

const formatVnpayDate = (date = new Date()) => {
  const parts = getVietnamDateParts(date);
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const sortParams = (params = {}) =>
  Object.keys(params)
    .sort()
    .reduce((result, key) => {
      if (params[key] === undefined || params[key] === null || params[key] === "") {
        return result;
      }

      result[key] = String(params[key]);
      return result;
    }, {});

const serializeForSigning = (params = {}) =>
  Object.entries(sortParams(params))
    .map(([key, value]) => `${encodeFormComponent(key)}=${encodeFormComponent(value)}`)
    .join("&");

const signParams = (params, secret) =>
  crypto.createHmac("sha512", secret).update(serializeForSigning(params), "utf8").digest("hex");

const buildPaymentUrl = (baseUrl, params, secret) => {
  const sortedParams = sortParams(params);
  const secureHash = signParams(sortedParams, secret);
  const searchParams = new URLSearchParams();

  Object.entries(sortedParams).forEach(([key, value]) => {
    searchParams.append(key, value);
  });
  searchParams.append("vnp_SecureHash", secureHash);

  return `${baseUrl}?${searchParams.toString()}`;
};

const verifyResponse = (params, secret) => {
  const payload = { ...params };
  const providedHash = payload.vnp_SecureHash;

  delete payload.vnp_SecureHash;
  delete payload.vnp_SecureHashType;

  if (!providedHash) {
    return false;
  }

  return signParams(payload, secret) === providedHash;
};

const normalizeOrderInfo = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 .,:_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);

const getRequestIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "127.0.0.1";

  return String(rawIp).replace("::ffff:", "");
};

module.exports = {
  addMinutes,
  buildPaymentUrl,
  formatVnpayDate,
  getRequestIp,
  normalizeOrderInfo,
  verifyResponse,
};
