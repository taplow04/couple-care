const mongoose = require("mongoose");
const { MOMENT_TYPES, MOMENT_PRIVACY } = require("./moment.constants");

/**
 * Moment — an Instagram-Stories-style ephemeral share between the two partners.
 * Binary is NEVER stored in Mongo; only the Cloudinary secure_url + publicId
 * (so the asset can be destroyed on expiry), mirroring GalleryItem / Message.
 *
 * Lifecycle: a Moment is "live" until `expiresAt` (createdAt + 24h). A blind TTL
 * index is deliberately NOT used because moments saved to a Highlight, the
 * Journey, or kept manually must survive. Expiry is therefore driven by a
 * save-aware cron (notification.scheduler) which destroys the Cloudinary asset
 * and the doc, and (for `save_journey`) creates a Memory first.
 */
const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
);

const viewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const momentSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: { type: String, enum: MOMENT_TYPES, required: true },

    // Cloudinary
    mediaUrl: { type: String, required: true },
    publicId: { type: String, default: "" },
    // Cloudinary resource_type used for the asset ("image" | "video"). Voice
    // notes upload as "video" resources on Cloudinary (audio rides that bucket).
    resourceType: { type: String, enum: ["image", "video"], default: "image" },
    // Poster frame for video moments (Cloudinary-derived).
    thumbnailUrl: { type: String, default: "" },

    caption: { type: String, default: "", maxlength: 500 },

    // ── Story Mood (an INDEPENDENT concept from Manual Mood & AI Current Mood) ──
    // The mood the author associated with THIS Moment specifically. It is NEVER
    // written into the Mood collection and carries NO intensity — a Story mood is
    // a per-moment label with its own provenance + timestamp, so it can never
    // inherit (or pollute) a manually-logged mood's intensity. See mood.model
    // (manual) and intelligence/emotion (AI current) for the other two concepts.
    mood: { type: String, default: null },
    // How the Story mood was set: "user" (picked at capture) or "ai_suggested"
    // (the author accepted the post-upload AI suggestion). null when unset.
    moodSource: { type: String, enum: ["user", "ai_suggested", null], default: null },
    // Confidence (0–100) ONLY meaningful for ai_suggested moods; user-picked = 100.
    moodConfidence: { type: Number, min: 0, max: 100, default: null },
    // When the Story mood was attached (its own history point, independent of the
    // Moment's createdAt and of any manual mood timestamp).
    moodAt: { type: Date, default: null },

    privacy: { type: String, enum: MOMENT_PRIVACY, default: "partner_only" },

    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null }, // seconds (video/voice)

    // The partner's view (1:1 app → at most one entry, but kept as an array so
    // the model is robust). `firstViewedAt` mirrors the first view for queries.
    views: { type: [viewSchema], default: [] },
    firstViewedAt: { type: Date, default: null },

    reactions: { type: [reactionSchema], default: [] },

    // Optional AI understanding (Feature 13). Never auto-applied.
    aiSuggestion: {
      text: { type: String, default: "" },
      moods: { type: [String], default: [] },
    },

    // ── Persistence beyond 24h ──
    expiresAt: { type: Date, required: true, index: true },
    // Manually kept by the author before expiry (Feature 10).
    kept: { type: Boolean, default: false },
    // Promoted into the Journey as a Memory (Feature 9/10).
    savedToJourney: { type: Boolean, default: false },
    memoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Memory", default: null },
    // Pinned into a Highlight (Feature 11) — also exempts it from expiry.
    highlightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MomentHighlight",
      default: null,
      index: true,
    },

    // Part of a merged "Couple Moment" (Feature 12).
    coupleMomentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Moment",
      default: null,
    },
  },
  { timestamps: true },
);

// A moment survives the expiry sweep if it was kept, saved, or highlighted.
momentSchema.methods.isPersistent = function () {
  return Boolean(this.kept || this.savedToJourney || this.highlightId);
};

momentSchema.index({ coupleId: 1, createdAt: -1 });

module.exports = mongoose.model("Moment", momentSchema);
