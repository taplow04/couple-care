const express = require("express");
const multer = require("multer");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./gallery.controller");

// In-memory storage — buffer is streamed straight to Cloudinary (never disk/DB).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/", authenticateUser, controller.listMine);
router.get("/relationship", authenticateUser, controller.listRelationship);
router.get("/stats", authenticateUser, controller.stats);
router.post("/", authenticateUser, upload.single("file"), controller.upload);
router.patch("/:id", authenticateUser, controller.update);
router.delete("/:id", authenticateUser, controller.remove);

module.exports = router;
