/**
 * Self-growth constants — the single source of truth for personal (solo) XP,
 * the personal achievement catalog, and the daily content pools (challenges,
 * reflection / gratitude prompts, quotes). Used in Stage 1 (Preparing) and
 * Stage 3 (Healing). Personal XP reuses the couple leveling curve so the bars
 * look and behave consistently.
 */

// Personal activity types (user-scoped mirror of engagement ACTIVITY_TYPES).
const GROWTH_ACTIVITY = {
  JOURNAL: "journal",
  REFLECTION: "reflection",
  GRATITUDE: "gratitude",
  CHALLENGE: "challenge",
  QUIZ: "quiz", // readiness / love-language / attachment
  COACH: "coach", // prep / recovery coach chat
  MOOD: "mood", // solo mood log (reuses Mood collection)
};

const GROWTH_ACTIVITY_LIST = Object.values(GROWTH_ACTIVITY);

// XP per FIRST occurrence of each type per day (so varied growth earns more,
// spamming one action does not inflate).
const GROWTH_XP = {
  journal: 12,
  reflection: 10,
  gratitude: 10,
  challenge: 20,
  quiz: 15,
  coach: 10,
  mood: 8,
};

const GROWTH_STREAK_MILESTONES = [3, 7, 14, 30, 100];

// ── Daily content pools (deterministic pick by day, so it's stable per day) ──
const DAILY_CHALLENGES = [
  { key: "ch_gratitude_text", title: "Tell someone you appreciate them", category: "connection" },
  { key: "ch_no_phone_meal", title: "Eat one meal fully phone-free", category: "presence" },
  { key: "ch_journal_feeling", title: "Name one feeling and where you felt it", category: "awareness" },
  { key: "ch_boundary", title: "Practice saying a kind 'no' once", category: "boundaries" },
  { key: "ch_self_compliment", title: "Write one honest compliment to yourself", category: "self_worth" },
  { key: "ch_listen", title: "Listen to someone without planning your reply", category: "communication" },
  { key: "ch_walk", title: "Take a 10-minute walk and just notice", category: "wellbeing" },
  { key: "ch_forgive_self", title: "Forgive yourself for one small thing", category: "healing" },
  { key: "ch_reach_out", title: "Reach out to a friend you miss", category: "connection" },
  { key: "ch_values", title: "Write one value that matters in love", category: "clarity" },
  { key: "ch_breathe", title: "Do 5 slow breaths before reacting today", category: "regulation" },
  { key: "ch_celebrate", title: "Celebrate one thing you did well", category: "self_worth" },
  { key: "ch_green_flag", title: "List one green flag you want in a partner", category: "clarity" },
  { key: "ch_digital_detox", title: "Spend 30 minutes offline and present", category: "presence" },
];

const REFLECTION_PROMPTS = [
  "What's one thing you handled well today?",
  "What did you need today that you can give yourself?",
  "When did you feel most like yourself today?",
  "What's a boundary you'd like to honor tomorrow?",
  "What are you learning about what you want in love?",
  "What drained you today, and what restored you?",
  "What would you tell a friend feeling how you feel now?",
  "What's one fear you can meet with kindness?",
];

const GRATITUDE_PROMPTS = [
  "Name one small thing that went right today.",
  "Who made your day a little lighter?",
  "What's something your body did for you today?",
  "What comfort are you grateful for right now?",
  "What's a lesson you're thankful you learned?",
];

const QUOTES = [
  { text: "You can't pour from an empty cup. Take care of yourself first.", author: "Unknown" },
  { text: "The relationship you have with yourself sets the tone for every other.", author: "Robert Holden" },
  { text: "Loving yourself isn't vanity. It's sanity.", author: "André Gide" },
  { text: "What you seek is seeking you.", author: "Rumi" },
  { text: "Healing is not linear, and that's okay.", author: "Unknown" },
  { text: "You are allowed to be both a masterpiece and a work in progress.", author: "Sophia Bush" },
  { text: "Self-respect is the fruit of discipline.", author: "Abraham Heschel" },
  { text: "Grow through what you go through.", author: "Unknown" },
];

// Deterministic day index (UTC) so everyone sees a stable daily pick.
const dayIndex = (day) => {
  // day is "YYYY-MM-DD"
  const n = Number(String(day).replace(/-/g, "")) || 0;
  return n;
};

const pickForDay = (arr, day, salt = 0) => arr[(dayIndex(day) + salt) % arr.length];

module.exports = {
  GROWTH_ACTIVITY,
  GROWTH_ACTIVITY_LIST,
  GROWTH_XP,
  GROWTH_STREAK_MILESTONES,
  DAILY_CHALLENGES,
  REFLECTION_PROMPTS,
  GRATITUDE_PROMPTS,
  QUOTES,
  pickForDay,
};
