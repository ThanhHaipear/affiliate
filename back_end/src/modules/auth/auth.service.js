const AppError = require("../../utils/app-error");
const { comparePassword, hashPassword } = require("../../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const env = require("../../config/env");
const { isMailerConfigured, getMissingSmtpConfigKeys, sendPasswordResetEmail } = require("../../utils/mailer");
const { generatePasswordResetToken, hashPasswordResetToken } = require("../../utils/password-reset");
const authRepository = require("./auth.repository");

const buildAuthPayload = (account) => {
  const roles = account.accountRoles.map((item) => item.role.code);
  const accessToken = signAccessToken({ sub: account.id, roles });
  const refreshToken = signRefreshToken({ sub: account.id, roles });
  const profileFullName = account.customerProfile?.fullName || account.affiliate?.fullName || "";
  const hasCustomerCapability = Boolean(account.customerProfile);
  const hasAffiliateCapability = Boolean(account.affiliate);
  const customerLocked = hasCustomerCapability && !roles.includes("CUSTOMER");
  const affiliateLocked = account.affiliate?.activityStatus === "LOCKED";
  const affiliateStatus =
    affiliateLocked
      ? "LOCKED"
      : account.affiliate?.kycStatus || null;

  return {
    account: {
      id: account.id,
      email: account.email,
      phone: account.phone,
      status: account.status,
      roles,
      profile: {
        fullName: profileFullName,
        hasCustomerCapability,
        hasAffiliateCapability,
        customerLocked,
        customerLockReason: customerLocked ? account.lockReason || null : null,
        affiliateStatus,
        affiliateKycStatus: account.affiliate?.kycStatus || null,
        affiliateActivityStatus: account.affiliate?.activityStatus || null,
        affiliateLocked,
        affiliateLockReason: affiliateLocked ? account.affiliate?.lockReason || null : null,
        hasAffiliateApplication: hasAffiliateCapability,
      },
    },
    accessToken,
    refreshToken,
  };
};

exports.register = async (payload) => {
  if (payload.role === "AFFILIATE") {
    throw new AppError("Affiliate registration must go through customer enrollment and admin approval", 400);
  }

  const existing = await authRepository.findExistingAccount({ email: payload.email });
  if (existing) {
    throw new AppError("Account already exists with this email", 409);
  }

  const passwordHash = await hashPassword(payload.password);
  const account = await authRepository.createAccountGraph({
    account: {
      email: payload.email,
      phone: payload.phone || null,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    roleCode: payload.role,
    fullName: payload.fullName,
    shopName: payload.shopName,
    businessName: payload.businessName,
    channelName: payload.channelName,
    paymentMethod: payload.paymentMethod,
    bankName: payload.bankName,
    bankAccountName: payload.bankAccountName,
    bankAccountNumber: payload.bankAccountNumber,
  });

  return buildAuthPayload(account);
};

exports.login = async ({ email, password }) => {
  const account = await authRepository.findAccountByEmail(email);
  if (!account) throw new AppError("Invalid credentials", 401);

  const isMatched = await comparePassword(password, account.passwordHash);
  if (!isMatched) throw new AppError("Invalid credentials", 401);
  if (account.status === "LOCKED") throw new AppError("Account is locked", 403);
  if (!account.accountRoles.length) throw new AppError("Account is locked", 403);
  if (account.status !== "ACTIVE") throw new AppError("Account is not active", 403);

  await authRepository.updateLastLogin(account.id);
  return buildAuthPayload(account);
};

exports.refreshToken = async ({ refreshToken }) => {
  const payload = verifyRefreshToken(refreshToken);
  const account = await authRepository.findAccountById(payload.sub);
  if (!account) throw new AppError("Account not found", 404);
  if (account.status === "LOCKED") throw new AppError("Account is locked", 401);
  if (!account.accountRoles.length) throw new AppError("Account is locked", 401);
  if (account.status !== "ACTIVE") throw new AppError("Account is not active", 401);
  return buildAuthPayload(account);
};

exports.logout = async () => ({ loggedOut: true });

const buildPasswordResetUrl = (token) => {
  const baseUrl = env.passwordResetUrl || (env.frontendBaseUrl ? `${env.frontendBaseUrl}/auth/reset-password` : "");
  if (!baseUrl) {
    throw new AppError("Password reset URL is not configured", 500);
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
};

exports.forgotPassword = async ({ email }) => {
  const account = await authRepository.findAccountByEmail(email);
  if (!account) {
    return {
      resetRequested: true,
      delivery: "noop",
    };
  }

  if (!isMailerConfigured()) {
    const missingKeys = getMissingSmtpConfigKeys();
    throw new AppError(`SMTP mailer is not configured. Missing: ${missingKeys.join(", ")}`, 503);
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);

  await authRepository.invalidatePasswordResetTokens(account.id);
  await authRepository.createPasswordResetToken({
    accountId: account.id,
    tokenHash,
    expiresAt,
  });

  await sendPasswordResetEmail({
    toEmail: account.email,
    resetUrl: buildPasswordResetUrl(token),
  });

  return {
    resetRequested: true,
    delivery: "email",
  };
};

exports.verifyResetPasswordToken = async ({ token }) => {
  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await authRepository.findActivePasswordResetToken(tokenHash);

  if (!resetToken) {
    throw new AppError("Reset token is invalid or expired", 400);
  }

  return {
    valid: true,
    email: resetToken.account.email,
    expiresAt: resetToken.expiresAt,
  };
};

exports.resetPasswordWithToken = async ({ token, newPassword }) => {
  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await authRepository.findActivePasswordResetToken(tokenHash);

  if (!resetToken) {
    throw new AppError("Reset token is invalid or expired", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await authRepository.changePassword(resetToken.accountId, passwordHash);
  await authRepository.consumePasswordResetToken(resetToken.id);
  await authRepository.invalidatePasswordResetTokens(resetToken.accountId);

  return { reset: true };
};

exports.changePassword = async (accountId, { currentPassword, newPassword }) => {
  const account = await authRepository.findAccountById(accountId);
  if (!account) throw new AppError("Account not found", 404);

  const isMatched = await comparePassword(currentPassword, account.passwordHash);
  if (!isMatched) throw new AppError("Current password is incorrect", 400);

  const passwordHash = await hashPassword(newPassword);
  await authRepository.changePassword(accountId, passwordHash);

  return { changed: true };
};

exports.enrollAffiliate = async (accountId, payload) => {
  const account = await authRepository.findAccountById(accountId);
  if (!account) throw new AppError("Account not found", 404);

  const roles = account.accountRoles.map((item) => item.role.code);
  if (roles.includes("AFFILIATE") && account.affiliate?.kycStatus === "APPROVED") {
    throw new AppError("Account is already enrolled as affiliate", 409);
  }

  if (account.affiliate?.activityStatus === "LOCKED") {
    throw new AppError("Affiliate role is locked", 409);
  }

  if (account.affiliate?.kycStatus === "APPROVED") {
    throw new AppError("Account already has an affiliate profile", 409);
  }

  if (account.affiliate?.kycStatus === "PENDING") {
    throw new AppError("Affiliate application is pending admin approval", 409);
  }

  const updatedAccount = await authRepository.createAffiliateRole(accountId, payload);
  return buildAuthPayload(updatedAccount);
};
