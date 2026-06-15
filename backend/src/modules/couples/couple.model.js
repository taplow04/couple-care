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

    relationshipStatus: {
      type: String,
      enum: ["active", "paused", "broken_up"],
      default: "active",
    },

    relationshipStartedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Couple", coupleSchema);
