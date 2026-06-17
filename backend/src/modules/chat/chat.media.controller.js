const asyncHandler = require("../../utils/asyncHandler");
const cloudinary = require("../../config/cloudinary");
const { getIo } = require("../../utils/realtime");
const Message = require("./message.model");
const { getCoupleByUser } = require("./chat.helpers");

// Size caps (bytes). Images are compressed by Cloudinary anyway; raw files are
// stored as-is, so they get a higher ceiling.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

// Allowed file (non-image) mime types. Images are detected separately.
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
]);

// Wrap cloudinary's stream upload in a promise.
const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

const uploadChatMedia = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: "No file provided" });
  }

  if (!cloudinary.isConfigured()) {
    return res.status(500).json({
      success: false,
      message:
        "File uploads are not configured on the server (missing Cloudinary credentials).",
    });
  }

  const couple = await getCoupleByUser(req.user._id);

  const isImage = file.mimetype.startsWith("image/");
  const type = isImage ? "image" : "file";

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return res
      .status(400)
      .json({ success: false, message: "Image must be smaller than 10 MB" });
  }
  if (!isImage) {
    if (file.size > MAX_FILE_BYTES) {
      return res
        .status(400)
        .json({ success: false, message: "File must be smaller than 25 MB" });
    }
    if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
      return res
        .status(400)
        .json({ success: false, message: "This file type is not supported" });
    }
  }

  const caption =
    typeof req.body.text === "string" ? req.body.text.trim().slice(0, 1000) : "";

  let result;
  try {
    result = await uploadBuffer(file.buffer, {
      folder: `couple-care/chat/${couple._id}`,
      // "auto" lets non-image files upload as raw resources.
      resource_type: "auto",
      // Preserve the original filename for downloads.
      use_filename: true,
      filename_override: file.originalname,
      unique_filename: true,
    });
  } catch (err) {
    console.error("[cloudinary] chat upload failed:", err.message);
    const error = new Error(
      `Upload failed: ${err.message || "Cloudinary error"}`,
    );
    error.statusCode = 502;
    throw error;
  }

  const message = await Message.create({
    coupleId: couple._id,
    senderId: req.user._id,
    type,
    text: caption || undefined,
    mediaUrl: result.secure_url,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    width: result.width || null,
    height: result.height || null,
  });

  const payload = {
    _id: message._id,
    coupleId: String(couple._id),
    senderId: req.user._id,
    type: message.type,
    text: message.text || "",
    mediaUrl: message.mediaUrl,
    fileName: message.fileName,
    fileSize: message.fileSize,
    mimeType: message.mimeType,
    width: message.width,
    height: message.height,
    seen: false,
    createdAt: message.createdAt,
  };

  // Broadcast to the couple room so both partners render it live — same channel
  // the socket text path uses. Falls back gracefully if io isn't ready.
  const io = getIo();
  if (io) {
    io.to(String(couple._id)).emit("message:receive", payload);
  }

  res.status(201).json({ success: true, data: payload });
});

// Returns only media messages for the couple (shared-media gallery).
const getSharedMedia = asyncHandler(async (req, res) => {
  const couple = await getCoupleByUser(req.user._id);

  const media = await Message.find({
    coupleId: couple._id,
    type: { $in: ["image", "file"] },
  })
    .sort({ createdAt: -1 })
    .limit(200);

  res.status(200).json({ success: true, data: media });
});

module.exports = { uploadChatMedia, getSharedMedia };
