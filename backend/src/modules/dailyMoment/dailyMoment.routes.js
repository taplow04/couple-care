const express = require("express");

const router = express.Router();

const authenticateUser = require("../../middleware/authMiddleware");
const controller = require("./dailyMoment.controller");

// Today's recap / encouragement state (dashboard — Feature 5).
router.get("/today", authenticateUser, controller.today);

// Timeline of past Daily Couple Moments (Feature 4 / 10).
router.get("/timeline", authenticateUser, controller.timeline);

// Replays (declared before "/:id" to avoid shadowing — Feature 8 / 9).
router.get("/replay/monthly", authenticateUser, controller.monthlyReplay);
router.get("/replay/yearly", authenticateUser, controller.yearlyReplay);

// Full recap by calendar day (YYYY-MM-DD) or by id.
router.get("/day/:day", authenticateUser, controller.byDay);
router.get("/:id", authenticateUser, controller.byId);

module.exports = router;
