import api from "../api/axios";

export const getCoachConversations = async () => {
  const response = await api.get("/coach/conversations");
  return response.data;
};

export const getCoachConversation = async (id) => {
  const response = await api.get(`/coach/conversations/${id}`);
  return response.data;
};

export const deleteCoachConversation = async (id) => {
  const response = await api.delete(`/coach/conversations/${id}`);
  return response.data;
};

// Send a message; pass id = null to start a new conversation.
export const sendCoachMessage = async (id, text) => {
  const response = await api.post(`/coach/conversations/${id || "new"}/message`, {
    text,
  });
  return response.data;
};
