import api from "../api/axios";

export const getTodaySurprise = async () => {
  const response = await api.get("/surprise/today");
  return response.data;
};

export const openSurprise = async () => {
  const response = await api.post("/surprise/open");
  return response.data;
};
