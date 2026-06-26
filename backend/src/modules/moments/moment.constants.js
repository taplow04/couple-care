/**
 * CoupleCare Moments — shared constants (the single source of truth for the
 * feature's limits, reaction set, and lifecycle window). Kept tiny and pure so
 * both the service and the socket layer import the same values.
 */

// How long a Moment stays "live" before it expires (unless it was saved to a
// Highlight / the Journey, or manually kept). 24h, matching the spec.
const MOMENT_TTL_MS = 24 * 60 * 60 * 1000;

// Hard daily cap per user (anti-spam — Feature 15).
const MAX_MOMENTS_PER_DAY = 10;

// Media length ceiling for video + voice moments (seconds — Feature 3/8).
const MAX_MEDIA_DURATION_SEC = 20;

// Size caps (bytes). Photos are compressed client-side; video/voice get a
// larger ceiling. Configurable here (Feature 15).
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_VOICE_BYTES = 10 * 1024 * 1024; // 10 MB

// The fixed couple-flavoured reaction set (Feature 6). Order = display order.
const ALLOWED_REACTIONS = ["❤️", "🥰", "😘", "😂", "🥹", "🤗"];
const REACTION_SET = new Set(ALLOWED_REACTIONS);

// Moment kinds.
const MOMENT_TYPES = ["photo", "video", "voice"];

// Privacy choices the author picks at upload (Feature 9). `save_journey` is
// partner-visible AND flags the moment to auto-create a Journey entry on expiry.
const MOMENT_PRIVACY = ["partner_only", "private", "save_journey"];

// If BOTH partners post within this window, we offer a "Shared Moment"
// (Feature 12). Configurable (spec suggests 2–6h); default 4h.
const COUPLE_MOMENT_WINDOW_MS = 4 * 60 * 60 * 1000;

// Mood types the AI may suggest — must match moods/mood.model enum so an
// accepted suggestion can be logged as a real mood.
const SUGGESTABLE_MOODS = [
  "happy",
  "sad",
  "angry",
  "stressed",
  "loved",
  "excited",
  "anxious",
];

module.exports = {
  MOMENT_TTL_MS,
  MAX_MOMENTS_PER_DAY,
  MAX_MEDIA_DURATION_SEC,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VOICE_BYTES,
  ALLOWED_REACTIONS,
  REACTION_SET,
  MOMENT_TYPES,
  MOMENT_PRIVACY,
  COUPLE_MOMENT_WINDOW_MS,
  SUGGESTABLE_MOODS,
};
