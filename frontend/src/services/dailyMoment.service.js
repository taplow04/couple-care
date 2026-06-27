import api from "../api/axios";

/**
 * ❤️ Daily Couple Moment — the lasting daily recap created when BOTH partners
 * share a Moment on the same day. All endpoints return the standard
 * { success, data } envelope; unwrap `.data` in the caller.
 */

// Today's recap, or the encouragement state if it doesn't exist yet (Feature 5).
export const getTodayMoment = async () =>
  (await api.get("/daily-moment/today")).data;

// Newest-first timeline of past recaps (Feature 4 / 10).
export const getMomentTimeline = async ({ limit, before } = {}) => {
  const params = {};
  if (limit) params.limit = limit;
  if (before) params.before = before;
  return (await api.get("/daily-moment/timeline", { params })).data;
};

// Full recap for one calendar day (YYYY-MM-DD), with the underlying moments.
export const getMomentByDay = async (day) =>
  (await api.get(`/daily-moment/day/${day}`)).data;

export const getMomentById = async (id) =>
  (await api.get(`/daily-moment/${id}`)).data;

// Replays (Feature 8 / 9).
export const getMonthlyReplay = async (year, month) =>
  (await api.get("/daily-moment/replay/monthly", { params: { year, month } })).data;

export const getYearlyReplay = async (year) =>
  (await api.get("/daily-moment/replay/yearly", { params: { year } })).data;
