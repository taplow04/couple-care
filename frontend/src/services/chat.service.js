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

export const getUnreadCount = async () => {
  const response = await api.get("/chat/unread-count");
  return response.data;
};

export const markAllSeen = async () => {
  const response = await api.patch("/chat/seen-all");
  return response.data;
};

export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data;
};

// Uploads an image/file to the chat. The server stores it on Cloudinary,
// creates the Message, and broadcasts it over the socket — so the caller does
// not need to add the message manually; it arrives via "message:receive".
export const uploadChatMedia = async (file, caption = "", onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("text", caption);

  // Do NOT set Content-Type manually — the browser must add the multipart
  // boundary itself. Setting "multipart/form-data" by hand drops the boundary
  // and the server fails to parse the file.
  const response = await api.post("/chat/upload", formData, {
    onUploadProgress: (e) => {
      if (e.total) {
        onProgress?.(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
};

// Shared media gallery (images + files) for the couple.
export const getSharedMedia = async () => {
  const response = await api.get("/chat/media");
  return response.data;
};
