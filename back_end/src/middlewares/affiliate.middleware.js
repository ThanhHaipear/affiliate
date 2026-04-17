const prisma = require("../config/prisma");
const AppError = require("../utils/app-error");

const loadAffiliate = async (accountId) => prisma.affiliate.findUnique({
  where: { accountId },
});

exports.requireAffiliateProfile = async (req, _res, next) => {
  try {
    const affiliate = await loadAffiliate(req.user?.id);

    if (!affiliate) {
      return next(new AppError("Affiliate profile not found", 404));
    }

    req.affiliate = affiliate;
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.requireApprovedAffiliate = async (req, _res, next) => {
  try {
    const affiliate = req.affiliate || await loadAffiliate(req.user?.id);

    if (!affiliate) {
      return next(new AppError("Affiliate profile not found", 404));
    }

    if (affiliate.kycStatus !== "APPROVED") {
      return next(new AppError("Affiliate account is not approved", 403));
    }

    req.affiliate = affiliate;
    return next();
  } catch (error) {
    return next(error);
  }
};
