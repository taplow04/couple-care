import api from "../api/axios";

// ── Story circles + capture ──────────────────────────────────────────────────
export const getMomentCircles = async () => {
  const res = await api.get("/moments/circles");
  return res.data;
};

/**
 * Upload a live-captured Moment. The server stores it on Cloudinary, runs AI
 * analysis, notifies the partner, and emits `moment:new`. Returns the moment DTO
 * (including any AI suggestion). Do NOT set Content-Type — the browser must add
 * the multipart boundary itself (see chat.service note).
 */
export const uploadMoment = async (
  file,
  { caption = "", privacy = "partner_only", duration, mood } = {},
  onProgress,
) => {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);
  if (privacy) form.append("privacy", privacy);
  if (duration) form.append("duration", String(duration));
  if (mood) form.append("mood", mood);

  const res = await api.post("/moments", form, {
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
  });
  return res.data;
};

// ── Single moment lifecycle ───────────────────────────────────────────────────
export const viewMoment = async (id) => (await api.patch(`/moments/${id}/view`)).data;
export const reactToMoment = async (id, emoji) =>
  (await api.post(`/moments/${id}/react`, { emoji })).data;
export const keepMoment = async (id) => (await api.patch(`/moments/${id}/keep`)).data;
export const saveMomentToJourney = async (id) =>
  (await api.patch(`/moments/${id}/save-journey`)).data;
export const deleteMoment = async (id) => (await api.delete(`/moments/${id}`)).data;

// ── Couple Moment (Feature 12) ────────────────────────────────────────────────
export const getCoupleMomentCandidate = async () =>
  (await api.get("/moments/couple/candidate")).data;
export const createCoupleMoment = async (momentIds) =>
  (await api.post("/moments/couple", { momentIds })).data;

// ── Highlights (Feature 11) ───────────────────────────────────────────────────
export const getHighlights = async () => (await api.get("/moments/highlights")).data;
export const getHighlight = async (id) => (await api.get(`/moments/highlights/${id}`)).data;
export const createHighlight = async (data) =>
  (await api.post("/moments/highlights", data)).data;
export const addMomentToHighlight = async (id, momentId) =>
  (await api.post(`/moments/highlights/${id}/moments`, { momentId })).data;
export const removeMomentFromHighlight = async (id, momentId) =>
  (await api.delete(`/moments/highlights/${id}/moments/${momentId}`)).data;
export const deleteHighlight = async (id) =>
  (await api.delete(`/moments/highlights/${id}`)).data;

// ── Profile integration (Feature 17) ─────────────────────────────────────────
export const getProfileMoments = async (ownerId = "me") =>
  (await api.get(`/moments/profile/${ownerId}`)).data;
