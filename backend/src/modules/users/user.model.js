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

    // Cover photo for the Personal Profile header (wide banner, unlike the
    // square face-cropped profilePhoto). Uploaded via users.uploadPhoto("cover").
    coverPhoto: {
      type: String,
      default: "",
    },

    // Optional public handle shown on the profile (e.g. "@alex"). Sparse-unique
    // so multiple users can leave it unset (null) without collisions.
    username: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
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

    // ── Self-growth (Stage 1 "Preparing" + Stage 3 "Healing") ──
    // Self-knowledge cards, cached from short in-app quizzes (growth.quizzes).
    loveLanguage: {
      type: String,
      enum: [
        "words_of_affirmation",
        "quality_time",
        "acts_of_service",
        "physical_touch",
        "receiving_gifts",
        null,
      ],
      default: null,
    },
    attachmentStyle: {
      type: String,
      enum: ["secure", "anxious", "avoidant", "fearful_avoidant", null],
      default: null,
    },
    // Relationship Readiness score (0–100), cached from the readiness quiz.
    readinessScore: {
      type: Number,
      default: null,
    },

    // USER-scoped XP + streak for solo growth. The couple Engagement system is
    // coupleId-keyed and can't hold solo progress, so personal growth tracks
    // here (see growth.engagement.js). Reuses the same leveling math.
    personalXp: {
      type: Number,
      default: 0,
    },
    growthStreak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActiveDay: { type: String, default: null }, // UTC YYYY-MM-DD
    },
    // Unlocked personal-achievement keys (growth.achievements.catalog). Stored
    // here (not the couple-keyed Achievement collection) since growth is solo.
    growthAchievements: {
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

    // Timestamp of the last password change/reset — surfaced in the Security
    // Center ("Last changed 18 days ago") and factored into the trust score.
    passwordChangedAt: {
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

      // Appearance preference. Synced across the user's devices; the frontend
      // also mirrors it to localStorage for an instant, flash-free first paint.
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
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

      // ── Granular controls added with the Profile Ecosystem ──
      // Bio text on the profile.
      bioVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Birthday date.
      birthdayVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Sleep logs / analysis.
      sleepVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Personal gallery photos.
      galleryVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Personal gallery videos.
      videoVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // CoupleCare Journey / relationship-history COUNT (never the details).
      journeyCountVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Transparency report / Trust Center figures.
      transparencyVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Relationship (co-owned) gallery. Co-owned data stays visible to the
      // partner by design; this is a stored preference for any future surface.
      relationshipGalleryVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },

      // ── Relationship Lifecycle (Stage 1 & 3) controls — all opt-in ──
      // Permanent Relationship Summary of an ended relationship.
      summaryVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Healing journal entries.
      healingVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Recovery / healing progress figures.
      recoveryVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // AI reflections (prep tips / recovery reflections).
      aiReflectionVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Love language card.
      loveLanguageVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // Attachment style card.
      attachmentVisibility: {
        type: String,
        enum: ["private", "partner_only", "shared"],
        default: "partner_only",
      },
      // NOTE: the private Growth Report is HARD-private (never exposed to any
      // partner, current or future) — enforced in code, not via a setting.
    },
  },
  {
    timestamps: true,
  },
);

// Optional handle: unique only among users who actually set one.
userSchema.index({ username: 1 }, { unique: true, sparse: true });

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
