const mongoose = require("mongoose");

const CATEGORIES = [
  "travel",
  "food",
  "movies",
  "dreams",
  "fitness",
  "learning",
  "adventure",
  "home",
  "other",
];

/**
 * BucketItem — a shared goal co-owned by the couple. Either partner can create,
 * edit, complete, or delete any item (it's a 1:1 relationship app — both own the
 * list). Completion feeds the engagement loop (XP / streak / achievements).
 */
const bucketItemSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    category: {
      type: String,
      enum: CATEGORIES,
      default: "other",
    },

    deadline: {
      type: Date,
      default: null,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

bucketItemSchema.index({ coupleId: 1, completed: 1 });

module.exports = mongoose.model("BucketItem", bucketItemSchema);
module.exports.CATEGORIES = CATEGORIES;
