import api from "../api/axios";

export const getNotifications = async (page = 1, limit = 50) => {
  const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch("/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};
