const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const c = require("./growth.controller");

// All routes are user-scoped (solo growth). No couple required.
router.use(authenticateUser);

router.get("/", c.summary);
router.get("/tip", c.dailyTip);
router.get("/mood-summary", c.moodSummary);

// Journal / reflection / gratitude
router.get("/journal", c.listJournal);
router.post("/journal", c.addJournal);
router.get("/journal/:type/today", c.todayEntry);
router.delete("/journal/:id", c.deleteJournal);

// Daily challenge
router.get("/challenge/today", c.todayChallenge);
router.patch("/challenge/complete", c.completeChallenge);

// Quizzes
router.get("/quizzes", c.quizzes);
router.post("/readiness", c.readiness);
router.post("/love-language", c.loveLanguage);
router.post("/attachment", c.attachment);

module.exports = router;
