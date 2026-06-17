const mongoose = require("mongoose");

// Holds an in-progress signup until the email OTP is verified. No User row is
// created until verification succeeds, so unverified emails never pollute the
// Users collection or block re-registration. Rows auto-expire via a TTL index.
const pendingRegistrationSchema = new mongoose.Schema(
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
      trim: true,
    },

    // Pre-hashed password (bcrypt). Stored hashed so a leaked pending row never
    // exposes a plaintext password. Copied verbatim onto the User at verify
    // time; the User schema's pre-save hook is bypassed for this field by
    // assigning it after creation (see auth.service).
    passwordHash: {
      type: String,
      required: true,
    },

    // SHA-256 of the 6-digit OTP — never store the raw code.
    otpHash: {
      type: String,
      required: true,
    },

    otpExpires: {
      type: Date,
      required: true,
    },

    // Number of failed verify attempts for the CURRENT otp.
    attempts: {
      type: Number,
      default: 0,
    },

    // Throttling: when the last OTP email was sent, and how many today.
    lastSentAt: {
      type: Date,
      default: Date.now,
    },

    sendCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

// TTL: documents are removed 1 hour after creation regardless, so abandoned
// signups don't linger. (OTP itself expires in 10 minutes; this is the backstop.)
pendingRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model(
  "PendingRegistration",
  pendingRegistrationSchema,
);
