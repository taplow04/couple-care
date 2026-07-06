const mongoose = require("mongoose");

/**
 * IntelSnapshot — the CCIE time-series. One row per (subject, engine, UTC day),
 * upserted on each recompute. This is the history the LEARNING engine reads to
 * compare a couple/user against its OWN past (never other couples), and the
 * MEMORY engine reads to assemble trends/timelines. No binary, just scores.
 */
const intelSnapshotSchema = new mongoose.Schema(
  {
    // Either a couple (health/trust/growth/memory) or a user (emotion).
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    scope: { type: String, enum: ["couple", "user"], required: true },
    engine: {
      type: String,
      enum: [
        "relationshipHealth",
        "emotion",
        "trust",
        "growth",
        "memory",
        "maturity", // per-user Relationship Maturity
        "behavior", // couple Behaviour Intelligence
        "healing", // per-user Healing Progress
      ],
      required: true,
    },
    day: { type: String, required: true }, // UTC YYYY-MM-DD

    score: { type: Number, default: null },
    confidence: { type: Number, default: null },
    level: { type: String, default: null },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    factors: { type: mongoose.Schema.Types.Mixed, default: null },
    context: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// One snapshot per subject/engine/day (race-safe upsert target).
intelSnapshotSchema.index({ subjectId: 1, engine: 1, day: 1 }, { unique: true });
intelSnapshotSchema.index({ subjectId: 1, engine: 1, createdAt: -1 });

module.exports = mongoose.model("IntelSnapshot", intelSnapshotSchema);
