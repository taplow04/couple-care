const asyncHandler = require("../../utils/asyncHandler");
const cloudinary = require("../../config/cloudinary");
const momentService = require("./moment.service");
const {
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VOICE_BYTES,
  MAX_MEDIA_DURATION_SEC,
} = require("./moment.constants");

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const ALLOWED_VOICE_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/x-m4a",
]);

// Stream a buffer to Cloudinary (same promise wrapper used by gallery/chat).
const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

/**
 * POST /moments — capture upload. Live-capture only (the frontend never offers a
 * gallery picker), but the server still validates type/size/duration and fails
 * gracefully (never crashes) on oversize / wrong type / over-length media.
 */
const upload = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: "No media provided" });
  }
  if (!cloudinary.isConfigured()) {
    return res.status(500).json({
      success: false,
      message: "Uploads are not configured on the server (missing Cloudinary credentials).",
    });
  }

  const mime = file.mimetype || "";
  let type; // moment kind: photo | video | voice
  let resourceType; // cloudinary bucket
  let sizeCap;

  if (mime.startsWith("image/")) {
    type = "photo";
    resourceType = "image";
    sizeCap = MAX_PHOTO_BYTES;
  } else if (mime.startsWith("video/") && ALLOWED_VIDEO_TYPES.has(mime)) {
    type = "video";
    resourceType = "video";
    sizeCap = MAX_VIDEO_BYTES;
  } else if (mime.startsWith("audio/") && ALLOWED_VOICE_TYPES.has(mime)) {
    type = "voice";
    resourceType = "video"; // Cloudinary stores audio under the video resource type
    sizeCap = MAX_VOICE_BYTES;
  } else {
    return res
      .status(400)
      .json({ success: false, message: "This media type is not supported for Moments" });
  }

  if (file.size > sizeCap) {
    const mb = Math.round(sizeCap / (1024 * 1024));
    return res
      .status(400)
      .json({ success: false, message: `This Moment must be smaller than ${mb} MB.` });
  }

  // Duration ceiling (Feature 3/8) — reject over-length video/voice up front.
  const durationRaw = Number(req.body.duration);
  const duration =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null;
  if ((type === "video" || type === "voice") && duration && duration > MAX_MEDIA_DURATION_SEC) {
    return res.status(400).json({
      success: false,
      message: `This ${type} exceeds the current ${MAX_MEDIA_DURATION_SEC}-second limit. Please record a shorter clip.`,
    });
  }

  let uploaded;
  try {
    uploaded = await uploadBuffer(file.buffer, {
      folder: `couple-care/moments/${req.user.currentCoupleId || "couple"}`,
      resource_type: resourceType,
    });
  } catch (e) {
    console.error("[cloudinary] moment upload failed:", e.message);
    const error = new Error(`Upload failed: ${e.message || "Cloudinary error"}`);
    error.statusCode = 502;
    throw error;
  }

  // Cloudinary's measured duration is authoritative — enforce the cap again so a
  // spoofed client `duration` can't slip a long clip through.
  if (
    (type === "video" || type === "voice") &&
    uploaded.duration &&
    Math.round(uploaded.duration) > MAX_MEDIA_DURATION_SEC
  ) {
    cloudinary.uploader
      .destroy(uploaded.public_id, { resource_type: resourceType })
      .catch(() => {});
    return res.status(400).json({
      success: false,
      message: `This ${type} exceeds the current ${MAX_MEDIA_DURATION_SEC}-second limit. Please record a shorter clip.`,
    });
  }

  const moment = await momentService.createMoment(req.user._id, {
    type,
    uploaded,
    caption: req.body.caption,
    privacy: req.body.privacy,
    duration,
    mood: req.body.mood,
  });

  res.status(201).json({ success: true, data: moment });
});

const circles = asyncHandler(async (req, res) => {
  const data = await momentService.getCircles(req.user._id);
  res.status(200).json({ success: true, data });
});

const setMood = asyncHandler(async (req, res) => {
  const data = await momentService.setMoodForMoment(req.user._id, req.params.id, {
    mood: req.body.mood,
    source: req.body.source,
  });
  res.status(200).json({ success: true, data });
});

const view = asyncHandler(async (req, res) => {
  const data = await momentService.markViewed(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const react = asyncHandler(async (req, res) => {
  const data = await momentService.reactToMoment(req.user._id, req.params.id, req.body.emoji);
  res.status(200).json({ success: true, data });
});

const keep = asyncHandler(async (req, res) => {
  const data = await momentService.keepMoment(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const saveToJourney = asyncHandler(async (req, res) => {
  const data = await momentService.saveToJourneyById(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  const data = await momentService.deleteMoment(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const coupleCandidate = asyncHandler(async (req, res) => {
  const data = await momentService.getCoupleMomentCandidate(req.user._id);
  res.status(200).json({ success: true, data });
});

const createCouple = asyncHandler(async (req, res) => {
  const data = await momentService.createCoupleMoment(req.user._id, req.body.momentIds);
  res.status(201).json({ success: true, data });
});

const listHighlights = asyncHandler(async (req, res) => {
  const data = await momentService.listHighlights(req.user._id);
  res.status(200).json({ success: true, data });
});

const getHighlight = asyncHandler(async (req, res) => {
  const data = await momentService.getHighlight(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const createHighlight = asyncHandler(async (req, res) => {
  const data = await momentService.createHighlight(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

const addToHighlight = asyncHandler(async (req, res) => {
  const data = await momentService.addToHighlight(
    req.user._id,
    req.params.id,
    req.body.momentId,
  );
  res.status(200).json({ success: true, data });
});

const removeFromHighlight = asyncHandler(async (req, res) => {
  const data = await momentService.removeFromHighlight(
    req.user._id,
    req.params.id,
    req.params.momentId,
  );
  res.status(200).json({ success: true, data });
});

const deleteHighlight = asyncHandler(async (req, res) => {
  const data = await momentService.deleteHighlight(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const profileMoments = asyncHandler(async (req, res) => {
  const ownerId = req.params.ownerId === "me" ? req.user._id : req.params.ownerId;
  const data = await momentService.listForProfile(req.user._id, ownerId);
  res.status(200).json({ success: true, data });
});

module.exports = {
  upload,
  circles,
  setMood,
  view,
  react,
  keep,
  saveToJourney,
  remove,
  coupleCandidate,
  createCouple,
  listHighlights,
  getHighlight,
  createHighlight,
  addToHighlight,
  removeFromHighlight,
  deleteHighlight,
  profileMoments,
};
