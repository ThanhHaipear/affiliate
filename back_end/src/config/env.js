const dotenv = require("dotenv");

dotenv.config();

const trimEnv = (value) => (typeof value === "string" ? value.trim() : value);

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "change-me-access",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "change-me-refresh",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  attributionTtlHours: Number(process.env.ATTRIBUTION_TTL_HOURS || 24),
  defaultPlatformKey: process.env.DEFAULT_PLATFORM_KEY || "MAIN_PLATFORM",
  cloudinaryCloudName: trimEnv(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: trimEnv(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: trimEnv(process.env.CLOUDINARY_API_SECRET),
  cloudinaryFolder: trimEnv(process.env.CLOUDINARY_FOLDER) || "affiliate-marketplace",
  uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 5)
};
