/**
 * Short in-app quizzes for the self-knowledge cards. Pure data + deterministic
 * scoring — no AI, no I/O. Each quiz returns a cached result on the User.
 */

// ── Relationship Readiness — 6 statements, 1–5 agreement → 0–100 score ──
const READINESS_QUESTIONS = [
  { key: "self_worth", text: "I feel worthy of love just as I am." },
  { key: "independence", text: "I can be happy and whole on my own." },
  { key: "communication", text: "I can express my needs calmly and clearly." },
  { key: "boundaries", text: "I can set and respect healthy boundaries." },
  { key: "past", text: "I've made peace with my past relationships." },
  { key: "openness", text: "I'm open to being vulnerable with the right person." },
];

// answers: { [key]: 1..5 }. Score = mean / 5 * 100.
const scoreReadiness = (answers = {}) => {
  const vals = READINESS_QUESTIONS.map((q) =>
    Math.max(1, Math.min(5, Number(answers[q.key]) || 3)),
  );
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((mean / 5) * 100);
};

// ── Love Language — pick the most-chosen of 5 across short scenarios ──
const LOVE_LANGUAGES = [
  "words_of_affirmation",
  "quality_time",
  "acts_of_service",
  "physical_touch",
  "receiving_gifts",
];

const LOVE_LANGUAGE_LABELS = {
  words_of_affirmation: "Words of Affirmation",
  quality_time: "Quality Time",
  acts_of_service: "Acts of Service",
  physical_touch: "Physical Touch",
  receiving_gifts: "Receiving Gifts",
};

const LOVE_LANGUAGE_QUESTIONS = [
  {
    key: "ll1",
    text: "What makes you feel most loved?",
    options: [
      { label: "Hearing 'I appreciate you'", value: "words_of_affirmation" },
      { label: "Undivided time together", value: "quality_time" },
      { label: "Someone doing a chore for you", value: "acts_of_service" },
      { label: "A warm hug", value: "physical_touch" },
      { label: "A thoughtful little gift", value: "receiving_gifts" },
    ],
  },
  {
    key: "ll2",
    text: "On a hard day, you'd most want…",
    options: [
      { label: "Encouraging words", value: "words_of_affirmation" },
      { label: "Company, no agenda", value: "quality_time" },
      { label: "Help with your to-do list", value: "acts_of_service" },
      { label: "To be held", value: "physical_touch" },
      { label: "A small surprise", value: "receiving_gifts" },
    ],
  },
  {
    key: "ll3",
    text: "You show love by…",
    options: [
      { label: "Telling people how you feel", value: "words_of_affirmation" },
      { label: "Making time for them", value: "quality_time" },
      { label: "Doing things for them", value: "acts_of_service" },
      { label: "Physical closeness", value: "physical_touch" },
      { label: "Giving meaningful gifts", value: "receiving_gifts" },
    ],
  },
];

// answers: { [questionKey]: loveLanguageValue }. Returns the mode.
const scoreLoveLanguage = (answers = {}) => {
  const tally = {};
  Object.values(answers).forEach((v) => {
    if (LOVE_LANGUAGES.includes(v)) tally[v] = (tally[v] || 0) + 1;
  });
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return winner ? winner[0] : null;
};

// ── Attachment Style — 4 styles, pick the dominant ──
const ATTACHMENT_STYLES = ["secure", "anxious", "avoidant", "fearful_avoidant"];

const ATTACHMENT_LABELS = {
  secure: "Secure",
  anxious: "Anxious",
  avoidant: "Avoidant",
  fearful_avoidant: "Fearful-Avoidant",
};

const ATTACHMENT_QUESTIONS = [
  {
    key: "at1",
    text: "When someone gets close, you usually…",
    options: [
      { label: "Feel comfortable and trusting", value: "secure" },
      { label: "Worry they'll pull away", value: "anxious" },
      { label: "Want some space", value: "avoidant" },
      { label: "Crave closeness but fear it", value: "fearful_avoidant" },
    ],
  },
  {
    key: "at2",
    text: "In conflict, you tend to…",
    options: [
      { label: "Talk it through calmly", value: "secure" },
      { label: "Need lots of reassurance", value: "anxious" },
      { label: "Shut down or withdraw", value: "avoidant" },
      { label: "Swing between both", value: "fearful_avoidant" },
    ],
  },
  {
    key: "at3",
    text: "Depending on a partner feels…",
    options: [
      { label: "Natural and safe", value: "secure" },
      { label: "Necessary but scary", value: "anxious" },
      { label: "Uncomfortable", value: "avoidant" },
      { label: "Confusing", value: "fearful_avoidant" },
    ],
  },
];

const scoreAttachment = (answers = {}) => {
  const tally = {};
  Object.values(answers).forEach((v) => {
    if (ATTACHMENT_STYLES.includes(v)) tally[v] = (tally[v] || 0) + 1;
  });
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return winner ? winner[0] : null;
};

module.exports = {
  READINESS_QUESTIONS,
  scoreReadiness,
  LOVE_LANGUAGES,
  LOVE_LANGUAGE_LABELS,
  LOVE_LANGUAGE_QUESTIONS,
  scoreLoveLanguage,
  ATTACHMENT_STYLES,
  ATTACHMENT_LABELS,
  ATTACHMENT_QUESTIONS,
  scoreAttachment,
};
