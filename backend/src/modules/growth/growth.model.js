const mongoose = require("mongoose");

/**
 * Self-growth collections (Stage 1 "Preparing For Love" + Stage 3 "Healing").
 * All are USER-scoped (solo) — these stages have no couple. `day` is UTC
 * YYYY-MM-DD, identical to engagement.service.dayKey, so "today" agrees across
 * the app.
 */

// Journal / reflection / gratitude entries. Reflection + gratitude are the
// daily prompted ones (one per day each); journal is free-form (many per day).
const growthJournalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["journal", "reflection", "gratitude"],
      default: "journal",
      index: true,
    },
    day: { type: String, required: true }, // UTC YYYY-MM-DD
    prompt: { type: String, default: "" },
    content: { type: String, required: true, trim: true },
    mood: { type: String, default: null },
    // Stage context the entry was written in (preparing | healing) — lets the
    // Healing "Reflect" surface show only healing-era entries.
    stage: { type: String, enum: ["preparing", "healing"], default: "preparing" },
    visibility: {
      type: String,
      enum: ["private", "partner_only", "shared"],
      default: "private",
    },
  },
  { timestamps: true },
);
growthJournalSchema.index({ userId: 1, type: 1, day: -1 });

// One deterministic daily challenge per user per day. The catalog (definitions)
// is code; this collection only stores the picked + completion state.
const growthChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    day: { type: String, required: true }, // UTC YYYY-MM-DD
    key: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, default: "growth" },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
// One challenge per user per day (race-safe).
growthChallengeSchema.index({ userId: 1, day: 1 }, { unique: true });

const GrowthJournal = mongoose.model("GrowthJournal", growthJournalSchema);
const GrowthChallenge = mongoose.model("GrowthChallenge", growthChallengeSchema);

module.exports = { GrowthJournal, GrowthChallenge };
