const crypto = require("node:crypto");

const TOKEN_BYTES = 32;

exports.generatePasswordResetToken = () => crypto.randomBytes(TOKEN_BYTES).toString("hex");

exports.hashPasswordResetToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");
