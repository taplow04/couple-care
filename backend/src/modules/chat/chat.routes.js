const express = require("express");
const multer = require("multer");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./chat.controller");
const mediaController = require("./chat.media.controller");

// In-memory storage — the buffer is streamed straight to Cloudinary, never
// written to disk or stored in MongoDB. Hard cap matches the file ceiling.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/messages", authenticateUser, controller.send);

router.get("/messages", authenticateUser, controller.getAll);

router.get("/unread-count", authenticateUser, controller.unreadCount);

router.patch("/seen-all", authenticateUser, controller.seenAll);

router.post(
  "/upload",
  authenticateUser,
  upload.single("file"),
  mediaController.uploadChatMedia,
);

router.get("/media", authenticateUser, mediaController.getSharedMedia);

router.patch("/messages/:id/seen", authenticateUser, controller.seen);
router.delete("/messages/:id", authenticateUser, controller.remove);

module.exports = router;
