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

// Relationship Pulse — the couple's 7-signal live reading (identical for both).
export const getPulse = async () => {
  const res = await api.get("/intelligence/pulse");
  return res.data;
};

// Relationship Change Detection — hedged observations vs the couple's own baseline.
export const getChangeObservations = async () => {
  const res = await api.get("/intelligence/changes");
  return res.data;
};

// Personality Timeline — behavioural + self-reported trends (user + couple series).
export const getPersonalityTimeline = async (days = 30) => {
  const res = await api.get("/intelligence/personality-timeline", { params: { days } });
  return res.data;
};

// AI Relationship Timeline recap for a period: daily | weekly | monthly | yearly.
export const getRelationshipTimeline = async (period = "weekly") => {
  const res = await api.get(`/intelligence/memory/${period}`);
  return res.data;
};

// Self-history series for trend charts: { engine, series: [{ day, score }] }.
// Engines: maturity | healing | emotion (user) · relationshipHealth | trust |
// growth | behavior | pulse (couple).
export const getIntelHistory = async (engine, days = 30) => {
  const res = await api.get(`/intelligence/history/${engine}`, { params: { days } });
  return res.data;
};
