/**
 * Achievement catalog — the definitions (NOT the unlocked records, which live in
 * achievement.model). Each entry has a `check(stats)` predicate evaluated after
 * every recorded activity; when it first returns true, the badge unlocks.
 *
 * `stats` shape (built in engagement.service.buildStats):
 *   { totalXP, level, currentStreak, longestStreak, totalActivities,
 *     counts: { mood, memory, chat, bucket_complete, sleep, love_letter,
 *               coach, surprise_open, story_chapter, challenge } }
 */
const ACHIEVEMENTS = [
  {
    key: "first_steps",
    title: "First Steps",
    emoji: "👣",
    description: "Logged your first activity together.",
    check: (s) => s.totalActivities >= 1,
  },
  {
    key: "streak_7",
    title: "On Fire",
    emoji: "🔥",
    description: "Kept a 7-day streak.",
    check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    key: "streak_30",
    title: "Unstoppable",
    emoji: "⚡",
    description: "Kept a 30-day streak.",
    check: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },
  {
    key: "streak_100",
    title: "Century of Love",
    emoji: "💯",
    description: "Kept a 100-day streak.",
    check: (s) => s.currentStreak >= 100 || s.longestStreak >= 100,
  },
  {
    key: "streak_365",
    title: "A Year Strong",
    emoji: "🏆",
    description: "Kept a 365-day streak.",
    check: (s) => s.currentStreak >= 365 || s.longestStreak >= 365,
  },
  {
    key: "mood_logger",
    title: "In Tune",
    emoji: "🎭",
    description: "Logged 10 moods.",
    check: (s) => s.counts.mood >= 10,
  },
  {
    key: "memory_keeper",
    title: "Memory Keeper",
    emoji: "📸",
    description: "Saved 10 memories together.",
    check: (s) => s.counts.memory >= 10,
  },
  {
    key: "wordsmith",
    title: "Wordsmith",
    emoji: "✉️",
    description: "Sent your first love letter.",
    check: (s) => s.counts.love_letter >= 1,
  },
  {
    key: "achievers",
    title: "Dream Chasers",
    emoji: "🎯",
    description: "Completed your first bucket-list goal.",
    check: (s) => s.counts.bucket_complete >= 1,
  },
  {
    key: "bucket_master",
    title: "Bucket Masters",
    emoji: "🪣",
    description: "Completed 10 bucket-list goals.",
    check: (s) => s.counts.bucket_complete >= 10,
  },
  {
    key: "rested",
    title: "Well Rested",
    emoji: "😴",
    description: "Logged sleep 7 times.",
    check: (s) => s.counts.sleep >= 7,
  },
  {
    key: "seeker",
    title: "Growth Seekers",
    emoji: "🌱",
    description: "Had 5 chats with the AI coach.",
    check: (s) => s.counts.coach >= 5,
  },
  {
    key: "curious",
    title: "Curious Hearts",
    emoji: "🎁",
    description: "Opened 7 surprise boxes.",
    check: (s) => s.counts.surprise_open >= 7,
  },
  {
    key: "storyteller",
    title: "Storytellers",
    emoji: "📖",
    description: "Added a chapter to your story.",
    check: (s) => s.counts.story_chapter >= 1,
  },
  {
    key: "first_moment",
    title: "Caught the Moment",
    emoji: "📸",
    description: "Shared your first Moment.",
    check: (s) => s.counts.moment >= 1,
  },
  {
    key: "moment_maker",
    title: "Moment Makers",
    emoji: "✨",
    description: "Shared 25 Moments together.",
    check: (s) => s.counts.moment >= 25,
  },
  {
    key: "first_daily_moment",
    title: "Our First Day",
    emoji: "❤️",
    description: "Both shared a Moment on the same day.",
    check: (s) => s.counts.daily_moment >= 1,
  },
  {
    key: "daily_devotion",
    title: "Daily Devotion",
    emoji: "🗓️",
    description: "Created 30 Daily Couple Moments together.",
    check: (s) => s.counts.daily_moment >= 30,
  },
  {
    key: "level_5",
    title: "Rising Together",
    emoji: "⭐",
    description: "Reached level 5.",
    check: (s) => s.level >= 5,
  },
  {
    key: "level_10",
    title: "Power Couple",
    emoji: "💞",
    description: "Reached level 10.",
    check: (s) => s.level >= 10,
  },
];

// Lookup by key (for enriching notifications / socket payloads).
const ACHIEVEMENT_MAP = ACHIEVEMENTS.reduce((acc, a) => {
  acc[a.key] = a;
  return acc;
}, {});

module.exports = { ACHIEVEMENTS, ACHIEVEMENT_MAP };
