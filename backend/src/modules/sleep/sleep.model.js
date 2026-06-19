const mongoose = require("mongoose");

/**
 * SleepLog — a per-USER nightly sleep entry. Couple-scoped so partner-sync
 * analysis can compare both partners' patterns.
 */
const sleepLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    sleepAt: { type: Date, required: true },
    wakeAt: { type: Date, required: true },

    // Derived (hours slept), stored for easy aggregation.
    hours: { type: Number, required: true },

    quality: { type: Number, min: 1, max: 5, default: 3 },

    note: { type: String, default: "", maxlength: 300 },

    // UTC YYYY-MM-DD of the night (based on sleepAt) — for grouping/sync.
    day: { type: String, required: true },
  },
  { timestamps: true },
);

sleepLogSchema.index({ userId: 1, day: -1 });

module.exports = mongoose.model("SleepLog", sleepLogSchema);
