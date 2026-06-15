const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,
    },

    relationshipTitle: {
      type: String,
      required: true,
    },

    relationshipDurationMonths: {
      type: Number,
      required: true,
    },

    breakupReason: {
      type: String,
      required: true,
    },

    lessonsLearned: {
      type: String,
      required: true,
    },

    emotionalImpactScore: {
      type: Number,

      min: 1,

      max: 10,
    },

    visibility: {
      type: String,

      enum: ["private", "partner_only"],

      default: "private",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("History", historySchema);
