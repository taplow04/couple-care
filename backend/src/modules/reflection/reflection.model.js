const mongoose = require("mongoose");

/**
 * DailyReflection — ONE optional self check-in per user per UTC day (Feature:
 * AI Daily Reflection Engine). Everything here is EXPLICITLY user-provided —
 * this collection is the "self-reported" half of the intelligence layer (the
 * behavioural half comes from ActivityLog/IntelSnapshot).
 *
 * Numeric dimensions are 1–10 sliders (null = the user skipped that field —
 * every field is optional so a 10-second check-in still counts). Unique
 * {userId, day} is the race guard: saving twice in a day UPDATES the entry.
 */
const dailyReflectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of the couple at write time (null for solo users) so couple
    // analytics survive an unmatch without touching past entries.
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
      index: true,
    },

    // UTC YYYY-MM-DD — matches engagement.service.dayKey.
    day: { type: String, required: true },

    // ── 1–10 self-ratings (all optional) ──
    energy: { type: Number, min: 1, max: 10, default: null },
    stress: { type: Number, min: 1, max: 10, default: null },
    sleepQuality: { type: Number, min: 1, max: 10, default: null },
    productivity: { type: Number, min: 1, max: 10, default: null },
    exercise: { type: Number, min: 0, max: 10, default: null },
    mood: { type: Number, min: 1, max: 10, default: null },
    relationshipSatisfaction: { type: Number, min: 1, max: 10, default: null },
    communicationRating: { type: Number, min: 1, max: 10, default: null },

    // ── free-text (all optional) ──
    gratitude: { type: String, default: "", maxlength: 500, trim: true },
    partnerAppreciation: { type: String, default: "", maxlength: 500, trim: true },
    highlight: { type: String, default: "", maxlength: 300, trim: true },
    challenge: { type: String, default: "", maxlength: 300, trim: true },
    notes: { type: String, default: "", maxlength: 1000, trim: true },
  },
  { timestamps: true },
);

// One reflection per user per day (upsert target).
dailyReflectionSchema.index({ userId: 1, day: 1 }, { unique: true });
dailyReflectionSchema.index({ userId: 1, day: -1 });

module.exports = mongoose.model("DailyReflection", dailyReflectionSchema);
