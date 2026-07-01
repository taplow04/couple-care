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

    // ── 🌍 Explore / public Relationship Profile ──
    // Optional public handle for the couple, e.g. "@ritik_monika". Sparse-unique
    // so most couples (who never set one) don't collide on null.
    relationshipUsername: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    relationshipBio: {
      type: String,
      default: "",
    },
    // Discovery visibility. PRIVATE by default — a couple only appears in Explore
    // after explicitly choosing "public". `friends` is future-ready (treated as
    // non-public today). This is the single gate for the whole public profile.
    exploreVisibility: {
      type: String,
      enum: ["public", "friends", "partner_only", "private"],
      default: "private",
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
    // CCIE additive metadata (non-breaking; current UI ignores these). Confidence
    // in the health score, detected context tags, and top contributing factors.
    healthConfidence: {
      type: Number,
      default: null,
    },
    healthContext: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    healthFactors: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Relationship Summary (permanent, written once at unmatch) ──
    // Archive-in-place: when a relationship ends we compute a denormalised
    // stats snapshot + a short AI reflection and keep them forever (Stage 3
    // "Growing After Goodbye"). No binary — only counts, a cover URL, and text.
    endedAt: {
      type: Date,
      default: null,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    aiReflection: {
      text: { type: String, default: "" },
      status: { type: String, enum: ["pending", "ready", "failed"], default: "pending" },
      generatedAt: { type: Date, default: null },
    },
    summaryFinalized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Public handle is unique only among couples who actually set one.
coupleSchema.index({ relationshipUsername: 1 }, { unique: true, sparse: true });
// Fast "public couples" lookups for Explore.
coupleSchema.index({ exploreVisibility: 1 });

module.exports = mongoose.model("Couple", coupleSchema);
