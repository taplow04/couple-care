import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints where a 401 is an expected "wrong credentials" outcome, NOT a
// dead session — never force a redirect for these.
const AUTH_PATHS = [
  "/auth/login",
  "/auth/request-otp",
  "/auth/verify-otp",
  "/auth/resend-otp",
  "/security/forgot-password",
  "/security/reset-password",
  "/security/verify-email",
];

// When an AUTHENTICATED request gets a 401 the token is dead — most importantly
// because its session was revoked on another device ("log out this device").
// Clear it and bounce to /login so a revoked token can't linger in the app.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const hadToken = !!localStorage.getItem("token");
    const isAuthAttempt = AUTH_PATHS.some((p) => url.includes(p));

    if (status === 401 && hadToken && !isAuthAttempt) {
      localStorage.removeItem("token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export default api;
