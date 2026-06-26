const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    type: {
      type: String,
      enum: [
        "mood_reminder",
        "memory_reminder",
        "anniversary_reminder",
        "weekly_summary_ready",
        "relationship_milestone",
        "partner_mood_alert",
        "birthday_reminder",
        "streak_reminder",
        "streak_milestone",
        "achievement_unlocked",
        "bucket_completed",
        "surprise_ready",
        "love_letter_received",
        "sleep_reminder",
        "moment_new",
        "moment_viewed",
        "moment_reaction",
        "couple_moment_ready",
        "system",
      ],
      default: "system",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({
  userId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Notification", notificationSchema);
