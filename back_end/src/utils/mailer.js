const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

const getMissingSmtpConfigKeys = () => {
  const requiredKeys = [
    ["SMTP_HOST", env.smtpHost],
    ["SMTP_PORT", env.smtpPort],
    ["SMTP_USER", env.smtpUser],
    ["SMTP_PASS", env.smtpPass],
    ["SMTP_FROM_EMAIL", env.smtpFromEmail],
  ];

  return requiredKeys
    .filter(([, value]) => !value)
    .map(([key]) => key);
};

const hasSmtpConfig = () => getMissingSmtpConfigKeys().length === 0;

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
};

exports.isMailerConfigured = hasSmtpConfig;
exports.getMissingSmtpConfigKeys = getMissingSmtpConfigKeys;

exports.sendPasswordResetEmail = async ({ toEmail, resetUrl }) => {
  const client = getTransporter();
  if (!client) {
    throw new Error(`SMTP mailer is not configured. Missing: ${getMissingSmtpConfigKeys().join(", ")}`);
  }

  await client.sendMail({
    from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
    to: toEmail,
    subject: "Reset your password",
    text: [
      "We received a request to reset your password.",
      "",
      "Open this link to set a new password:",
      resetUrl,
      "",
      `This link expires in ${env.passwordResetTokenTtlMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: [
      "<p>We received a request to reset your password.</p>",
      `<p><a href="${resetUrl}">Open this link to set a new password</a></p>`,
      `<p>This link expires in ${env.passwordResetTokenTtlMinutes} minutes.</p>`,
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  });
};
