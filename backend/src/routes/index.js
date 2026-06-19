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
const pushRoutes = require("../modules/push/push.routes");
const engagementRoutes = require("../modules/engagement/engagement.routes");
const bucketRoutes = require("../modules/bucket/bucket.routes");
const letterRoutes = require("../modules/letters/letter.routes");
const coachRoutes = require("../modules/coach/coach.routes");
const storyRoutes = require("../modules/story/story.routes");
const sleepRoutes = require("../modules/sleep/sleep.routes");
const surpriseRoutes = require("../modules/surprise/surprise.routes");

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
router.use("/push", pushRoutes);
router.use("/engagement", engagementRoutes);
router.use("/bucket", bucketRoutes);
router.use("/letters", letterRoutes);
router.use("/coach", coachRoutes);
router.use("/story", storyRoutes);
router.use("/sleep", sleepRoutes);
router.use("/surprise", surpriseRoutes);

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CoupleCare API Running",
  });
});

module.exports = router;
