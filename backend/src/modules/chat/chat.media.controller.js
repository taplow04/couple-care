const mongoose = require("mongoose");
const asyncHandler = require("../../utils/asyncHandler");
const cloudinary = require("../../config/cloudinary");
const { getIo } = require("../../utils/realtime");
const Message = require("./message.model");
const { getCoupleByUser, getPartnerId } = require("./chat.helpers");
const { sendPushToUser } = require("../push/push.service");

// Size caps (bytes). Images are compressed by Cloudinary anyway; raw files are
// stored as-is, so they get a higher ceiling.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

// Allowed file (non-image) mime types. Images/audio/video are detected
// separately by their mime prefix below.
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
]);

// Audio (voice notes) — MediaRecorder produces webm/opus on Android & desktop
// Chrome/Firefox, and mp4/aac on iOS Safari. ogg covers Firefox fallbacks.
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/x-m4a",
]);

// Video clips. mp4/quicktime cover phone cameras; webm covers desktop capture.
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
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

  const mime = file.mimetype || "";

  // Resolve the message kind from the mime type. Images/audio/video are matched
  // by prefix (and an allow-list for audio/video); everything else must be in
  // the explicit document allow-list.
  let type;
  if (mime.startsWith("image/")) {
    type = "image";
  } else if (mime.startsWith("audio/") && ALLOWED_AUDIO_TYPES.has(mime)) {
    type = "audio";
  } else if (mime.startsWith("video/") && ALLOWED_VIDEO_TYPES.has(mime)) {
    type = "video";
  } else if (ALLOWED_FILE_TYPES.has(mime)) {
    type = "file";
  } else {
    return res
      .status(400)
      .json({ success: false, message: "This file type is not supported" });
  }

  // Size caps: images get the tighter image ceiling; everything else the larger.
  const sizeCap = type === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (file.size > sizeCap) {
    const mb = Math.round(sizeCap / (1024 * 1024));
    return res
      .status(400)
      .json({ success: false, message: `File must be smaller than ${mb} MB` });
  }

  const caption =
    typeof req.body.text === "string" ? req.body.text.trim().slice(0, 1000) : "";

  // Voice-note / video length (seconds) — best-effort from the client.
  const durationRaw = Number(req.body.mediaDuration);
  const mediaDuration =
    Number.isFinite(durationRaw) && durationRaw > 0
      ? Math.round(durationRaw)
      : null;

  // Optional quoted message id (reply).
  const replyTo =
    typeof req.body.replyTo === "string" &&
    mongoose.Types.ObjectId.isValid(req.body.replyTo)
      ? req.body.replyTo
      : null;

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
    mediaDuration,
    replyTo,
  });

  // Populate the quoted message so the client can render a reply preview live.
  if (replyTo) {
    await message.populate({
      path: "replyTo",
      select: "type text senderId fileName",
    });
  }

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
    mediaDuration: message.mediaDuration,
    reactions: [],
    replyTo: message.replyTo || null,
    seen: false,
    createdAt: message.createdAt,
  };

  // Broadcast to the couple room so both partners render it live — same channel
  // the socket text path uses. Falls back gracefully if io isn't ready.
  const io = getIo();
  if (io) {
    io.to(String(couple._id)).emit("message:receive", payload);
  }

  // OS push to the partner (best-effort).
  getPartnerId(req.user._id)
    .then((partnerId) => {
      if (!partnerId) return;
      const pushBody =
        type === "image"
          ? "📷 Photo"
          : type === "video"
            ? "🎥 Video"
            : type === "audio"
              ? "🎤 Voice message"
              : "📎 File";
      return sendPushToUser(partnerId, {
        title: req.user.name?.split(" ")[0] || "New message",
        body: pushBody,
        data: { url: "/chat" },
        tag: "chat",
      });
    })
    .catch(() => {});

  res.status(201).json({ success: true, data: payload });
});

// Returns only media messages for the couple (shared-media gallery).
const getSharedMedia = asyncHandler(async (req, res) => {
  const couple = await getCoupleByUser(req.user._id);

  const media = await Message.find({
    coupleId: couple._id,
    type: { $in: ["image", "file", "audio", "video"] },
  })
    .sort({ createdAt: -1 })
    .limit(300);

  res.status(200).json({ success: true, data: media });
});

module.exports = { uploadChatMedia, getSharedMedia };
