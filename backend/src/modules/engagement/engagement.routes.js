const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./engagement.controller");

router.get("/", authenticateUser, controller.getEngagement);

router.get("/achievements", authenticateUser, controller.getAchievements);

module.exports = router;
