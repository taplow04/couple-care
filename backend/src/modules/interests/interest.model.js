const mongoose = require("mongoose");

const { INTEREST_KEYS } = require("./interest.constants");

/**
 * InterestProfile — ONE doc per user. Accumulated interest signals from
 * IN-APP actions only (searches, explore activity, bucket goals, memory types).
 * Raw points are stored per category; the SERVICE applies time decay on read so
 * the profile always reflects current interests. No external data, ever.
 */
const interestEntrySchema = new mongoose.Schema(
  {
    points: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    lastAt: { type: Date, default: null },
  },
  { _id: false },
);

const interestProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // category key → { points, count, lastAt }. Keys are validated against the
    // canonical taxonomy in the service before writing.
    interests: {
      type: Map,
      of: interestEntrySchema,
      default: () => new Map(),
    },

    totalSignals: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InterestProfile", interestProfileSchema);
module.exports.INTEREST_KEYS = INTEREST_KEYS;
