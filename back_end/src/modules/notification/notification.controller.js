const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const notificationService = require("./notification.service");

exports.listNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user.id, req.query.audience);
  successResponse(res, data, "Notifications loaded");
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markNotificationAsRead(req.user.id, req.params.notificationId);
  successResponse(res, data, "Notification marked as read");
});

exports.markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllNotificationsAsRead(req.user.id, req.query.audience);
  successResponse(res, data, "All notifications marked as read");
});
