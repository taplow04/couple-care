const mongoose = require("mongoose");

const {
  CATEGORY_KEYS,
  REACTION_KEYS,
  POST_VISIBILITY,
  POST_SCOPES,
} = require("./explore.constants");

/**
 * A public-facing Explore "post" — the unit of the Explore feed. Two flavours,
 * distinguished by `scope`:
 *   • "relationship" — co-owned by a couple, authored by one partner. Requires
 *     `coupleId`. Shown only when the couple's exploreVisibility is public AND
 *     the post's visibility is public.
 *   • "personal" — authored solo by any user (single / connected / unmatched).
 *     No `coupleId`. Shown only when the author's User.exploreVisibility is
 *     public AND the post's visibility is public.
 *
 * The collection name stays "RelationshipPost" (no data migration); the model is
 * generalised rather than duplicated (per brief: extend, don't duplicate).
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
    // "personal" posts have no couple; relationship posts require one (enforced
    // in the service, not the schema, so the field can stay nullable).
    scope: {
      type: String,
      enum: POST_SCOPES,
      default: "relationship",
      index: true,
    },
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
      index: true,
    },
    // The human author + owner of a personal post (also the partner who created
    // a relationship post). Personal posts are gated on this user's visibility.
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

// Feed: public posts newest-first (couple/user public gate applied in service).
relationshipPostSchema.index({ scope: 1, visibility: 1, createdAt: -1 });
// Category rails (both scopes).
relationshipPostSchema.index({ visibility: 1, category: 1, createdAt: -1 });
// A couple's own posts.
relationshipPostSchema.index({ coupleId: 1, createdAt: -1 });
// A user's own personal posts.
relationshipPostSchema.index({ authorId: 1, scope: 1, createdAt: -1 });

module.exports = mongoose.model("RelationshipPost", relationshipPostSchema);
