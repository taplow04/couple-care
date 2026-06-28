import api from "../api/axios";

// ── Summary + daily content ──
export const getGrowthSummary = async () => {
  const res = await api.get("/growth");
  return res.data;
};

export const getDailyTip = async () => {
  const res = await api.get("/growth/tip");
  return res.data;
};

export const getMoodSummary = async () => {
  const res = await api.get("/growth/mood-summary");
  return res.data;
};

// ── Journal / reflection / gratitude ──
export const getJournal = async (type) => {
  const res = await api.get("/growth/journal", { params: type ? { type } : {} });
  return res.data;
};

export const getTodayEntry = async (type) => {
  const res = await api.get(`/growth/journal/${type}/today`);
  return res.data;
};

export const addJournal = async (payload) => {
  const res = await api.post("/growth/journal", payload);
  return res.data;
};

export const deleteJournal = async (id) => {
  const res = await api.delete(`/growth/journal/${id}`);
  return res.data;
};

// ── Daily challenge ──
export const getTodayChallenge = async () => {
  const res = await api.get("/growth/challenge/today");
  return res.data;
};

export const completeChallenge = async () => {
  const res = await api.patch("/growth/challenge/complete");
  return res.data;
};

// ── Quizzes ──
export const getQuizzes = async () => {
  const res = await api.get("/growth/quizzes");
  return res.data;
};

export const submitReadiness = async (answers) => {
  const res = await api.post("/growth/readiness", { answers });
  return res.data;
};

export const submitLoveLanguage = async (answers) => {
  const res = await api.post("/growth/love-language", { answers });
  return res.data;
};

export const submitAttachment = async (answers) => {
  const res = await api.post("/growth/attachment", { answers });
  return res.data;
};
