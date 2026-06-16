const cron = require("node-cron");

const User = require("../users/user.model");

const Mood = require("../moods/mood.model");
const Couple = require("../couples/couple.model");

const { createNotification } = require("./notification.service");

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
};

module.exports = {
  startNotificationJobs,
};
