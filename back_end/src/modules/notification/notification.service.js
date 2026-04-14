const AppError = require("../../utils/app-error");
const notificationRepository = require("./notification.repository");

exports.listNotifications = (accountId, audience) => notificationRepository.listNotifications(accountId, audience);

exports.markNotificationAsRead = async (accountId, notificationId) => {
  const result = await notificationRepository.markNotificationAsRead(accountId, notificationId);
  if (!result.count) {
    throw new AppError("Notification not found", 404);
  }

  return { id: notificationId, isRead: true };
};

exports.markAllNotificationsAsRead = async (accountId, audience) => {
  const result = await notificationRepository.markAllNotificationsAsRead(accountId, audience);
  return { updatedCount: result.count };
};
