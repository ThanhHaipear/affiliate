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

exports.unrevokeLink = async (affiliateId, linkId) => {
  const link = await trackingRepository.findAffiliateLink(affiliateId, linkId);
  if (!link) {
    throw new AppError("Affiliate link not found", 404);
  }

  if (link.status !== "REVOKED") {
    return link;
  }

  const revokedByAdmin = (link.revokedByAccount?.accountRoles || []).some((item) => item.role?.code === "ADMIN");
  if (revokedByAdmin) {
    throw new AppError("This affiliate link has been disabled by admin and cannot be reactivated by affiliate", 403);
  }

  await trackingRepository.unrevokeLink(affiliateId, linkId);
  return trackingRepository.findAffiliateLink(affiliateId, linkId);
};

exports.getLinkStatus = async (shortCode) => {
  const link = await trackingRepository.findLinkByShortCode(shortCode);
  if (!link) {
    throw new AppError("Affiliate link not found", 404);
  }

  return link;
};

exports.trackClick = async (payload, audit) => {
  const link = await prisma.affiliateLink.findUnique({ where: { shortCode: payload.shortCode } });
  if (!link) throw new AppError("Affiliate link not found", 404);
  if (link.status === "REVOKED") throw new AppError("Affiliate link has been revoked", 400);
  return trackingRepository.recordClick(payload, audit);
};
