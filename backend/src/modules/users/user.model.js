const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    hobbies: {
      type: [String],
      default: [],
    },

    likes: {
      type: [String],
      default: [],
    },

    dislikes: {
      type: [String],
      default: [],
    },

    currentCoupleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Couple",
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    passwordResetToken: {
      type: String,
      default: null,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },
    settings: {
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },

      aiInsightsEnabled: {
        type: Boolean,
        default: true,
      },

      moodRemindersEnabled: {
        type: Boolean,
        default: true,
      },

      memoryRemindersEnabled: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
