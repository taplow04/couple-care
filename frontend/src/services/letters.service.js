import api from "../api/axios";

export const generateLetter = async (type) => {
  const response = await api.post("/letters/generate", { type });
  return response.data;
};

export const saveLetter = async (data) => {
  const response = await api.post("/letters", data);
  return response.data;
};

export const getLetters = async () => {
  const response = await api.get("/letters");
  return response.data;
};

export const shareLetter = async (id) => {
  const response = await api.post(`/letters/${id}/share`);
  return response.data;
};

export const deleteLetter = async (id) => {
  const response = await api.delete(`/letters/${id}`);
  return response.data;
};
