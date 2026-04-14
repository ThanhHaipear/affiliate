const prisma = require("../../config/prisma");
const AppError = require("../../utils/app-error");
const trackingRepository = require("./tracking.repository");

exports.listLinks = async (accountId) => {
  const affiliate = await prisma.affiliate.findUnique({ where: { accountId } });
  if (!affiliate) throw new AppError("Affiliate profile not found", 404);
  return trackingRepository.listLinks(accountId);
};

exports.createLink = async (affiliateId, payload) => {
  const product = await prisma.product.findUnique({
    where: { id: payload.productId },
    include: { affiliateSetting: true, seller: true },
  });

  if (
    !product ||
    product.status !== "APPROVED" ||
    product.seller?.approvalStatus !== "APPROVED" ||
    !product.affiliateSetting ||
    product.affiliateSetting.approvalStatus !== "APPROVED"
  ) {
    throw new AppError("Product is not available for affiliate", 400);
  }

  return trackingRepository.createOrGetLink(affiliateId, payload.productId);
};

exports.revokeLink = async (affiliateId, linkId) => {
  const link = await trackingRepository.findAffiliateLink(affiliateId, linkId);
  if (!link) {
    throw new AppError("Affiliate link not found", 404);
  }

  if (link.status === "REVOKED") {
    return link;
  }

  await trackingRepository.revokeLink(affiliateId, linkId, affiliateId);
  return trackingRepository.findAffiliateLink(affiliateId, linkId);
};

exports.trackClick = async (payload, audit) => {
  const link = await prisma.affiliateLink.findUnique({ where: { shortCode: payload.shortCode } });
  if (!link) throw new AppError("Affiliate link not found", 404);
  if (link.status === "REVOKED") throw new AppError("Affiliate link has been revoked", 400);
  return trackingRepository.recordClick(payload, audit);
};
