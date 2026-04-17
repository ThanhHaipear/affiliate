const dotenv = require("dotenv");

dotenv.config();

const trimEnv = (value) => (typeof value === "string" ? value.trim() : value);

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: trimEnv(process.env.CORS_ORIGIN),
  frontendBaseUrl: trimEnv(process.env.FRONTEND_BASE_URL),
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30),
  passwordResetUrl: trimEnv(process.env.PASSWORD_RESET_URL),
  smtpHost: trimEnv(process.env.SMTP_HOST),
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  smtpUser: trimEnv(process.env.SMTP_USER),
  smtpPass: trimEnv(process.env.SMTP_PASS),
  smtpFromEmail: trimEnv(process.env.SMTP_FROM_EMAIL),
  smtpFromName: trimEnv(process.env.SMTP_FROM_NAME) || "Affiliate Marketplace",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "change-me-access",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-refresh",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  attributionTtlHours: Number(process.env.ATTRIBUTION_TTL_HOURS || 24),
  defaultPlatformKey: process.env.DEFAULT_PLATFORM_KEY || "MAIN_PLATFORM",
  vnpayTmnCode: trimEnv(process.env.VNPAY_TMN_CODE),
  vnpayHashSecret: trimEnv(process.env.VNPAY_HASH_SECRET),
  vnpayPaymentUrl: trimEnv(process.env.VNPAY_PAYMENT_URL) || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnpayReturnUrl: trimEnv(process.env.VNPAY_RETURN_URL),
  vnpayIpnUrl: trimEnv(process.env.VNPAY_IPN_URL),
  vnpayOrderType: trimEnv(process.env.VNPAY_ORDER_TYPE) || "other",
  vnpayLocale: trimEnv(process.env.VNPAY_LOCALE) || "vn",
  vnpayExpireMinutes: Number(process.env.VNPAY_EXPIRE_MINUTES || 15),
  cloudinaryCloudName: trimEnv(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: trimEnv(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: trimEnv(process.env.CLOUDINARY_API_SECRET),
  cloudinaryFolder: trimEnv(process.env.CLOUDINARY_FOLDER) || "affiliate-marketplace",
  uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 5)
};
