const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
    },

    moodType: {
      type: String,
      enum: [
        "happy",
        "sad",
        "angry",
        "stressed",
        "loved",
        "excited",
        "anxious",
      ],
      required: true,
    },

    intensity: {
      type: Number,
      min: 1,
      max: 10,
      required: true,
    },

    note: {
      type: String,
      maxlength: 500,
      default: "",
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

moodSchema.index({ userId: 1 });

moodSchema.index({ coupleId: 1 });

moodSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Mood", moodSchema);
