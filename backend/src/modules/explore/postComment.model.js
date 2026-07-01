const mongoose = require("mongoose");

/**
 * A comment on a public relationship post. Separate collection (not embedded) so
 * comments paginate independently and don't bloat the feed documents.
 */
const postCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RelationshipPost",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

postCommentSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model("PostComment", postCommentSchema);
