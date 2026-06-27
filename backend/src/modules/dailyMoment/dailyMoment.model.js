const mongoose = require("mongoose");
const { AI_STATUS } = require("./dailyMoment.constants");

/**
 * DailyCoupleMoment — ONE document per couple per UTC calendar day, created the
 * moment BOTH partners have shared at least one Moment that day. Unlike the
 * ephemeral `Moment` (24h), this is a LASTING relationship-timeline entry.
 *
 * It stores a denormalised stats snapshot + a short AI summary so the dashboard
 * recap card and the Monthly/Yearly replays render from one cheap read (no
 * re-aggregation per request). For "today" the stats are kept fresh on read
 * until the nightly cron `finalizes` the day and freezes them.
 *
 * No media binary is stored — only references to the underlying Moment ids and
 * a cover URL (Cloudinary), mirroring Moment / GalleryItem / Message.
 */
const dailyCoupleMomentSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    // UTC YYYY-MM-DD — must match engagement.service.dayKey so the two systems
    // agree on "the same day".
    day: { type: String, required: true },
    // Midnight UTC of `day`, for range queries (month/year replays) + sorting.
    date: { type: Date, required: true, index: true },

    // Distinct authors who posted a (non-private) Moment that day.
    authorIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    // The underlying Moments that make up this day.
    momentIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Moment" }],
      default: [],
    },

    // Denormalised stats snapshot (Feature 2).
    counts: {
      moments: { type: Number, default: 0 },
      photos: { type: Number, default: 0 },
      videos: { type: Number, default: 0 },
      voices: { type: Number, default: 0 },
    },
    messageCount: { type: Number, default: 0 },
    // Most-logged mood across BOTH partners that day (couple-level).
    topMood: { type: String, default: null },
    // Streak length on the day this recap was created.
    streak: { type: Number, default: 0 },
    // XP attributed to the day (display metadata — see constants).
    xpAwarded: { type: Number, default: 0 },

    // First photo/poster-frame for the card hero.
    coverUrl: { type: String, default: "" },

    // Short Groq summary (Feature 3) — generated in the background, best-effort.
    ai: {
      summary: { type: String, default: "" },
      status: {
        type: String,
        enum: Object.values(AI_STATUS),
        default: AI_STATUS.PENDING,
      },
      generatedAt: { type: Date, default: null },
    },

    // Set by the nightly cron once the day is over → stats are frozen and reads
    // stop recomputing them.
    finalized: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One recap per couple per day (also the race guard for concurrent creates).
dailyCoupleMomentSchema.index({ coupleId: 1, day: 1 }, { unique: true });
// Timeline / replay range scans.
dailyCoupleMomentSchema.index({ coupleId: 1, date: -1 });

module.exports = mongoose.model("DailyCoupleMoment", dailyCoupleMomentSchema);
