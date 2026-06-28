import api from "../api/axios";

export const getRelationshipSummary = async () => {
  const res = await api.get("/lifecycle/summary");
  return res.data;
};

export const getJourney = async () => {
  const res = await api.get("/lifecycle/journey");
  return res.data;
};

export const getReportQuestions = async () => {
  const res = await api.get("/lifecycle/growth-report/questions");
  return res.data;
};

export const getGrowthReport = async () => {
  const res = await api.get("/lifecycle/growth-report");
  return res.data;
};

export const createGrowthReport = async (answers) => {
  const res = await api.post("/lifecycle/growth-report", { answers });
  return res.data;
};
