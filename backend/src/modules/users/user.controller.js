const cloudinary = require("cloudinary").v2;
const asyncHandler = require("../../utils/asyncHandler");
const User = require("./user.model");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, hobbies, likes, dislikes, profilePhoto, birthday } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new Error("User not found");

  if (name !== undefined) user.name = String(name).trim();
  if (bio !== undefined) user.bio = String(bio).trim();
  if (Array.isArray(hobbies)) user.hobbies = hobbies.slice(0, 15);
  if (Array.isArray(likes)) user.likes = likes.slice(0, 15);
  if (Array.isArray(dislikes)) user.dislikes = dislikes.slice(0, 15);
  if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

  if (birthday !== undefined) {
    if (birthday === null || birthday === "") {
      user.birthday = null;
    } else {
      const parsed = new Date(birthday);
      if (isNaN(parsed.getTime())) {
        const err = new Error("Invalid birthday");
        err.statusCode = 400;
        throw err;
      }
      if (parsed.getTime() > Date.now()) {
        const err = new Error("Birthday cannot be in the future");
        err.statusCode = 400;
        throw err;
      }
      user.birthday = parsed;
    }
  }

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

const PRIVACY_KEYS = [
  "moodVisibility",
  "memoryVisibility",
  "journeyVisibility",
  "aiVisibility",
  "profileVisibility",
  "activityVisibility",
];
const PRIVACY_VALUES = ["private", "partner_only", "shared"];

const getPrivacy = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user.privacy });
});

const updatePrivacy = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new Error("User not found");

  for (const key of PRIVACY_KEYS) {
    const value = req.body[key];
    if (value === undefined) continue;
    if (!PRIVACY_VALUES.includes(value)) {
      const err = new Error(`Invalid value for ${key}`);
      err.statusCode = 400;
      throw err;
    }
    user.privacy[key] = value;
  }

  await user.save();

  res.status(200).json({ success: true, data: user.privacy });
});

module.exports = { updateProfile, uploadPhoto, getPrivacy, updatePrivacy };
