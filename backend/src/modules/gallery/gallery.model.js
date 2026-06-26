const mongoose = require("mongoose");

/**
 * GalleryItem — a single photo/video in a user's Personal gallery or a couple's
 * Relationship gallery. Binary is NEVER stored in Mongo; only the Cloudinary
 * secure_url + publicId (so we can destroy the asset on delete).
 *
 * scope:
 *  - "personal"     → owned by one user (ownerId). Visibility gated by the
 *    owner's privacy (galleryVisibility for images, videoVisibility for videos).
 *  - "relationship" → co-owned by the couple (coupleId). Both partners can view
 *    and add; co-owned data is visible to the partner by design.
 */
const galleryItemSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
      index: true,
    },

    scope: {
      type: String,
      enum: ["personal", "relationship"],
      default: "personal",
    },

    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    // Cloudinary public_id — needed to destroy the asset when the item is deleted.
    publicId: {
      type: String,
      default: "",
    },

    caption: {
      type: String,
      default: "",
    },

    width: { type: Number, default: null },
    height: { type: Number, default: null },
    mediaDuration: { type: Number, default: null },

    // Per-item override. Defaults to partner_only; the owner's profile-level
    // gallery/video privacy is the primary gate, this allows finer control.
    visibility: {
      type: String,
      enum: ["private", "partner_only", "shared"],
      default: "partner_only",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GalleryItem", galleryItemSchema);
