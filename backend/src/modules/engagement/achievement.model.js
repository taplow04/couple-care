const mongoose = require("mongoose");

/**
 * Achievement — an UNLOCKED badge for a couple. The catalog of possible
 * achievements (titles, emojis, unlock rules) is code in achievements.catalog.js;
 * this collection only stores which keys a couple has unlocked and when.
 */
const achievementSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    key: { type: String, required: true },

    unlockedAt: { type: Date, default: Date.now },

    meta: { type: Object, default: {} },
  },
  { timestamps: true },
);

// A couple can only unlock each achievement once.
achievementSchema.index({ coupleId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("Achievement", achievementSchema);
