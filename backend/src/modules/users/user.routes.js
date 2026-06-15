const express = require("express");
const authenticateUser = require("../../middleware/authMiddleware");
const { updateProfile, uploadPhoto } = require("./user.controller");

const router = express.Router();

router.patch("/profile", authenticateUser, updateProfile);
router.post("/upload-photo", authenticateUser, uploadPhoto);

module.exports = router;
