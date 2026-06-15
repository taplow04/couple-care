import api from "../api/axios";

export const createCouple = async () => {
  const res = await api.post("/couples/create");
  return res.data;
};

export const joinCouple = async (pairCode) => {
  const res = await api.post("/couples/join", { pairCode });
  return res.data;
};

export const getMyCouple = async () => {
  const res = await api.get("/couples/me");
  return res.data;
};
