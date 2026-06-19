import api from "../api/axios";

// Couple engagement snapshot: streak, XP, level + full achievements catalog
// (locked/unlocked). Returns the full { success, data } wrapper.
export const getEngagement = async () => {
  const response = await api.get("/engagement");
  return response.data;
};

export const getAchievements = async () => {
  const response = await api.get("/engagement/achievements");
  return response.data;
};
