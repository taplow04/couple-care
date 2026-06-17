const mongoose = require("mongoose");

// One document per device/browser a user has enabled push on. A user can have
// several (phone PWA, desktop Chrome, …). `endpoint` is globally unique — it IS
// the push channel — so re-subscribing the same browser upserts rather than
// duplicates.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
    },

    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },

    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
