import api from "../api/axios";

export const forgotPassword = async (email) => {
  const response = await api.post("/security/forgot-password", { email });

  return response.data;
};

export const resetPassword = async (data) => {
  const response = await api.post("/security/reset-password", data);

  return response.data;
};

export const verifyEmail = async (token) => {
  const response = await api.post("/security/verify-email", { token });

  return response.data;
};

export const sendVerification = async () => {
  const response = await api.post("/security/send-verification");

  return response.data;
};

export const getSettings = async () => {
  const response = await api.get("/security/settings");
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.patch("/security/settings", settings);
  return response.data;
};
