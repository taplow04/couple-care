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

    // Default is partner-visible: this is a couples app, and getPartnerMoods
    // filters on "partner_only". Defaulting to "private" previously meant
    // partners could never see each other's moods. Users can still mark an
    // individual mood private.
    visibility: {
      type: String,
      enum: ["private", "partner_only"],
      default: "partner_only",
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
