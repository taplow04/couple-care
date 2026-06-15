const cloudinary = require("cloudinary").v2;
const asyncHandler = require("../../utils/asyncHandler");
const User = require("./user.model");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, hobbies, likes, dislikes, profilePhoto } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new Error("User not found");

  if (name !== undefined) user.name = String(name).trim();
  if (bio !== undefined) user.bio = String(bio).trim();
  if (Array.isArray(hobbies)) user.hobbies = hobbies.slice(0, 15);
  if (Array.isArray(likes)) user.likes = likes.slice(0, 15);
  if (Array.isArray(dislikes)) user.dislikes = dislikes.slice(0, 15);
  if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

  await user.save();

  const updated = user.toObject();
  delete updated.password;
  delete updated.emailVerificationToken;
  delete updated.passwordResetToken;

  res.status(200).json({ success: true, data: updated });
});

const uploadPhoto = asyncHandler(async (req, res) => {
  const { imageData } = req.body;

  if (!imageData) {
    return res.status(400).json({ success: false, message: "No image data provided" });
  }

  const result = await cloudinary.uploader.upload(imageData, {
    folder: "couple-care/avatars",
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" },
    ],
    resource_type: "image",
  });

  res.status(200).json({ success: true, data: { url: result.secure_url } });
});

module.exports = { updateProfile, uploadPhoto };
