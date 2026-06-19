import api from "../api/axios";

export const getStoryChapters = async () => {
  const response = await api.get("/story/chapters");
  return response.data;
};

export const addStoryChapter = async (data) => {
  const response = await api.post("/story/chapters", data);
  return response.data;
};

export const deleteStoryChapter = async (id) => {
  const response = await api.delete(`/story/chapters/${id}`);
  return response.data;
};
