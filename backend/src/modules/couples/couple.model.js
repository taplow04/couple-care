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

    // ── Relationship Profile media (shared, either partner can set) ──
    // Wide banner for the Relationship Profile header.
    coverPhoto: {
      type: String,
      default: "",
    },
    // The couple "relationship picture" (the two of them together).
    relationshipPhoto: {
      type: String,
      default: "",
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

    // ─── Relationship Health (a COUPLE metric — identical for both partners) ──
    // Cached result of couples/health.service.computeCoupleHealth. Recomputed on
    // read and on relevant writes (mood/memory). Stored here so the score is
    // owned by the couple, can back real-time emits, and supports history.
    healthScore: {
      type: Number,
      default: null,
    },
    healthLevel: {
      type: String,
      default: null,
    },
    healthBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    healthUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Couple", coupleSchema);
