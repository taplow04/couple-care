import api from "../api/axios";

// AI Daily Reflection — personal, optional, works in every lifecycle stage.
// All return the { success, data } wrapper — unwrap `.data` in the caller.

export const saveReflection = async (payload) => {
  const res = await api.post("/reflection", payload);
  return res.data;
};

export const getTodayReflection = async () => {
  const res = await api.get("/reflection/today");
  return res.data;
};

export const getReflectionHistory = async (days = 30) => {
  const res = await api.get("/reflection", { params: { days } });
  return res.data;
};

// period: "weekly" | "monthly" → { stats, series, analysis }
export const getReflectionReport = async (period = "weekly") => {
  const res = await api.get(`/reflection/report/${period}`);
  return res.data;
};
