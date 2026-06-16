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

    // Birthday — drives automatic birthday reminders/cards (no manual memory needed).
    birthday: {
      type: Date,
      default: null,
    },

    // Real presence: updated on socket connect/disconnect (see chat/socket.js).
    // There is intentionally NO privacy option to hide last seen.
    lastSeen: {
      type: Date,
      default: null,
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

    // Granular privacy controls. In a two-person app "partner_only" and
    // "shared" are functionally equivalent (only the partner can ever see it),
    // but both are kept so the UI can offer the full set. "private" hides the
    // data from the partner. Default is partner-visible so the couple
    // experience works out of the box. Note: lastSeen is deliberately NOT
    // privacy-controlled.
    privacy: {
      moodVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      memoryVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      journeyVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      aiVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      profileVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      activityVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
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
