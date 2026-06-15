import api from "../api/axios";

export const getMessages = async (page = 1, limit = 50) => {
  const response = await api.get(`/chat/messages?page=${page}&limit=${limit}`);
  return response.data;
};

export const sendMessage = async (data) => {
  const response = await api.post("/chat/messages", data);
  return response.data;
};

export const markMessageSeen = async (messageId) => {
  const response = await api.patch(`/chat/messages/${messageId}/seen`);
  return response.data;
};
