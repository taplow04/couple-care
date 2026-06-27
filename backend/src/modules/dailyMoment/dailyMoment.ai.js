/**
 * Daily Couple Moment — AI summary (Feature 3 / 13).
 *
 * Reuses the existing Groq engine + the shared prompt catalog. Generation is
 * ALWAYS best-effort and bounded: a model/network failure must never break recap
 * creation, and the output is hard-capped at AI_SUMMARY_MAX_WORDS so it stays a
 * card caption, never a paragraph.
 */
const { generateAIResponse } = require("../ai/ai.engine");
const { buildDailyMomentSummaryPrompt } = require("../ai/ai.prompts");
const { getDaysTogether } = require("../couples/couple.helpers");
const { AI_SUMMARY_MAX_WORDS, MOOD_EMOJI } = require("./dailyMoment.constants");

const firstName = (n) => (n || "").split(" ")[0] || "you";

// Trim to a hard word ceiling and strip stray markdown/quotes the model may add.
const clampWords = (text, max = AI_SUMMARY_MAX_WORDS) => {
  const clean = String(text || "")
    .replace(/[*_#>`"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = clean.split(" ").filter(Boolean);
  if (words.length <= max) return clean;
  return `${words.slice(0, max).join(" ")}…`;
};

// Deterministic fallback used when the AI is unavailable, so the card always has
// a warm line (Feature 16 — graceful degradation, no broken UI).
const fallbackSummary = (stats, partnerOne, partnerTwo) => {
  const moodBit = stats.topMood ? ` You both felt ${stats.topMood} ${MOOD_EMOJI[stats.topMood] || ""}.`.trimEnd() : "";
  return `Today, ${firstName(partnerOne)} and ${firstName(partnerTwo)} both showed up for each other with ${stats.counts.moments} shared moment${stats.counts.moments === 1 ? "" : "s"}.${moodBit} Small moments like these are what keep love growing.`.trim();
};

/**
 * Generate a ≤60-word recap line. Returns { summary, ok }. Never throws.
 * `couple`/`partners` are passed in so we don't re-query.
 */
const generateDailySummary = async (stats, { couple, partnerOne, partnerTwo }) => {
  const p1 = firstName(partnerOne?.name);
  const p2 = firstName(partnerTwo?.name);
  try {
    const prompt = buildDailyMomentSummaryPrompt({
      partnerOne: p1,
      partnerTwo: p2,
      moments: stats.counts.moments,
      photos: stats.counts.photos,
      videos: stats.counts.videos,
      messages: stats.messageCount,
      topMood: stats.topMood,
      streak: stats.streak,
      daysTogether: couple ? getDaysTogether(couple) : 0,
    });
    // Low token ceiling — this is a caption, not a report.
    const raw = await generateAIResponse(prompt, 0.7, 120);
    const summary = clampWords(raw);
    if (!summary) return { summary: fallbackSummary(stats, p1, p2), ok: false };
    return { summary, ok: true };
  } catch (e) {
    console.error("[daily-moment] AI summary failed:", e.message);
    return { summary: fallbackSummary(stats, p1, p2), ok: false };
  }
};

module.exports = { generateDailySummary, fallbackSummary, clampWords };
