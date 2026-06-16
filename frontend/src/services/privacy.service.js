import api from "../api/axios";

export const getPrivacy = async () => {
  const res = await api.get("/users/privacy");
  return res.data;
};

export const updatePrivacy = async (patch) => {
  const res = await api.patch("/users/privacy", patch);
  return res.data;
};
