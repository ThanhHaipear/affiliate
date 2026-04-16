const AppError = require("../../utils/app-error");
const { comparePassword, hashPassword } = require("../../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const authRepository = require("./auth.repository");

const buildAuthPayload = (account) => {
  const roles = account.accountRoles.map((item) => item.role.code);
  const accessToken = signAccessToken({ sub: account.id, roles });
  const refreshToken = signRefreshToken({ sub: account.id, roles });
  const profileFullName = account.customerProfile?.fullName || account.affiliate?.fullName || "";

  return {
    account: {
      id: account.id,
      email: account.email,
      phone: account.phone,
      status: account.status,
      roles,
      profile: {
        fullName: profileFullName,
        affiliateStatus: account.affiliate?.kycStatus || null,
        hasAffiliateApplication: Boolean(account.affiliate),
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
  if (account.status !== "ACTIVE") throw new AppError("Account is not active", 403);

  await authRepository.updateLastLogin(account.id);
  return buildAuthPayload(account);
};

exports.refreshToken = async ({ refreshToken }) => {
  const payload = verifyRefreshToken(refreshToken);
  const account = await authRepository.findAccountById(payload.sub);
  if (!account) throw new AppError("Account not found", 404);
  return buildAuthPayload(account);
};

exports.logout = async () => ({ loggedOut: true });

exports.forgotPassword = async ({ email, newPassword }) => {
  const account = await authRepository.findAccountByEmail(email);
  if (!account) {
    return { reset: true };
  }

  const passwordHash = await hashPassword(newPassword);
  await authRepository.changePassword(account.id, passwordHash);

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

  if (account.affiliate?.kycStatus === "PENDING") {
    throw new AppError("Affiliate application is pending admin approval", 409);
  }

  const updatedAccount = await authRepository.createAffiliateRole(accountId, payload);
  return buildAuthPayload(updatedAccount);
};
