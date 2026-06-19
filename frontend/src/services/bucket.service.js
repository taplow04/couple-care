import api from "../api/axios";

export const getBucketItems = async () => {
  const response = await api.get("/bucket");
  return response.data;
};

export const getBucketStats = async () => {
  const response = await api.get("/bucket/stats");
  return response.data;
};

export const addBucketItem = async (data) => {
  const response = await api.post("/bucket", data);
  return response.data;
};

export const updateBucketItem = async (id, data) => {
  const response = await api.patch(`/bucket/${id}`, data);
  return response.data;
};

export const toggleBucketItem = async (id, completed) => {
  const response = await api.patch(`/bucket/${id}/complete`, { completed });
  return response.data;
};

export const deleteBucketItem = async (id) => {
  const response = await api.delete(`/bucket/${id}`);
  return response.data;
};
