const mongoose = require("mongoose");

/**
 * StoryChapter — a CUSTOM, user-authored chapter in the couple's story timeline.
 * Auto-chapters (memories, milestones, bucket completions, love letters,
 * achievements) are assembled on the fly in story.service and are NOT stored
 * here — this collection only holds the manual ones partners add themselves.
 */
const storyChapterSchema = new mongoose.Schema(
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

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    emoji: { type: String, default: "📖", maxlength: 8 },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

storyChapterSchema.index({ coupleId: 1, date: 1 });

module.exports = mongoose.model("StoryChapter", storyChapterSchema);
