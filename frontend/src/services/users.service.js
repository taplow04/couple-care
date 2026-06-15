import api from "../api/axios";

export const updateProfile = async (data) => {
  const response = await api.patch("/users/profile", data);
  return response.data;
};

export const uploadPhoto = async (imageData, onUploadProgress) => {
  const response = await api.post(
    "/users/upload-photo",
    { imageData },
    {
      onUploadProgress: (e) => {
        if (e.total) {
          onUploadProgress?.(Math.round((e.loaded * 100) / e.total));
        }
      },
    }
  );
  return response.data;
};
