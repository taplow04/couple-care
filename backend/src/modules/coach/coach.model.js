const mongoose = require("mongoose");

/**
 * CoachConversation — a private, per-USER thread with the AI relationship coach.
 * (Each partner has their own coaching conversations; they are not shared.)
 * Stores the full back-and-forth so the coach can continue with context.
 */
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const coachConversationSchema = new mongoose.Schema(
  {
    // Null for solo coaching threads (Stage 1 Preparation Coach / Stage 3
    // Recovery Coach). Set for Stage 2 couple coaching.
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, default: "New conversation", maxlength: 120 },

    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

coachConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("CoachConversation", coachConversationSchema);
