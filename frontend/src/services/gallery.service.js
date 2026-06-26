import api from "../api/axios";

// Upload a photo/video to the personal (or relationship) gallery. Do NOT set
// Content-Type — the browser adds the multipart boundary itself (see chat.service).
export const uploadGalleryItem = async (file, { caption = "", scope = "personal", visibility } = {}, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  formData.append("scope", scope);
  if (visibility) formData.append("visibility", visibility);

  const res = await api.post("/gallery", formData, {
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
  });
  return res.data;
};

export const getMyGallery = async () => {
  const res = await api.get("/gallery");
  return res.data;
};

export const getRelationshipGallery = async () => {
  const res = await api.get("/gallery/relationship");
  return res.data;
};

export const getGalleryStats = async () => {
  const res = await api.get("/gallery/stats");
  return res.data;
};

export const updateGalleryItem = async (id, patch) => {
  const res = await api.patch(`/gallery/${id}`, patch);
  return res.data;
};

export const deleteGalleryItem = async (id) => {
  const res = await api.delete(`/gallery/${id}`);
  return res.data;
};
