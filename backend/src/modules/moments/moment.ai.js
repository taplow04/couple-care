/**
 * Moment AI understanding (Feature 13). Reuses the existing Groq engine + the
 * shared relationship context — NO new SDK / service. Given a moment's caption,
 * type, and (optional) the author's chosen mood, it produces ONE short, warm
 * observation plus up to three suggested moods drawn from the real mood enum.
 *
 * The suggestion is purely advisory: the caller stores it for display and never
 * overwrites the user's chosen mood.
 */
const { generateAIResponse } = require("../ai/ai.engine");
const { buildRelationshipContext, formatContext } = require("../ai/ai.context");
const { SUGGESTABLE_MOODS } = require("./moment.constants");

const buildMomentPrompt = ({ type, caption, contextText }) => `
You are CoupleCare's gentle companion reacting to a "Moment" one partner just shared.

Relationship context (private background — do not quote it):
${contextText}

The shared Moment:
- Type: ${type}
- Caption: ${caption ? `"${caption}"` : "(no caption)"}

Based on the caption and context, infer the likely vibe of this moment.

Respond with EXACTLY two lines and nothing else:
OBSERVATION: <one warm, specific sentence, max ~14 words, no emojis required>
MOODS: <1-3 comma-separated moods, chosen ONLY from this list: ${SUGGESTABLE_MOODS.join(", ")}>
`;

// Parse the strict two-line response. Tolerant of model drift.
const parseResponse = (raw) => {
  const text = (raw || "").trim();
  let observation = "";
  let moods = [];

  for (const line of text.split("\n")) {
    const l = line.trim();
    if (/^observation\s*:/i.test(l)) {
      observation = l.replace(/^observation\s*:/i, "").trim();
    } else if (/^moods\s*:/i.test(l)) {
      moods = l
        .replace(/^moods\s*:/i, "")
        .split(",")
        .map((m) => m.trim().toLowerCase())
        .filter((m) => SUGGESTABLE_MOODS.includes(m));
    }
  }

  // Fallback: if the model ignored the format, use the first sentence as the
  // observation and infer no moods.
  if (!observation && text) {
    observation = text.split("\n")[0].slice(0, 120);
  }

  return { text: observation, moods: [...new Set(moods)].slice(0, 3) };
};

/**
 * Analyse a moment. Best-effort: any failure returns an empty suggestion so the
 * upload flow is never blocked by AI being down / unconfigured.
 */
const analyzeMoment = async (authorId, { type, caption }) => {
  try {
    if (!process.env.GROQ_API_KEY) return { text: "", moods: [] };

    const ctx = await buildRelationshipContext(authorId);
    const prompt = buildMomentPrompt({
      type,
      caption,
      contextText: formatContext(ctx),
    });
    const raw = await generateAIResponse(prompt, 0.6, 120);
    return parseResponse(raw);
  } catch (e) {
    console.error("[moments] AI analysis failed:", e.message);
    return { text: "", moods: [] };
  }
};

module.exports = { analyzeMoment, buildMomentPrompt, parseResponse };
