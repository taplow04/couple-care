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

// ── Security Center ──
export const getSecurityOverview = async () => {
  const response = await api.get("/security/overview");
  return response.data;
};

export const getSessions = async () => {
  const response = await api.get("/security/sessions");
  return response.data;
};

export const getSecurityActivity = async (limit = 30) => {
  const response = await api.get("/security/activity", { params: { limit } });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.patch("/security/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

// Password-confirmed session removal.
export const revokeSession = async (id, password) => {
  const response = await api.delete(`/security/sessions/${id}`, {
    data: { password },
  });
  return response.data;
};

export const logoutOtherDevices = async (password) => {
  const response = await api.post("/security/sessions/logout-others", {
    password,
  });
  return response.data;
};

// End the current session server-side (invalidates the token, not just local).
export const logoutCurrentSession = async () => {
  const response = await api.post("/security/logout");
  return response.data;
};

export const deleteAccount = async (password) => {
  const response = await api.post("/security/delete-account", { password });
  return response.data;
};
