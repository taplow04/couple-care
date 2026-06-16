const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
      index: true,
    },

    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    callType: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },

    // ringing -> (accepted) -> completed | missed | rejected | cancelled | failed
    status: {
      type: String,
      enum: [
        "ringing",
        "completed",
        "missed",
        "rejected",
        "cancelled",
        "failed",
      ],
      default: "ringing",
      index: true,
    },

    // Duration in seconds (only meaningful for completed calls).
    duration: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    // Set when the call is actually answered (used to compute duration).
    answeredAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Call", callSchema);
