const prisma = require("../config/prisma");
const AppError = require("../utils/app-error");
const { verifyAccessToken } = require("../utils/jwt");

exports.authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  try {
    const token = authHeader.replace("Bearer ", "");
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
      return next(new AppError("Account not found", 401));
    }

    if (account.status === "LOCKED") {
      return next(new AppError("Account is locked", 401));
    }

    if (!account.accountRoles.length) {
      return next(new AppError("Account is locked", 401));
    }

    if (account.status !== "ACTIVE") {
      return next(new AppError("Account is not active", 401));
    }

    const roles = account.accountRoles.map((item) => item.role.code);
    req.user = {
      id: account.id,
      email: account.email,
      phone: account.phone,
      status: account.status,
      roles
    };

    return next();
  } catch (_error) {
    return next(new AppError("Invalid or expired token", 401));
  }
};
