const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./explore.controller");

const router = express.Router();

// In-memory storage → streamed to Cloudinary (never disk/DB).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Reads are polled by the feed — looser limiter than writes.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticateUser);

// Taxonomy + discovery
router.get("/meta", controller.getMeta);
router.get("/feed", readLimiter, controller.getFeed);
router.get("/inspiration", readLimiter, controller.getInspiration);
router.get("/ai-inspiration", controller.aiInspiration);
router.get("/search", readLimiter, controller.search);
router.get("/profile/:username", readLimiter, controller.getProfile);
router.get("/user/:username", readLimiter, controller.getUserProfile);

// Posts (couple-owned)
router.get("/my-posts", controller.getMyPosts);
router.post("/posts", upload.single("file"), controller.createPost);
router.delete("/posts/:id", controller.deletePost);

// Reactions + comments
router.post("/posts/:id/react", controller.react);
router.get("/posts/:id/comments", readLimiter, controller.listComments);
router.post("/posts/:id/comments", controller.addComment);

// Explore settings (public-profile opt-in)
router.get("/settings", controller.getSettings);
router.patch("/settings", controller.updateSettings);

module.exports = router;
