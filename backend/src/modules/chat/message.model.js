const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Message kind. Media messages store their file on Cloudinary (mediaUrl);
    // binary is never stored in MongoDB. "audio" = a recorded voice note;
    // "video" = a shared clip.
    type: {
      type: String,
      enum: ["text", "image", "file", "audio", "video"],
      default: "text",
    },

    // Body text. Required for text messages; optional caption for media.
    text: {
      type: String,
      trim: true,
      maxlength: 1000,
      // Only require text when this is a plain text message.
      required: function () {
        return this.type === "text";
      },
    },

    // ─── Media fields (populated only for image/file messages) ───────────────
    mediaUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null }, // bytes
    mimeType: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    // Voice-note / video length in seconds (best-effort, sent by the client).
    mediaDuration: { type: Number, default: null },

    // Emoji reactions. One reaction per user (toggled): re-reacting with a new
    // emoji replaces the old one; reacting with the same emoji removes it.
    reactions: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          emoji: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Optional quoted message this one is replying to.
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  coupleId: 1,
  createdAt: -1,
});

// Speeds up the shared-media gallery query (coupleId + non-text types).
messageSchema.index({ coupleId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
