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

export const setRelationshipStartDate = async (relationshipStartDate) => {
  const res = await api.patch("/couples/start-date", { relationshipStartDate });
  return res.data;
};

export const getPartnerProfile = async () => {
  const res = await api.get("/couples/partner-profile");
  return res.data;
};

export const unmatchPartner = async () => {
  const res = await api.post("/couples/unmatch");
  return res.data;
};
