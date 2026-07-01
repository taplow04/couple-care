import api from "../api/axios";

// 🌍 Explore — Relationship Discovery. All services return the full { success,
// data } envelope; callers unwrap `.data`.

export const getExploreMeta = async () => (await api.get("/explore/meta")).data;

export const getFeed = async (params = {}) =>
  (await api.get("/explore/feed", { params })).data;

export const getInspiration = async () =>
  (await api.get("/explore/inspiration")).data;

export const getAiInspiration = async () =>
  (await api.get("/explore/ai-inspiration")).data;

export const searchProfiles = async (q) =>
  (await api.get("/explore/search", { params: { q } })).data;

export const getPublicProfile = async (username) =>
  (await api.get(`/explore/profile/${username}`)).data;

export const getMyExplorePosts = async () =>
  (await api.get("/explore/my-posts")).data;

// FormData body — do NOT set Content-Type (browser adds the multipart boundary).
export const createExplorePost = async (formData, onProgress) =>
  (
    await api.post("/explore/posts", formData, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    })
  ).data;

export const deleteExplorePost = async (id) =>
  (await api.delete(`/explore/posts/${id}`)).data;

export const reactToPost = async (id, type) =>
  (await api.post(`/explore/posts/${id}/react`, { type })).data;

export const getPostComments = async (id, params = {}) =>
  (await api.get(`/explore/posts/${id}/comments`, { params })).data;

export const addPostComment = async (id, text) =>
  (await api.post(`/explore/posts/${id}/comments`, { text })).data;

export const getExploreSettings = async () =>
  (await api.get("/explore/settings")).data;

export const updateExploreSettings = async (body) =>
  (await api.patch("/explore/settings", body)).data;
