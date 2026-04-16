import { axiosClient } from "./axiosClient";
import { ENDPOINTS } from "./endpoints";
import { unwrapResponseData } from "./response";

async function getNotifications(params) {
  const response = await axiosClient.get(ENDPOINTS.notifications.list, { params });
  return unwrapResponseData(response);
}

async function markNotificationAsRead(notificationId) {
  const response = await axiosClient.post(ENDPOINTS.notifications.read(notificationId));
  return unwrapResponseData(response);
}

async function markAllNotificationsAsRead(params) {
  const response = await axiosClient.post(ENDPOINTS.notifications.readAll, null, { params });
  return unwrapResponseData(response);
}

export {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
};
