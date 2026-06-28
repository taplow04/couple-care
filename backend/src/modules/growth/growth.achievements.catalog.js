/**
 * Personal (solo) achievement catalog for the self-growth track. Mirrors the
 * couple achievements.catalog pattern: definitions + check(stats) predicates.
 * Unlocks are stored on the user's Achievement records with a coupleId of null
 * is NOT possible (that collection is couple-keyed), so personal unlocks live in
 * their own lightweight set on the growth summary (derived) — these definitions
 * drive the badges shown on the Personal Profile + Preparing/Healing dashboards.
 *
 * `stats` shape (built in growth.engagement.buildGrowthStats):
 *   { personalXp, level, currentStreak, longestStreak, totalEntries,
 *     counts: { journal, reflection, gratitude, challenge, quiz, coach, mood },
 *     readinessScore, hasLoveLanguage, hasAttachment }
 */
const GROWTH_ACHIEVEMENTS = [
  {
    key: "g_first_journal",
    title: "First Journal",
    emoji: "🌱",
    description: "Wrote your first journal entry.",
    check: (s) => s.counts.journal >= 1,
  },
  {
    key: "g_reflective",
    title: "Reflective Soul",
    emoji: "🪞",
    description: "Completed 7 daily reflections.",
    check: (s) => s.counts.reflection >= 7,
  },
  {
    key: "g_grateful",
    title: "Grateful Heart",
    emoji: "🙏",
    description: "Logged gratitude 7 times.",
    check: (s) => s.counts.gratitude >= 7,
  },
  {
    key: "g_challenger",
    title: "Challenger",
    emoji: "🎯",
    description: "Completed 5 growth challenges.",
    check: (s) => s.counts.challenge >= 5,
  },
  {
    key: "g_streak_7",
    title: "Growth Streak",
    emoji: "🔥",
    description: "Kept a 7-day growth streak.",
    check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    key: "g_streak_30",
    title: "Dedicated",
    emoji: "⚡",
    description: "Kept a 30-day growth streak.",
    check: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },
  {
    key: "g_self_aware",
    title: "Self-Aware",
    emoji: "🧭",
    description: "Discovered your love language and attachment style.",
    check: (s) => s.hasLoveLanguage && s.hasAttachment,
  },
  {
    key: "g_ready",
    title: "Ready For Love",
    emoji: "💗",
    description: "Reached a readiness score of 80+.",
    check: (s) => (s.readinessScore || 0) >= 80,
  },
  {
    key: "g_seeker",
    title: "Growth Seeker",
    emoji: "💬",
    description: "Had 5 chats with your coach.",
    check: (s) => s.counts.coach >= 5,
  },
  {
    key: "g_level_5",
    title: "Levelling Up",
    emoji: "⭐",
    description: "Reached personal level 5.",
    check: (s) => s.level >= 5,
  },
];

const GROWTH_ACHIEVEMENT_MAP = GROWTH_ACHIEVEMENTS.reduce((acc, a) => {
  acc[a.key] = a;
  return acc;
}, {});

module.exports = { GROWTH_ACHIEVEMENTS, GROWTH_ACHIEVEMENT_MAP };
