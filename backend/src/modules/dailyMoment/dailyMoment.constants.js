/**
 * Daily Couple Moment — shared constants. Kept tiny and pure so the service,
 * AI helper, and cron all import the same values.
 *
 * A "Daily Couple Moment" is auto-created when BOTH partners post at least one
 * (non-private) Moment on the same UTC calendar day. It is a LASTING recap (it
 * never expires) and is the building block for the Monthly / Yearly replays.
 */

// One-time XP bonus surfaced on the card. NOTE: this is *display* metadata — the
// authoritative XP is the engagement system's day-based mutual reward
// (DAILY_XP_BOTH), which already equals this. We never double-award XP.
const DAILY_MOMENT_XP = 10;

// Max number of moments embedded in a recap response (defensive cap).
const MAX_RECAP_MOMENTS = 30;

// AI summary hard ceiling (words) — the spec mandates short, never paragraphs.
const AI_SUMMARY_MAX_WORDS = 60;

// AI generation states for the recap card.
const AI_STATUS = { PENDING: "pending", READY: "ready", FAILED: "failed" };

// Mood → emoji for the recap card (matches moods/mood.model enum).
const MOOD_EMOJI = {
  happy: "😊",
  loved: "🥰",
  excited: "🤩",
  sad: "😢",
  angry: "😠",
  stressed: "😣",
  anxious: "😰",
};

module.exports = {
  DAILY_MOMENT_XP,
  MAX_RECAP_MOMENTS,
  AI_SUMMARY_MAX_WORDS,
  AI_STATUS,
  MOOD_EMOJI,
};
