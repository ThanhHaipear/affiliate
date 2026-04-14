const prisma = require("../../config/prisma");
const env = require("../../config/env");
const { generateShortCode, generateAttributionToken } = require("../../utils/code");

exports.createOrGetLink = async (affiliateId, productId) => {
  const existing = await prisma.affiliateLink.findUnique({
    where: { affiliateId_productId: { affiliateId, productId } },
  });

  if (existing?.status === "REVOKED") {
    return prisma.affiliateLink.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        revokedAt: null,
        revokedBy: null,
        updatedAt: new Date(),
      },
    });
  }

  if (existing) return existing;

  return prisma.affiliateLink.create({
    data: {
      affiliateId,
      productId,
      shortCode: generateShortCode(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

exports.listLinks = (affiliateId) => prisma.affiliateLink.findMany({
  where: { affiliateId },
  include: {
    product: {
      include: {
        seller: true,
        affiliateSetting: true,
        category: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          include: {
            inventory: true,
          },
          orderBy: { id: "asc" },
        },
      },
    },
    clicks: true,
    orderItems: true,
  },
  orderBy: { createdAt: "desc" },
});

exports.findAffiliateLink = (affiliateId, linkId) => prisma.affiliateLink.findFirst({
  where: {
    id: linkId,
    affiliateId,
  },
});

exports.revokeLink = (affiliateId, linkId, revokedBy) => prisma.affiliateLink.updateMany({
  where: {
    id: linkId,
    affiliateId,
    status: { not: "REVOKED" },
  },
  data: {
    status: "REVOKED",
    revokedAt: new Date(),
    revokedBy,
    updatedAt: new Date(),
  },
});

exports.recordClick = async (payload, audit) => prisma.$transaction(async (tx) => {
  const link = await tx.affiliateLink.findUnique({
    where: { shortCode: payload.shortCode },
    include: { product: { include: { affiliateSetting: true } } },
  });

  const click = await tx.affiliateClick.create({
    data: {
      affiliateLinkId: link.id,
      viewerId: payload.viewerId,
      affiliateId: link.affiliateId,
      productId: link.productId,
      ip: audit.ip,
      userAgent: audit.userAgent,
      referrer: payload.referrer,
      deviceId: payload.deviceId,
      clickedAt: new Date(),
    },
  });

  const expiresAt = new Date(Date.now() + env.attributionTtlHours * 60 * 60 * 1000);
  const attribution = await tx.attributionSession.create({
    data: {
      token: generateAttributionToken(),
      viewerId: payload.viewerId,
      affiliateId: link.affiliateId,
      productId: link.productId,
      affiliateLinkId: link.id,
      firstClickId: click.id,
      lastClickId: click.id,
      startedAt: new Date(),
      expiresAt,
      createdAt: new Date(),
    },
  });

  if (payload.viewerId) {
    await tx.activityLog.create({
      data: {
        accountId: payload.viewerId,
        action: "AFFILIATE_CLICK_RECORDED",
        targetType: "AFFILIATE_LINK",
        targetId: link.id,
        ip: audit.ip,
        userAgent: audit.userAgent,
        description: `Click recorded for affiliate link ${link.shortCode}`,
        createdAt: new Date(),
      },
    });
  }

  if (payload.deviceId || audit.ip) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const suspiciousClickCount = await tx.affiliateClick.count({
      where: {
        affiliateLinkId: link.id,
        clickedAt: { gte: oneHourAgo },
        OR: [
          ...(payload.deviceId ? [{ deviceId: payload.deviceId }] : []),
          ...(audit.ip ? [{ ip: audit.ip }] : []),
        ],
      },
    });

    if (suspiciousClickCount >= 10) {
      const existingAlert = await tx.fraudAlert.findFirst({
        where: {
          targetType: "AFFILIATE_LINK",
          targetId: link.id,
          alertType: "HIGH_FREQUENCY_CLICK",
          processStatus: "OPEN",
        },
      });

      if (!existingAlert) {
        await tx.fraudAlert.create({
          data: {
            targetType: "AFFILIATE_LINK",
            targetId: link.id,
            alertType: "HIGH_FREQUENCY_CLICK",
            severity: "HIGH",
            description: `Detected ${suspiciousClickCount} clicks within 1 hour for affiliate link ${link.shortCode}`,
            processStatus: "OPEN",
            createdAt: new Date(),
          },
        });
      }
    }
  }

  return { link, click, attribution };
});
