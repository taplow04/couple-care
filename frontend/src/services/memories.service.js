import api from "../api/axios";

export const getMemories = async () => {
  const response = await api.get("/memories");
  return response.data;
};

export const addMemory = async (data) => {
  const response = await api.post("/memories", data);
  return response.data;
};

export const getMemoriesTimeline = async () => {
  const response = await api.get("/memories/timeline");
  return response.data;
};

export const getUpcomingEvents = async () => {
  const response = await api.get("/memories/upcoming");
  return response.data;
};

export const getMemoryStats = async () => {
  const response = await api.get("/memories/stats");
  return response.data;
};
