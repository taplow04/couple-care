const mongoose = require("mongoose");

const { CATEGORY_KEYS, REACTION_KEYS, POST_VISIBILITY } = require("./explore.constants");

/**
 * A public-facing relationship "post" — the unit of the Explore feed. Co-owned
 * by the couple, authored by one partner. Only `visibility: "public"` posts of a
 * couple whose `exploreVisibility` is "public" are ever shown in Explore.
 *
 * Media lives on Cloudinary (never binary in Mongo). Reactions are CoupleCare
 * reactions (one per user, toggleable). Counts are denormalised for cheap feed
 * rendering.
 */
const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: REACTION_KEYS, required: true },
  },
  { _id: false },
);

const relationshipPostSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    caption: { type: String, default: "", maxlength: 2000 },
    category: { type: String, enum: CATEGORY_KEYS, default: "date", index: true },
    location: { type: String, default: "", maxlength: 120 },

    type: { type: String, enum: ["image", "video"], default: "image" },
    mediaUrl: { type: String, required: true },
    publicId: { type: String, default: "" },
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    visibility: {
      type: String,
      enum: POST_VISIBILITY,
      default: "partner_only",
    },

    reactions: { type: [reactionSchema], default: [] },
    reactionCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Feed: public posts newest-first (couple-public gate applied in the service).
relationshipPostSchema.index({ visibility: 1, createdAt: -1 });
// Category rails.
relationshipPostSchema.index({ visibility: 1, category: 1, createdAt: -1 });
// A couple's own posts.
relationshipPostSchema.index({ coupleId: 1, createdAt: -1 });

module.exports = mongoose.model("RelationshipPost", relationshipPostSchema);
