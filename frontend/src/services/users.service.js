import api from "../api/axios";

export const updateProfile = async (data) => {
  const response = await api.patch("/users/profile", data);
  return response.data;
};

// type: "avatar" (square face crop) | "cover" (wide banner, no face crop).
export const uploadPhoto = async (imageData, onUploadProgress, type = "avatar") => {
  const response = await api.post(
    "/users/upload-photo",
    { imageData, type },
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
