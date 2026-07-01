const asyncHandler = require("../../utils/asyncHandler");
const cloudinary = require("../../config/cloudinary");
const exploreService = require("./explore.service");
const exploreAi = require("./explore.ai");
const { CATEGORIES, REACTIONS } = require("./explore.constants");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_VIDEO = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result),
    );
    stream.end(buffer);
  });

// Static taxonomy (categories + reactions) — lets the client render chips without
// hardcoding.
const getMeta = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { categories: CATEGORIES, reactions: REACTIONS } });
});

const getFeed = asyncHandler(async (req, res) => {
  const data = await exploreService.getFeed({
    viewerId: req.user._id,
    category: req.query.category,
    q: req.query.q,
    before: req.query.before,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, data });
});

const getInspiration = asyncHandler(async (req, res) => {
  const data = await exploreService.getInspiration({ viewerId: req.user._id });
  res.status(200).json({ success: true, data });
});

const search = asyncHandler(async (req, res) => {
  const data = await exploreService.searchProfiles(req.query.q);
  res.status(200).json({ success: true, data });
});

const getProfile = asyncHandler(async (req, res) => {
  const data = await exploreService.getPublicProfile(req.params.username, req.user._id);
  res.status(200).json({ success: true, data });
});

const createPost = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: "No file provided" });
  if (!cloudinary.isConfigured()) {
    return res.status(500).json({
      success: false,
      message: "Uploads are not configured on the server (missing Cloudinary credentials).",
    });
  }

  const mime = file.mimetype || "";
  let type;
  if (mime.startsWith("image/")) type = "image";
  else if (mime.startsWith("video/") && ALLOWED_VIDEO.has(mime)) type = "video";
  else {
    return res.status(400).json({ success: false, message: "Only photos and videos are supported" });
  }

  const cap = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > cap) {
    const mb = Math.round(cap / (1024 * 1024));
    return res.status(400).json({ success: false, message: `File must be smaller than ${mb} MB` });
  }

  let uploaded;
  try {
    uploaded = await uploadBuffer(file.buffer, {
      folder: `couple-care/explore/${req.user.currentCoupleId || "shared"}`,
      resource_type: type === "video" ? "video" : "image",
    });
  } catch (err) {
    console.error("[cloudinary] explore upload failed:", err.message);
    const error = new Error(`Upload failed: ${err.message || "Cloudinary error"}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await exploreService.createPost(req.user._id, {
    uploaded,
    type,
    caption: req.body.caption,
    category: req.body.category,
    location: req.body.location,
    visibility: req.body.visibility,
  });
  res.status(201).json({ success: true, data });
});

const deletePost = asyncHandler(async (req, res) => {
  const data = await exploreService.deletePost(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const getMyPosts = asyncHandler(async (req, res) => {
  const data = await exploreService.getMyPosts(req.user._id);
  res.status(200).json({ success: true, data });
});

const react = asyncHandler(async (req, res) => {
  const data = await exploreService.reactToPost(req.user._id, req.params.id, req.body.type);
  res.status(200).json({ success: true, data });
});

const listComments = asyncHandler(async (req, res) => {
  const data = await exploreService.listComments(req.params.id, {
    before: req.query.before,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, data });
});

const addComment = asyncHandler(async (req, res) => {
  const data = await exploreService.addComment(req.user._id, req.params.id, req.body.text);
  res.status(201).json({ success: true, data });
});

const getSettings = asyncHandler(async (req, res) => {
  const data = await exploreService.getSettings(req.user._id);
  res.status(200).json({ success: true, data });
});

const updateSettings = asyncHandler(async (req, res) => {
  const data = await exploreService.updateSettings(req.user._id, req.body);
  res.status(200).json({ success: true, data });
});

const aiInspiration = asyncHandler(async (req, res) => {
  const data = await exploreAi.getInspiration();
  res.status(200).json({ success: true, data });
});

module.exports = {
  getMeta,
  getFeed,
  getInspiration,
  search,
  getProfile,
  createPost,
  deletePost,
  getMyPosts,
  react,
  listComments,
  addComment,
  getSettings,
  updateSettings,
  aiInspiration,
};
