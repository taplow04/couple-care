const cloudinary = require("../../config/cloudinary");
const asyncHandler = require("../../utils/asyncHandler");
const User = require("./user.model");

const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    bio,
    hobbies,
    likes,
    dislikes,
    profilePhoto,
    coverPhoto,
    username,
    birthday,
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new Error("User not found");

  if (name !== undefined) user.name = String(name).trim();
  if (bio !== undefined) user.bio = String(bio).trim();
  if (Array.isArray(hobbies)) user.hobbies = hobbies.slice(0, 15);
  if (Array.isArray(likes)) user.likes = likes.slice(0, 15);
  if (Array.isArray(dislikes)) user.dislikes = dislikes.slice(0, 15);
  if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
  if (coverPhoto !== undefined) user.coverPhoto = coverPhoto;

  if (username !== undefined) {
    // Optional handle: empty clears it; otherwise normalize + validate.
    const handle = String(username).trim().toLowerCase();
    if (handle === "") {
      user.username = null;
    } else if (!/^[a-z0-9_.]{3,20}$/.test(handle)) {
      const err = new Error(
        "Username must be 3–20 chars (letters, numbers, _ or .)",
      );
      err.statusCode = 400;
      throw err;
    } else {
      const taken = await User.findOne({
        username: handle,
        _id: { $ne: user._id },
      }).select("_id");
      if (taken) {
        const err = new Error("That username is already taken");
        err.statusCode = 409;
        throw err;
      }
      user.username = handle;
    }
  }

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
  const { imageData, type } = req.body;

  if (!imageData || typeof imageData !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "No image data provided" });
  }

  // Only accept image data URLs (the frontend sends FileReader base64).
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(imageData)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid image format" });
  }

  if (!cloudinary.isConfigured()) {
    return res.status(500).json({
      success: false,
      message:
        "Image uploads are not configured on the server (missing Cloudinary credentials).",
    });
  }

  // Covers are a wide banner (no face crop); avatars are a square face crop.
  const isCover = type === "cover";
  const folder = isCover ? "couple-care/covers" : "couple-care/avatars";
  const transformation = isCover
    ? [{ width: 1200, height: 480, crop: "fill", gravity: "auto", quality: "auto" }]
    : [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }];

  let result;
  try {
    result = await cloudinary.uploader.upload(imageData, {
      folder,
      transformation,
      resource_type: "image",
    });
  } catch (err) {
    console.error("[cloudinary] avatar upload failed:", err.message);
    const error = new Error(
      `Image upload failed: ${err.message || "Cloudinary error"}`,
    );
    error.statusCode = 502;
    throw error;
  }

  res.status(200).json({ success: true, data: { url: result.secure_url } });
});

const PRIVACY_KEYS = [
  "moodVisibility",
  "memoryVisibility",
  "journeyVisibility",
  "aiVisibility",
  "profileVisibility",
  "activityVisibility",
  // Granular controls added with the Profile Ecosystem.
  "bioVisibility",
  "birthdayVisibility",
  "sleepVisibility",
  "galleryVisibility",
  "videoVisibility",
  "journeyCountVisibility",
  "transparencyVisibility",
  "relationshipGalleryVisibility",
  // Relationship Lifecycle (Stage 1 Preparing + Stage 3 Healing).
  "summaryVisibility",
  "healingVisibility",
  "recoveryVisibility",
  "aiReflectionVisibility",
  "loveLanguageVisibility",
  "attachmentVisibility",
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
