const cron = require("node-cron");

const User = require("../users/user.model");

const Mood = require("../moods/mood.model");
const Couple = require("../couples/couple.model");
const Engagement = require("../engagement/engagement.model");
const ActivityLog = require("../engagement/activityLog.model");

const { createNotification } = require("./notification.service");
const { expireMoments } = require("../moments/moment.service");
const { finalizeYesterday } = require("../dailyMoment/dailyMoment.service");

// UTC YYYY-MM-DD — must match engagement.service.dayKey.
const todayKey = () => new Date().toISOString().slice(0, 10);

// Whole days from today until the next occurrence of a birthday (ignores year).
const daysUntilBirthday = (birthday) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(birthday);
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
  }
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
};

const startNotificationJobs = () => {
  // Daily mood reminder.
  cron.schedule("0 20 * * *", async () => {
    console.log("Running Mood Reminder Job");

    const users = await User.find();

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    for (const user of users) {
      const mood = await Mood.findOne({
        userId: user._id,

        createdAt: {
          $gte: today,
        },
      });

      if (!mood) {
        await createNotification({
          userId: user._id,

          title: "Mood Reminder",

          message: "You haven't logged your mood today.",

          type: "mood_reminder",
        });
      }
    }
  });

  // Daily birthday reminder: notify each user about their partner's upcoming
  // birthday at 7 days, 1 day, and on the day. Runs once a day so each
  // threshold fires exactly once.
  cron.schedule("0 9 * * *", async () => {
    console.log("Running Birthday Reminder Job");

    const couples = await Couple.find({
      relationshipStatus: "active",
      partnerTwoId: { $ne: null },
    })
      .populate("partnerOneId", "name birthday")
      .populate("partnerTwoId", "name birthday");

    for (const couple of couples) {
      const pairs = [
        [couple.partnerOneId, couple.partnerTwoId],
        [couple.partnerTwoId, couple.partnerOneId],
      ];

      for (const [celebrant, recipient] of pairs) {
        if (!celebrant?.birthday || !recipient?._id) continue;

        const days = daysUntilBirthday(celebrant.birthday);
        const first = celebrant.name?.split(" ")[0] || "Your partner";

        let message = null;
        if (days === 0) message = `🎂 It's ${first}'s birthday today! Make it special.`;
        else if (days === 1) message = `🎁 ${first}'s birthday is tomorrow!`;
        else if (days === 7) message = `📅 ${first}'s birthday is in a week.`;

        if (message) {
          await createNotification({
            userId: recipient._id,
            title: "Birthday Reminder",
            message,
            type: "birthday_reminder",
            metadata: { celebrantId: celebrant._id, daysUntil: days },
          });
        }
      }
    }
  });

  // Daily streak reminder (7pm): gently nudge couples with a live streak who
  // haven't done any activity today, so it doesn't break. Encouraging, NOT
  // punishing — and only sent when there's an active streak worth protecting.
  cron.schedule("0 19 * * *", async () => {
    console.log("Running Streak Reminder Job");

    const day = todayKey();

    const streaks = await Engagement.find({ currentStreak: { $gte: 1 } });

    for (const eng of streaks) {
      // Skip if they've already kept the streak alive today.
      const activeToday = await ActivityLog.exists({
        coupleId: eng.coupleId,
        day,
      });
      if (activeToday) continue;

      const couple = await Couple.findById(eng.coupleId).select(
        "partnerOneId partnerTwoId relationshipStatus",
      );
      if (!couple || couple.relationshipStatus !== "active") continue;

      const recipients = [couple.partnerOneId, couple.partnerTwoId].filter(
        Boolean,
      );
      for (const userId of recipients) {
        await createNotification({
          userId,
          title: `🔥 Keep your ${eng.currentStreak}-day streak alive`,
          message:
            "A quick mood, message, or memory today keeps your streak going. You've got this! 💕",
          type: "streak_reminder",
          metadata: { streak: eng.currentStreak },
        });
      }
    }
  });

  // Daily Couple Moment finalize + reconcile (00:20 UTC). Freezes yesterday's
  // recaps and back-fills any that the live trigger missed (server restart /
  // race), so the relationship timeline never has a gap (Feature 1 / 16).
  cron.schedule(
    "20 0 * * *",
    async () => {
      try {
        const { finalized, created } = await finalizeYesterday();
        console.log(
          `Daily Couple Moment finalize: froze ${finalized}, reconciled ${created}`,
        );
      } catch (e) {
        console.error("Daily Couple Moment finalize job failed:", e.message);
      }
    },
    { timezone: "UTC" },
  );

  // Moments expiry sweep (every 10 minutes). Save-aware: kept / highlighted /
  // journey moments survive; `save_journey` moments auto-create a Memory; the
  // rest have their Cloudinary asset destroyed and the doc removed (Feature 10).
  cron.schedule("*/10 * * * *", async () => {
    try {
      const destroyed = await expireMoments();
      if (destroyed > 0) console.log(`Moments expiry: removed ${destroyed}`);
    } catch (e) {
      console.error("Moments expiry job failed:", e.message);
    }
  });
};

module.exports = {
  startNotificationJobs,
};
