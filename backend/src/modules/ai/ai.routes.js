const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");

const controller = require("./ai.controller");

router.get("/weekly-summary", authenticateUser, controller.weeklySummary);

router.get("/health-score", authenticateUser, controller.healthScore);

router.get("/mood-analysis", authenticateUser, controller.moodAnalysis);

router.get("/memory-recap", authenticateUser, controller.memoryRecap);

router.get(
  "/relationship-insights",
  authenticateUser,
  controller.relationshipInsights,
);

module.exports = router;
