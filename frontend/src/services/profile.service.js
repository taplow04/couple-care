import api from "../api/axios";

// Personal profile (the caller's own — full data, no privacy gating).
export const getPersonalProfile = async () => {
  const res = await api.get("/profile/me");
  return res.data;
};

// Rich, privacy-aware partner profile.
export const getPartnerProfileFull = async () => {
  const res = await api.get("/profile/partner");
  return res.data;
};

// CoupleCare Journey (counts only — never past-relationship details).
export const getJourney = async () => {
  const res = await api.get("/profile/journey");
  return res.data;
};

// Shared Relationship Profile.
export const getRelationshipProfile = async () => {
  const res = await api.get("/profile/relationship");
  return res.data;
};

// Trust Center (deterministic, CoupleCare-only metrics).
export const getTrustCenter = async () => {
  const res = await api.get("/profile/trust");
  return res.data;
};

// Relationship Passport.
export const getPassport = async () => {
  const res = await api.get("/profile/passport");
  return res.data;
};
