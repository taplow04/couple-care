const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    coupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    memoryType: {
      type: String,
      enum: [
        "date",
        "trip",
        "birthday",
        "anniversary",
        "proposal",
        "gift",
        "milestone",
        "other",
      ],
      default: "other",
    },

    memoryDate: {
      type: Date,
      required: true,
    },

    photos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

memorySchema.index({
  coupleId: 1,
  memoryDate: -1,
});

memorySchema.index({
  coupleId: 1,
  memoryType: 1,
});

module.exports = mongoose.model("Memory", memorySchema);
