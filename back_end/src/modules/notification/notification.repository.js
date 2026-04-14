const prisma = require("../../config/prisma");

const CUSTOMER_NOTIFICATION_TYPES = [
  "ORDER_PAID",
  "ORDER_COMPLETED",
  "ORDER_REFUNDED",
  "ORDER_CANCELLED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_UNLOCKED",
];

const AFFILIATE_NOTIFICATION_TYPES = [
  "AFFILIATE_REVIEW",
  "COMMISSION_CREDIT",
  "COMMISSION_REVERSED",
  "WITHDRAWAL_REQUESTED",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
  "WITHDRAWAL_PAID",
  "PAYOUT_BATCH_CREATED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_UNLOCKED",
];

const SELLER_NOTIFICATION_TYPES = [
  "ORDER_PAID",
  "ORDER_CANCELLED",
  "ORDER_REFUNDED",
  "SELLER_REVIEW",
  "PRODUCT_REVIEW",
  "PRODUCT_AFFILIATE_REVIEW",
  "SELLER_NET_CREDIT",
  "SELLER_NET_REVERSAL",
  "WITHDRAWAL_REQUESTED",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
  "WITHDRAWAL_PAID",
  "PAYOUT_BATCH_CREATED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_UNLOCKED",
];

const ADMIN_NOTIFICATION_TYPES = [
  "PLATFORM_FEE_CREDIT",
  "PLATFORM_FEE_REVERSAL",
  "ADMIN_PENDING_SELLER",
  "ADMIN_PENDING_AFFILIATE",
  "ADMIN_PENDING_PRODUCT",
  "ADMIN_PENDING_AFFILIATE_SUBQUEUE",
];

function buildAudienceFilter(audience) {
  if (audience === "customer") {
    return { type: { in: CUSTOMER_NOTIFICATION_TYPES } };
  }

  if (audience === "affiliate") {
    return { type: { in: AFFILIATE_NOTIFICATION_TYPES } };
  }

  if (audience === "seller") {
    return { type: { in: SELLER_NOTIFICATION_TYPES } };
  }

  if (audience === "admin") {
    return { type: { in: ADMIN_NOTIFICATION_TYPES } };
  }

  return {};
}

exports.listNotifications = (accountId, audience) => prisma.notification.findMany({
  where: {
    accountId,
    ...buildAudienceFilter(audience),
  },
  orderBy: { createdAt: "desc" },
});

exports.markNotificationAsRead = async (accountId, notificationId) => prisma.notification.updateMany({
  where: { id: BigInt(notificationId), accountId },
  data: { isRead: true, readAt: new Date() },
});

exports.markAllNotificationsAsRead = async (accountId, audience) => prisma.notification.updateMany({
  where: {
    accountId,
    isRead: false,
    ...buildAudienceFilter(audience),
  },
  data: { isRead: true, readAt: new Date() },
});
