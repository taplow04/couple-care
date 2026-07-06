import api from "../api/axios";

// CCIE read API. All return the { success, data } wrapper — unwrap `.data` in
// the caller like every other service.

export const getMaturity = async () => {
  const res = await api.get("/intelligence/maturity");
  return res.data;
};

export const getBehaviorIntelligence = async () => {
  const res = await api.get("/intelligence/behavior");
  return res.data;
};

export const getHealingProgress = async () => {
  const res = await api.get("/intelligence/healing");
  return res.data;
};

// Self-history series for trend charts: { engine, series: [{ day, score }] }.
// Engines: maturity | healing | emotion (user) · relationshipHealth | trust |
// growth | behavior (couple).
export const getIntelHistory = async (engine, days = 30) => {
  const res = await api.get(`/intelligence/history/${engine}`, { params: { days } });
  return res.data;
};
