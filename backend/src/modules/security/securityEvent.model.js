const mongoose = require("mongoose");

// The set of auditable account-security events surfaced in "Account Activity".
const EVENT_TYPES = [
  "login",
  "failed_login",
  "new_device",
  "logout",
  "password_changed",
  "password_reset",
  "email_changed",
  "email_verified",
  "otp_verified",
  "verification_sent",
  "pair_connected",
  "partner_unmatched",
  "security_settings_updated",
  "session_revoked",
  "sessions_revoked_all",
  "account_deleted",
];

/**
 * An append-only security audit trail (recent security events). Purely
 * informational for the user — writing one must NEVER break the action that
 * triggered it (all writers swallow errors).
 */
const securityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: EVENT_TYPES, required: true },
    // Short human-readable summary, e.g. "New login from Chrome on Windows".
    message: { type: String, default: "" },

    // Best-effort context captured at the time of the event.
    ipMasked: { type: String, default: "" },
    device: { type: String, default: "" },
    location: { type: String, default: "" },

    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

securityEventSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SecurityEvent", securityEventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
