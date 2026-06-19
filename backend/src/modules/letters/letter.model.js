const mongoose = require("mongoose");

const LETTER_TYPES = [
  "romantic",
  "apology",
  "appreciation",
  "motivation",
  "anniversary",
  "birthday",
  "surprise",
];

/**
 * LoveLetter — an AI-generated, then SAVED letter from one partner. Saved letters
 * are couple-scoped (both partners see them in their shared journey). "Sharing"
 * additionally notifies the partner.
 */
const loveLetterSchema = new mongoose.Schema(
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
    },

    type: {
      type: String,
      enum: LETTER_TYPES,
      default: "romantic",
    },

    content: {
      type: String,
      required: true,
      maxlength: 4000,
    },

    sharedWithPartner: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

loveLetterSchema.index({ coupleId: 1, createdAt: -1 });

module.exports = mongoose.model("LoveLetter", loveLetterSchema);
module.exports.LETTER_TYPES = LETTER_TYPES;
