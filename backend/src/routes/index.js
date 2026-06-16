const express = require("express");

const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");

const coupleRoutes = require("../modules/couples/couple.routes");

const historyRoutes = require("../modules/histories/history.routes");

const moodRoutes = require("../modules/moods/mood.routes");

const dashBoardRoutes = require("../modules/dashboard/dashboard.routes");

const chatRoutes = require("../modules/chat/chat.routes");

const memoryRoutes = require("../modules/memories/memory.routes");

const aiRoutes = require("../modules/ai/ai.routes");

const notificationRoutes = require("../modules/notifications/notification.routes");
const securityRoutes = require("../modules/security/security.routes");
const userRoutes = require("../modules/users/user.routes");
const callRoutes = require("../modules/calls/call.routes");

router.use("/auth", authRoutes);

router.use("/couples", coupleRoutes);

router.use("/histories", historyRoutes);

router.use("/moods", moodRoutes);

router.use("/dashboard", dashBoardRoutes);

router.use("/chat", chatRoutes);

router.use("/memories", memoryRoutes);

router.use("/ai", aiRoutes);

router.use("/notifications", notificationRoutes);

router.use("/security", securityRoutes);
router.use("/users", userRoutes);
router.use("/calls", callRoutes);

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CoupleCare API Running",
  });
});

module.exports = router;
