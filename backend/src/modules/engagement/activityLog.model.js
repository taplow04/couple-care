const mongoose = require("mongoose");

const { ACTIVITY_TYPE_LIST } = require("./engagement.constants");

/**
 * ActivityLog — append-only record of every engagement action. Powers the
 * streak calc, XP, achievement evaluation, the Story Timeline, and analytics.
 * One row per action (even repeats on the same day, for a rich timeline), but
 * XP is only awarded on the first of each type per day (`xpAwarded`).
 */
const activityLogSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ACTIVITY_TYPE_LIST,
      required: true,
    },

    // UTC YYYY-MM-DD — the calendar day this activity counts toward.
    day: { type: String, required: true },

    xpAwarded: { type: Number, default: 0 },

    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

activityLogSchema.index({ coupleId: 1, day: 1 });
activityLogSchema.index({ coupleId: 1, type: 1, day: 1 });
activityLogSchema.index({ coupleId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
