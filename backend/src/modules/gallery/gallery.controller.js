const asyncHandler = require("../../utils/asyncHandler");
const cloudinary = require("../../config/cloudinary");
const galleryService = require("./gallery.service");

// Size caps mirror the chat media controller.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

// Stream a buffer to Cloudinary (promise wrapper — same pattern as chat media).
const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

const upload = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: "No file provided" });
  }

  if (!cloudinary.isConfigured()) {
    return res.status(500).json({
      success: false,
      message:
        "Uploads are not configured on the server (missing Cloudinary credentials).",
    });
  }

  const mime = file.mimetype || "";
  let type;
  if (mime.startsWith("image/")) {
    type = "image";
  } else if (mime.startsWith("video/") && ALLOWED_VIDEO_TYPES.has(mime)) {
    type = "video";
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Only photos and videos are supported" });
  }

  const sizeCap = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > sizeCap) {
    const mb = Math.round(sizeCap / (1024 * 1024));
    return res
      .status(400)
      .json({ success: false, message: `File must be smaller than ${mb} MB` });
  }

  const scope = req.body.scope === "relationship" ? "relationship" : "personal";
  const caption =
    typeof req.body.caption === "string" ? req.body.caption.trim().slice(0, 500) : "";
  const visibility = req.body.visibility;

  const folder =
    scope === "relationship"
      ? `couple-care/relationship/${req.user.currentCoupleId || "shared"}`
      : `couple-care/gallery/${req.user._id}`;

  let uploaded;
  try {
    uploaded = await uploadBuffer(file.buffer, {
      folder,
      resource_type: type === "video" ? "video" : "image",
    });
  } catch (err) {
    console.error("[cloudinary] gallery upload failed:", err.message);
    const error = new Error(`Upload failed: ${err.message || "Cloudinary error"}`);
    error.statusCode = 502;
    throw error;
  }

  const item = await galleryService.createItem(req.user._id, {
    scope,
    type,
    uploaded,
    caption,
    visibility,
  });

  res.status(201).json({ success: true, data: item });
});

const listMine = asyncHandler(async (req, res) => {
  const items = await galleryService.listPersonal(req.user._id);
  res.status(200).json({ success: true, data: items });
});

const listRelationship = asyncHandler(async (req, res) => {
  const { getCoupleByUser } = require("../chat/chat.helpers");
  const couple = await getCoupleByUser(req.user._id);
  const items = await galleryService.listRelationship(couple._id);
  res.status(200).json({ success: true, data: items });
});

const stats = asyncHandler(async (req, res) => {
  const data = await galleryService.getStats(req.user._id);
  res.status(200).json({ success: true, data });
});

const update = asyncHandler(async (req, res) => {
  const item = await galleryService.updateItem(req.user._id, req.params.id, {
    caption: req.body.caption,
    visibility: req.body.visibility,
  });
  res.status(200).json({ success: true, data: item });
});

const remove = asyncHandler(async (req, res) => {
  const data = await galleryService.deleteItem(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

module.exports = { upload, listMine, listRelationship, stats, update, remove };
