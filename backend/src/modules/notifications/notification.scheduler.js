const cron = require("node-cron");

const User = require("../users/user.model");

const Mood = require("../moods/mood.model");

const { createNotification } = require("./notification.service");

const startNotificationJobs = () => {
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
};

module.exports = {
  startNotificationJobs,
};
