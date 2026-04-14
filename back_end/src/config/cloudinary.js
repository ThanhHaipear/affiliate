const { v2: cloudinary } = require("cloudinary");

const env = require("./env");
const AppError = require("../utils/app-error");

let isConfigured = false;

const ensureCloudinaryConfigured = () => {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new AppError(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in back_end/.env",
      500
    );
  }

  if (!isConfigured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret
    });
    isConfigured = true;
  }

  return cloudinary;
};

module.exports = { ensureCloudinaryConfigured };
