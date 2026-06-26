/**
 * Engagement constants — the single source of truth for what counts as a daily
 * activity, how much XP each is worth, and the streak milestones.
 *
 * The streak is weighted, NOT chat-only: any of these activities keeps the
 * couple's daily streak alive, and doing a VARIED set of activities earns more
 * XP (XP is awarded once per activity TYPE per day, so spamming one action does
 * not inflate the score — see engagement.service).
 */

// Canonical activity type ids. Every feature records one of these.
const ACTIVITY_TYPES = {
  CHAT: "chat",
  MOOD: "mood",
  MEMORY: "memory",
  BUCKET_COMPLETE: "bucket_complete",
  SLEEP: "sleep",
  LOVE_LETTER: "love_letter",
  COACH: "coach",
  SURPRISE_OPEN: "surprise_open",
  STORY_CHAPTER: "story_chapter",
  MOMENT: "moment", // CoupleCare Moments (story share)
  CHALLENGE: "challenge", // future-ready (Couple Challenges)
};

const ACTIVITY_TYPE_LIST = Object.values(ACTIVITY_TYPES);

// XP awarded for the FIRST occurrence of each type on a given day (per couple).
const XP_VALUES = {
  chat: 5,
  mood: 10,
  memory: 20,
  bucket_complete: 30,
  sleep: 10,
  love_letter: 25,
  coach: 10,
  surprise_open: 5,
  story_chapter: 15,
  moment: 12,
  challenge: 25,
};

// Streak day-counts that unlock a celebration (notification + achievement).
const STREAK_MILESTONES = [7, 30, 100, 365];

// ─── Couple XP (mutual participation) ────────────────────────────────────────
// XP is a COUPLE metric earned per DAY based on mutual participation, NOT per
// individual action. A day where BOTH partners were active is worth far more
// than a day where only one was — this is what encourages teamwork.
const DAILY_XP_BOTH = 10; // both partners active that day
const DAILY_XP_ONE = 2; // only one partner active that day

// Streak grace: a mutual streak survives a gap of up to this many days (so a
// partner can miss a single day without a harsh reset). 2 = "yesterday or the
// day before still counts".
const STREAK_GRACE_DAYS = 2;

// ─── Leveling ────────────────────────────────────────────────────────────────
// Cumulative XP required to BE a given level. Level 1 = 0 XP, 2 = 100, 3 = 300,
// 4 = 600 … (quadratic so later levels take longer). Deterministic, no I/O.
const xpToReachLevel = (level) => 50 * (level - 1) * level;

const levelForXP = (xp) => {
  let level = 1;
  while (xp >= xpToReachLevel(level + 1)) level++;
  const currentFloor = xpToReachLevel(level);
  const nextFloor = xpToReachLevel(level + 1);
  const span = nextFloor - currentFloor || 1;
  return {
    level,
    currentLevelXp: xp - currentFloor,
    nextLevelXp: nextFloor - currentFloor,
    progress: Math.max(0, Math.min(1, (xp - currentFloor) / span)),
  };
};

module.exports = {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LIST,
  XP_VALUES,
  STREAK_MILESTONES,
  DAILY_XP_BOTH,
  DAILY_XP_ONE,
  STREAK_GRACE_DAYS,
  xpToReachLevel,
  levelForXP,
};
