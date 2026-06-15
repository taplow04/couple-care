import api from "../api/axios";

export const getMyMoods = async () => {
  const response = await api.get("/moods");
  return response.data;
};

export const logMood = async (data) => {
  const response = await api.post("/moods", data);
  return response.data;
};

export const deleteMood = async (id) => {
  const response = await api.delete(`/moods/${id}`);
  return response.data;
};

export const getPartnerMoods = async () => {
  const response = await api.get("/moods/partner");
  return response.data;
};

export const getMoodAnalytics = async () => {
  const response = await api.get("/moods/analytics");
  return response.data;
};
