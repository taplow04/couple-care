const express = require("express");
const multer = require("multer");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./moment.controller");
const { MAX_VIDEO_BYTES } = require("./moment.constants");

// In-memory storage — buffer streamed straight to Cloudinary (never disk/DB).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
});

// ── Story circles + capture ──
router.get("/circles", authenticateUser, controller.circles);
router.post("/", authenticateUser, upload.single("file"), controller.upload);

// ── Couple Moment (Feature 12) ──
router.get("/couple/candidate", authenticateUser, controller.coupleCandidate);
router.post("/couple", authenticateUser, controller.createCouple);

// ── Highlights (Feature 11) ── (declared before "/:id" to avoid shadowing)
router.get("/highlights", authenticateUser, controller.listHighlights);
router.post("/highlights", authenticateUser, controller.createHighlight);
router.get("/highlights/:id", authenticateUser, controller.getHighlight);
router.post("/highlights/:id/moments", authenticateUser, controller.addToHighlight);
router.delete(
  "/highlights/:id/moments/:momentId",
  authenticateUser,
  controller.removeFromHighlight,
);
router.delete("/highlights/:id", authenticateUser, controller.deleteHighlight);

// ── Profile integration (Feature 17) ──
router.get("/profile/:ownerId", authenticateUser, controller.profileMoments);

// ── Single moment lifecycle ──
router.patch("/:id/mood", authenticateUser, controller.setMood);
router.patch("/:id/view", authenticateUser, controller.view);
router.post("/:id/react", authenticateUser, controller.react);
router.patch("/:id/keep", authenticateUser, controller.keep);
router.patch("/:id/save-journey", authenticateUser, controller.saveToJourney);
router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
