const mongoose = require("mongoose");

const REWARD_TYPES = [
  "date_idea",
  "love_quote",
  "conversation_starter",
  "relationship_tip",
  "challenge",
  "memory_prompt",
  "bucket_idea",
  "compliment",
  "mood_booster",
  "encouragement",
];

/**
 * SurpriseBox — one opened daily surprise per USER per day. The unique
 * { userId, day } index enforces the "open once a day" rule at the DB level.
 */
const surpriseBoxSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // UTC YYYY-MM-DD.
    day: { type: String, required: true },

    rewardType: { type: String, enum: REWARD_TYPES, required: true },

    content: { type: String, required: true },
  },
  { timestamps: true },
);

surpriseBoxSchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("SurpriseBox", surpriseBoxSchema);
module.exports.REWARD_TYPES = REWARD_TYPES;
