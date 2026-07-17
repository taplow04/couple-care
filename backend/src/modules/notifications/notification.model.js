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
        "daily_moment_ready",
        // ── Relationship Lifecycle (Stage 1 Preparing + Stage 3 Healing) ──
        "growth_reminder",
        "journal_reminder",
        "challenge_ready",
        "readiness_progress",
        "relationship_ended",
        "summary_ready",
        "healing_checkin",
        "reconnect_available",
        // ── AI Relationship Assistant (real-time AI notifications) ──
        "ai_insight",
        "behaviour_change",
        "positive_progress",
        "activity_drop",
        "conversation_reminder",
        "story_reminder",
        "reflection_reminder",
        "date_night_suggestion",
        "good_morning",
        "good_night",
        "coach_recommendation",
        "system",
      ],
      default: "system",
    },

    // Optional second line under the title (AI notifications use it).
    subtitle: {
      type: String,
      default: "",
      maxlength: 200,
    },

    // Notification-center grouping. Defaulted from `type` in the service when
    // the caller doesn't set one, so existing call-sites need no changes.
    category: {
      type: String,
      enum: [
        "ai",
        "relationship",
        "mood",
        "security",
        "memories",
        "stories",
        "calls",
        "chat",
        "goals",
        "system",
      ],
      default: "system",
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    // Optional plain-language "why am I seeing this" — always grounded in
    // in-app behaviour only (privacy-first transparency).
    aiExplanation: {
      type: String,
      default: "",
      maxlength: 500,
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
