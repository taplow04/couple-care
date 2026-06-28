/**
 * AI daily tip for solo users — reuses the existing Groq engine + personal
 * context. Best-effort with a deterministic fallback so the card is never empty,
 * and word-capped so it stays a one-liner (never a paragraph).
 */
const { generateAIResponse } = require("../ai/ai.engine");
const { buildDailyTipPrompt } = require("../ai/ai.prompts");
const {
  buildPersonalContext,
  formatPersonalContext,
} = require("../ai/ai.context.personal");
const { resolveStage } = require("../users/stage.helper");
const User = require("../users/user.model");
const { QUOTES, pickForDay } = require("./growth.constants");
const { dayKey } = require("./growth.engagement");

const clampWords = (text, max = 30) => {
  const words = String(text || "").trim().split(/\s+/);
  return words.length <= max ? words.join(" ") : `${words.slice(0, max).join(" ")}…`;
};

const fallbackTip = (stage, day) => {
  const q = pickForDay(QUOTES, day, 5);
  return stage === "healing"
    ? "Be gentle with yourself today — healing isn't linear, and rest is progress too."
    : `Reflect on what you want in love. ${q.text}`;
};

const getDailyTip = async (userId) => {
  const day = dayKey();
  let stage = "preparing";
  try {
    const user = await User.findById(userId).select("currentCoupleId");
    const resolved = await resolveStage(user);
    stage = resolved.stage === "healing" ? "healing" : "preparing";
  } catch {
    /* default preparing */
  }

  try {
    const ctx = await buildPersonalContext(userId);
    const prompt = buildDailyTipPrompt(stage, formatPersonalContext(ctx));
    const raw = await generateAIResponse(prompt, 0.7, 90);
    const tip = clampWords(raw, 30);
    if (tip) return { tip, source: "ai", stage };
  } catch (e) {
    console.error("[growth] daily tip AI failed:", e.message);
  }

  return { tip: fallbackTip(stage, day), source: "fallback", stage };
};

module.exports = { getDailyTip };
