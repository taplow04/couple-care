import api from "../api/axios";

// Step 1 — submit name/email/password; backend emails a 6-digit OTP.
export const requestOtp = async (data) => {
  const response = await api.post("/auth/request-otp", data);
  return response.data;
};

// Step 2 — verify the OTP; backend creates the account and returns { user, token }.
export const verifyOtp = async (data) => {
  const response = await api.post("/auth/verify-otp", data);
  return response.data;
};

export const resendOtp = async (email) => {
  const response = await api.post("/auth/resend-otp", { email });
  return response.data;
};

export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");

  return response.data;
};
