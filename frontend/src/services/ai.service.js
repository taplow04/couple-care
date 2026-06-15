import api from "../api/axios";

export const getHealthScore = async () => {
  const response = await api.get("/ai/health-score");
  return response.data;
};

export const getWeeklySummary = async () => {
  const response = await api.get("/ai/weekly-summary");
  return response.data;
};

export const getMoodAnalysis = async () => {
  const response = await api.get("/ai/mood-analysis");
  return response.data;
};

export const getRelationshipInsights = async () => {
  const response = await api.get("/ai/relationship-insights");
  return response.data;
};

export const getMemoryRecap = async () => {
  const response = await api.get("/ai/memory-recap");
  return response.data;
};
