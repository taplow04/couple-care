/**
 * AI Current Mood derivation — PURE + deterministic (no DB, no LLM, no Date.now).
 *
 * This is the THIRD, independent mood concept (see the brief):
 *   • Manual Mood  — what the user explicitly logged (Mood collection, has intensity)
 *   • Story Mood   — what the user tagged on a single Moment (Moment.mood, per-post)
 *   • AI Current Mood — THIS: a continuously-estimated emotional state derived from
 *     many signals. It is NEVER written into the Mood collection, carries NO
 *     intensity, and is ALWAYS framed as an estimate with a confidence.
 *
 * Given the emotion engine's 0–100 score + the recency `signalsMeta` + the user's
 * own score history, it returns a friendly mood label, emoji, honest headline
 * ("Probably …" / "Possibly …"), confidence, trend, emotional stability, and a
 * short list of human-readable reasons ("Shared a Moment today", "Sleep improved").
 */

// AI mood vocabulary — intentionally RICHER than the 7 manual mood types (calm,
// peaceful, content…), because the AI estimate is its own concept.
const MOODS = {
  loved: { emoji: "❤️", label: "Loved", valence: "positive" },
  happy: { emoji: "😊", label: "Happy", valence: "positive" },
  excited: { emoji: "🤩", label: "Excited", valence: "positive" },
  content: { emoji: "🙂", label: "Content", valence: "positive" },
  calm: { emoji: "😌", label: "Calm", valence: "neutral" },
  peaceful: { emoji: "🌸", label: "Peaceful", valence: "neutral" },
  neutral: { emoji: "😐", label: "Steady", valence: "neutral" },
  stressed: { emoji: "😔", label: "Stressed", valence: "low" },
  anxious: { emoji: "😟", label: "Anxious", valence: "low" },
  sad: { emoji: "😢", label: "Down", valence: "low" },
  angry: { emoji: "😠", label: "Frustrated", valence: "low" },
  low: { emoji: "😔", label: "Low", valence: "low" },
};

const NEGATIVE_MANUAL = new Set(["sad", "anxious", "stressed", "angry"]);

// Map a 0–100 emotional score → a base AI mood key, then refine with the most
// recent manual mood (a recent explicit log nudges the flavour, never overrides
// the band wholesale — the estimate stays signal-driven).
const pickMoodKey = (score, meta) => {
  const last = meta?.lastMoodType;
  const lastRecent = meta?.lastMoodRecent;

  if (score >= 80) {
    if (lastRecent && last === "loved") return "loved";
    if (lastRecent && last === "excited") return "excited";
    if ((meta?.reactionsReceived || 0) >= 3 || meta?.recentCall) return "loved";
    return "happy";
  }
  if (score >= 68) return lastRecent && last === "excited" ? "excited" : "happy";
  if (score >= 58) return "calm";
  if (score >= 48) return "peaceful";
  if (score >= 38) {
    if (lastRecent && NEGATIVE_MANUAL.has(last)) return last;
    return "stressed";
  }
  // Low band — name the specific feeling if the user told us recently.
  if (lastRecent && NEGATIVE_MANUAL.has(last)) return last;
  return "low";
};

// Honest framing — never assert. Higher confidence ⇒ stronger hedge word.
const headlineWord = (confidence) =>
  confidence >= 80 ? "Probably" : confidence >= 60 ? "Possibly" : "Maybe";

// Emotional stability (0–100) from the spread of recent scores — steadier history
// ⇒ higher stability. null history ⇒ unknown (returns a neutral 50 + "building").
const stabilityFrom = (historyScores = [], current) => {
  const scores = [current, ...historyScores].filter((n) => typeof n === "number");
  if (scores.length < 3) {
    return { score: null, label: "Building a baseline", samples: scores.length };
  }
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  const sd = Math.sqrt(variance);
  // sd 0 ⇒ 100 (rock-steady); sd 30+ ⇒ ~0 (very volatile).
  const score = Math.max(0, Math.min(100, Math.round(100 - (sd / 30) * 100)));
  const label = score >= 75 ? "Very steady" : score >= 50 ? "Fairly steady" : "Fluctuating";
  return { score, label, samples: scores.length };
};

// Build the prioritised "why" list. Positive reasons lead when the mood is
// positive; supportive framing when it's low. Capped at `limit`.
const buildReasons = (meta = {}, valence, limit = 4) => {
  const reasons = [];
  if (meta.storyToday) reasons.push("Shared a Moment today");
  if (meta.recentCall) reasons.push("Recent call with your partner");
  if (meta.positiveChat) reasons.push("Warm, positive messages lately");
  else if (meta.chatActive) reasons.push("Active conversations");
  if (meta.sleepImproved) reasons.push("Sleep improved recently");
  if (meta.voiceRecent) reasons.push("Sent voice notes");
  if ((meta.reactionsReceived || 0) > 0) reasons.push("Partner reacted to your Moments");
  if ((meta.recentMemories || 0) > 0) reasons.push("Created new memories together");
  if (meta.journaledRecently) reasons.push("Reflected in your journal");
  if (meta.lastMoodRecent && meta.lastMoodType) {
    reasons.push(`You recently logged feeling ${meta.lastMoodType}`);
  }
  if (valence === "low" && reasons.length === 0) {
    reasons.push("Quieter activity than usual");
  }
  if (reasons.length === 0) reasons.push("Based on your recent activity");
  return reasons.slice(0, limit);
};

/**
 * @param {object} input
 *   score          0–100 emotional score (emotion engine)
 *   confidence     0–100
 *   trend          "positive" | "balanced" | "low" (engine label)
 *   direction      "up" | "down" | "steady" (self-history trend)
 *   signalsMeta    recency facts (features.gatherEmotionFeatures)
 *   historyScores  recent daily emotion scores (newest first)
 *   signals        active signal keys (for transparency)
 */
const deriveCurrentMood = (input) => {
  const {
    score = 50,
    confidence = 0,
    trend = "balanced",
    direction = "steady",
    signalsMeta = {},
    historyScores = [],
    signals = [],
  } = input;

  const key = pickMoodKey(score, signalsMeta);
  const def = MOODS[key] || MOODS.neutral;
  const word = headlineWord(confidence);
  const stability = stabilityFrom(historyScores, score);
  const reasons = buildReasons(signalsMeta, def.valence);

  return {
    moodType: key, // AI mood key (own vocabulary)
    emoji: def.emoji,
    label: def.label, // "Happy"
    display: `Feeling ${def.label}`, // chat-header copy
    headline: `${word} ${def.label}`, // honest framing: "Probably Happy"
    valence: def.valence,
    score, // underlying 0–100 emotional score
    confidence, // %
    trend, // engine trend label
    direction, // up | down | steady
    stability, // { score, label, samples }
    reasons, // human-readable "why"
    signals, // active signal keys (transparency)
    isEstimate: true, // the UI must always present this as an estimate
  };
};

module.exports = { deriveCurrentMood, MOODS };
