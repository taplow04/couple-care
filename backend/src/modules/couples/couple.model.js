const mongoose = require("mongoose");

const coupleSchema = new mongoose.Schema(
  {
    partnerOneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    partnerTwoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    pairCode: {
      type: String,
      unique: true,
    },

    relationshipStatus: {
      type: String,
      enum: ["active", "paused", "broken_up"],
      default: "active",
    },

    // Auto-set when the couple record is created (legacy "days together" basis).
    relationshipStartedAt: {
      type: Date,
      default: Date.now,
    },

    // The REAL date the partners started dating, captured during onboarding.
    // Falls back to relationshipStartedAt when not provided (see couple.helpers).
    relationshipStartDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Couple", coupleSchema);
