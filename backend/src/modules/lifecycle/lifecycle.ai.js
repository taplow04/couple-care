/**
 * Lifecycle AI — reuses the existing Groq engine for two best-effort generations:
 *   • the Relationship Summary reflection (≤80 words, deterministic fallback)
 *   • the private Growth Report
 */
const { generateAIResponse } = require("../ai/ai.engine");
const {
  buildRelationshipReflectionPrompt,
  buildGrowthReportPrompt,
} = require("../ai/ai.prompts");

const clampWords = (text, max) => {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  return words.length <= max ? words.join(" ") : `${words.slice(0, max).join(" ")}…`;
};

const fallbackReflection = ({ stats, partnerOne, partnerTwo }) =>
  `Over ${stats.durationDays} days, ${partnerOne} and ${partnerTwo} shared real moments, ` +
  `laughter, and growth. Not every story lasts forever, and that doesn't erase what was good. ` +
  `Carry the lessons gently, be proud of how you loved, and trust that this chapter helped you grow.`;

const generateRelationshipReflection = async ({ stats, partnerOne, partnerTwo }) => {
  try {
    const prompt = buildRelationshipReflectionPrompt({ stats, partnerOne, partnerTwo });
    const raw = await generateAIResponse(prompt, 0.7, 160);
    const text = clampWords(raw, 80);
    if (text) return text;
  } catch (e) {
    console.error("[lifecycle] reflection AI failed:", e.message);
  }
  return fallbackReflection({ stats, partnerOne, partnerTwo });
};

const fallbackGrowthReport =
  "You showed up, you cared, and you're reflecting now — that's real growth. " +
  "Hold on to what you learned about your needs and boundaries. " +
  "The qualities you valued are a compass for what's next. " +
  "Be patient and kind with yourself; healing takes time, and you're already moving forward.";

const generateGrowthReport = async (answers = []) => {
  const answersText = answers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");
  try {
    const prompt = buildGrowthReportPrompt(answersText);
    const raw = await generateAIResponse(prompt, 0.7, 320);
    if (raw && raw.trim()) return raw.trim();
  } catch (e) {
    console.error("[lifecycle] growth report AI failed:", e.message);
  }
  return fallbackGrowthReport;
};

module.exports = { generateRelationshipReflection, generateGrowthReport };
