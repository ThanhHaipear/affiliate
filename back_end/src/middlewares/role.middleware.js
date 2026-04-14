const AppError = require("../utils/app-error");

exports.authorize = (...allowedRoles) => (req, _res, next) => {
  const userRoles = req.user?.roles || [];
  const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

  if (!isAllowed) {
    return next(new AppError("Forbidden", 403));
  }

  return next();
};
