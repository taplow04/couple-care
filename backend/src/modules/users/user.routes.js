const express = require("express");
const authenticateUser = require("../../middleware/authMiddleware");
const {
  updateProfile,
  uploadPhoto,
  getPrivacy,
  updatePrivacy,
} = require("./user.controller");

const router = express.Router();

router.patch("/profile", authenticateUser, updateProfile);
router.post("/upload-photo", authenticateUser, uploadPhoto);
router.get("/privacy", authenticateUser, getPrivacy);
router.patch("/privacy", authenticateUser, updatePrivacy);

module.exports = router;
