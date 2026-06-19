const mongoose = require("mongoose");

/**
 * Engagement — a COUPLE-scoped doc (one per couple, 1:1 with Couple) holding the
 * shared Streak + XP state. Like Relationship Health, this belongs to the couple,
 * not the individual: both partners read the same streak and level.
 */
const engagementSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      unique: true,
      index: true,
    },

    // Consecutive days with at least one activity. Day-based (UTC YYYY-MM-DD).
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    // UTC YYYY-MM-DD of the last day the couple did any activity (either partner).
    lastActiveDay: { type: String, default: null },

    // UTC YYYY-MM-DD of the last MUTUAL day (both partners active). The shared
    // streak counts consecutive mutual days — see engagement.service.
    lastMutualDay: { type: String, default: null },

    // Lifetime XP + derived level.
    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    // Weekly XP, reset when the ISO week rolls over (see engagement.service).
    xpThisWeek: { type: Number, default: 0 },
    weekKey: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Engagement", engagementSchema);
