import api from "../api/axios";

export const logSleep = async (data) => {
  const response = await api.post("/sleep", data);
  return response.data;
};

export const getMySleep = async () => {
  const response = await api.get("/sleep");
  return response.data;
};

export const getPartnerSleep = async () => {
  const response = await api.get("/sleep/partner");
  return response.data;
};

export const getSleepAnalysis = async () => {
  const response = await api.get("/sleep/analysis");
  return response.data;
};

export const deleteSleep = async (id) => {
  const response = await api.delete(`/sleep/${id}`);
  return response.data;
};
