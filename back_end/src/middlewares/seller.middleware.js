const prisma = require("../config/prisma");
const AppError = require("../utils/app-error");

const loadSeller = async (accountId) => prisma.seller.findFirst({
  where: { ownerAccountId: accountId },
});

exports.requireSellerProfile = async (req, _res, next) => {
  try {
    const seller = await loadSeller(req.user?.id);

    if (!seller) {
      return next(new AppError("Seller profile not found", 404));
    }

    req.seller = seller;
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.requireApprovedSeller = async (req, _res, next) => {
  try {
    const seller = req.seller || await loadSeller(req.user?.id);

    if (!seller) {
      return next(new AppError("Seller profile not found", 404));
    }

    if (seller.approvalStatus !== "APPROVED") {
      return next(new AppError("Seller account is not approved", 403));
    }

    req.seller = seller;
    return next();
  } catch (error) {
    return next(error);
  }
};
