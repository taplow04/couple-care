const mongoose = require("mongoose");

/**
 * A login session — one per successful login / registration. The random
 * `tokenId` is embedded as the `sid` claim in the JWT, which is how a specific
 * device can be listed ("Where you're logged in") and selectively revoked
 * ("Log out this device" / "Log out all others").
 *
 * Media/secrets are never stored here — only best-effort device + network
 * fingerprints derived from the request (see security/request.context.js).
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Opaque random id (also the JWT `sid`). Unique so a token maps to one row.
    tokenId: {
      type: String,
      required: true,
      unique: true,
    },

    // ── Device fingerprint (from User-Agent) ──
    device: { type: String, default: "Unknown device" }, // "iPhone", "Windows PC"
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop", "unknown"],
      default: "unknown",
    },
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    userAgent: { type: String, default: "" },

    // ── Network / geo (best-effort; private/localhost IPs resolve to "") ──
    ip: { type: String, default: "" }, // full — server-only, never returned raw
    ipMasked: { type: String, default: "" }, // e.g. "49.36.*.*" — safe to expose
    location: { type: String, default: "" }, // "Delhi, India" or ""

    // ── Lifecycle ──
    lastActive: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null }, // user | password_change | logout_all | delete
    createdVia: { type: String, default: "login" }, // login | register
  },
  { timestamps: true },
);

// Fast "active sessions for a user" lookups.
sessionSchema.index({ userId: 1, revokedAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
