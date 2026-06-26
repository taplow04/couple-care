const mongoose = require("mongoose");

/**
 * MomentHighlight — a couple-owned, named collection of saved Moments
 * (Feature 11: "First Date", "Trips", "Anniversary"…). Co-owned like memories,
 * so both partners can view and add. Holds only references + a chosen cover;
 * the actual media lives on the referenced Moment docs (which are exempt from
 * expiry once they belong to a highlight).
 */
const highlightSchema = new mongoose.Schema(
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

    title: { type: String, required: true, trim: true, maxlength: 60 },
    emoji: { type: String, default: "⭐", maxlength: 8 },

    // Cover thumbnail (defaults to the first moment's media).
    coverUrl: { type: String, default: "" },

    momentIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Moment" }],
      default: [],
    },
  },
  { timestamps: true },
);

highlightSchema.index({ coupleId: 1, updatedAt: -1 });

module.exports = mongoose.model("MomentHighlight", highlightSchema);
