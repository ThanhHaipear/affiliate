import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getNotifications(params) {
  const response = await axiosClient.get("/api/notifications", { params });
  return unwrapResponseData(response);
}

async function markNotificationAsRead(notificationId) {
  const response = await axiosClient.post(`/api/notifications/${notificationId}/read`);
  return unwrapResponseData(response);
}

async function markAllNotificationsAsRead(params) {
  const response = await axiosClient.post("/api/notifications/read-all", null, { params });
  return unwrapResponseData(response);
}

export {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
};
