const prisma = require("../../config/prisma");
const { notifyAdmins } = require("../../utils/admin-notifications");

const APPEAL_INCLUDE = {
  account: {
    select: {
      id: true,
      email: true,
      phone: true,
      customerProfile: { select: { fullName: true, avatarUrl: true } },
      affiliate: { select: { fullName: true, avatarUrl: true } },
      sellers: { select: { shopName: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  },
  reviewer: {
    select: {
      id: true,
      email: true,
      adminProfile: { select: { fullName: true } },
    },
  },
  messages: {
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          adminProfile: { select: { fullName: true } },
          customerProfile: { select: { fullName: true } },
          affiliate: { select: { fullName: true } },
          sellers: { select: { shopName: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
};

exports.createAppeal = ({ accountId, targetType, targetId, content }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    const existing = await tx.appeal.findFirst({
      where: {
        accountId,
        targetType,
        targetId: BigInt(targetId),
        status: "OPEN",
      },
    });

    if (existing) {
      throw new Error("Bạn đã có một kiến nghị đang mở cho mục này. Hãy chờ admin phản hồi hoặc gửi thêm tin nhắn.");
    }

    const appeal = await tx.appeal.create({
      data: {
        accountId,
        targetType,
        targetId: BigInt(targetId),
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.appealMessage.create({
      data: {
        appealId: appeal.id,
        senderId: accountId,
        content,
        createdAt: now,
      },
    });

    await tx.notification.create({
      data: {
        accountId: accountId,
        title: "Kiến nghị đã được gửi",
        content: `Kiến nghị về ${targetType === "PRODUCT" ? "sản phẩm" : "link affiliate"} #${targetId} đã được gửi đến Admin.`,
        type: "APPEAL_CREATED",
        targetType: "APPEAL",
        targetId: appeal.id,
        createdAt: now,
      },
    });

    await notifyAdmins(tx, {
      title: "Kiến nghị mới",
      content: `Có kiến nghị mới về ${targetType === "PRODUCT" ? "sản phẩm" : "link affiliate"} #${targetId}.`,
      type: "APPEAL_CREATED",
      targetType: "APPEAL",
      targetId: appeal.id,
      createdAt: now,
    });

    return tx.appeal.findUnique({
      where: { id: appeal.id },
      include: APPEAL_INCLUDE,
    });
  });

exports.sendMessage = ({ appealId, senderId, content }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    const appeal = await tx.appeal.findUnique({ where: { id: BigInt(appealId) } });
    if (!appeal) {
      throw new Error("Kiến nghị không tồn tại.");
    }

    if (appeal.status === "RESOLVED") {
      throw new Error("Kiến nghị này đã được giải quyết.");
    }

    if (appeal.accountId !== senderId) {
      throw new Error("Bạn không có quyền gửi tin nhắn trong kiến nghị này.");
    }

    const message = await tx.appealMessage.create({
      data: {
        appealId: BigInt(appealId),
        senderId,
        content,
        createdAt: now,
      },
    });

    await tx.appeal.update({
      where: { id: BigInt(appealId) },
      data: { updatedAt: now },
    });

    await notifyAdmins(tx, {
      title: "Tin nhắn kiến nghị mới",
      content: `Người dùng vừa gửi tin nhắn mới trong kiến nghị #${appealId}.`,
      type: "APPEAL_CREATED",
      targetType: "APPEAL",
      targetId: BigInt(appealId),
      createdAt: now,
    });

    return tx.appeal.findUnique({
      where: { id: BigInt(appealId) },
      include: APPEAL_INCLUDE,
    });
  });

exports.adminReply = ({ appealId, adminId, content, action }) =>
  prisma.$transaction(async (tx) => {
    const now = new Date();

    const appeal = await tx.appeal.findUnique({
      where: { id: BigInt(appealId) },
      include: APPEAL_INCLUDE,
    });

    if (!appeal) {
      throw new Error("Kiến nghị không tồn tại.");
    }

    if (appeal.status === "RESOLVED") {
      throw new Error("Kiến nghị này đã được giải quyết.");
    }

    await tx.appealMessage.create({
      data: {
        appealId: BigInt(appealId),
        senderId: adminId,
        content,
        action: action || "TEXT",
        createdAt: now,
      },
    });

    const updateData = {
      reviewedBy: adminId,
      updatedAt: now,
    };

    if (action === "UNLOCK") {
      if (appeal.targetType === "PRODUCT") {
        await tx.product.update({
          where: { id: Number(appeal.targetId) },
          data: {
            lockReason: null,
            lockedAt: null,
            lockedBy: null,
            updatedAt: now,
          },
        });

        await tx.notification.create({
          data: {
            accountId: appeal.accountId,
            title: "Sản phẩm đã được mở khóa",
            content: `Admin đã mở khóa sản phẩm #${appeal.targetId} sau khi xem xét kiến nghị của bạn.`,
            type: "PRODUCT_UNLOCKED_BY_ADMIN",
            targetType: "PRODUCT",
            targetId: appeal.targetId,
            createdAt: now,
          },
        });
      }

      if (appeal.targetType === "AFFILIATE_LINK") {
        await tx.affiliateLink.update({
          where: { id: appeal.targetId },
          data: {
            status: "ACTIVE",
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
            updatedAt: now,
          },
        });

        await tx.notification.create({
          data: {
            accountId: appeal.accountId,
            title: "Link affiliate đã được mở khóa",
            content: `Admin đã mở khóa link affiliate #${appeal.targetId} sau khi xem xét kiến nghị của bạn.`,
            type: "AFFILIATE_LINK_UNREVOKED_BY_ADMIN",
            targetType: "AFFILIATE_LINK",
            targetId: appeal.targetId,
            createdAt: now,
          },
        });
      }
    }

    if (action === "RESOLVE" || action === "UNLOCK") {
      updateData.status = "RESOLVED";
      updateData.resolvedAt = now;
    }

    await tx.appeal.update({
      where: { id: BigInt(appealId) },
      data: updateData,
    });

    if (action !== "UNLOCK") {
      await tx.notification.create({
        data: {
          accountId: appeal.accountId,
          title: action === "RESOLVE" ? "Kiến nghị đã được giải quyết" : "Admin đã phản hồi kiến nghị",
          content: content,
          type: action === "RESOLVE" ? "APPEAL_RESOLVED" : "APPEAL_REPLIED",
          targetType: "APPEAL",
          targetId: BigInt(appealId),
          createdAt: now,
        },
      });
    }

    return tx.appeal.findUnique({
      where: { id: BigInt(appealId) },
      include: APPEAL_INCLUDE,
    });
  });

exports.listMyAppeals = (accountId) =>
  prisma.appeal.findMany({
    where: { accountId },
    include: APPEAL_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });

exports.listAllAppeals = ({ status }) => {
  const where = {};
  if (status && status !== "ALL") {
    where.status = status;
  }

  return prisma.appeal.findMany({
    where,
    include: APPEAL_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
};

exports.getAppealById = (appealId) =>
  prisma.appeal.findUnique({
    where: { id: BigInt(appealId) },
    include: APPEAL_INCLUDE,
  });
