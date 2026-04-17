const prisma = require("../config/prisma");
const AppError = require("../utils/app-error");
const { verifyAccessToken } = require("../utils/jwt");

const resolveCurrentUser = async (token) => {
  const payload = verifyAccessToken(token);

  const account = await prisma.account.findUnique({
    where: { id: payload.sub },
    include: {
      accountRoles: {
        include: {
          role: true
        }
      }
    }
  });

  if (!account) {
    throw new AppError("Account not found", 401);
  }

  if (account.status === "LOCKED") {
    throw new AppError("Account is locked", 401);
  }

  if (!account.accountRoles.length) {
    throw new AppError("Account is locked", 401);
  }

  if (account.status !== "ACTIVE") {
    throw new AppError("Account is not active", 401);
  }

  const roles = account.accountRoles.map((item) => item.role.code);
  return {
    id: account.id,
    email: account.email,
    phone: account.phone,
    status: account.status,
    roles
  };
};

exports.authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    req.user = await resolveCurrentUser(token);
    return next();
  } catch (_error) {
    return next(new AppError("Invalid or expired token", 401));
  }
};

exports.authenticateOptional = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    req.user = await resolveCurrentUser(token);
    return next();
  } catch (_error) {
    return next();
  }
};
