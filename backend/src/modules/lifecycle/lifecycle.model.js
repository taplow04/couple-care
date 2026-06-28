const mongoose = require("mongoose");

/**
 * GrowthReport — a PRIVATE post-breakup reflection that belongs ONLY to the user.
 * It is never shared with any partner, current or future (enforced in code, not
 * via a privacy setting). Captures the user's own answers to reflection
 * questions + an AI-generated growth report.
 */
const growthReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The ended couple this reflection is about (for context only — never used to
    // expose anything to the other partner).
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
    },
    answers: {
      type: [
        {
          question: String,
          answer: String,
          _id: false,
        },
      ],
      default: [],
    },
    aiReport: {
      text: { type: String, default: "" },
      status: { type: String, enum: ["pending", "ready", "failed"], default: "pending" },
    },
  },
  { timestamps: true },
);
growthReportSchema.index({ userId: 1, createdAt: -1 });

const GrowthReport = mongoose.model("GrowthReport", growthReportSchema);

module.exports = { GrowthReport };
