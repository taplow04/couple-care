const RelationshipPost = require("./relationshipPost.model");
const { publicScopeGate } = require("./explore.service");
const { CATEGORIES } = require("./explore.constants");

// Deterministic fallback so the panel is never empty (and free when Groq is off).
const FALLBACK = [
  { emoji: "❤️", title: "Recreate your first date", text: "Revisit where it all began — same spot, new memories." },
  { emoji: "✈️", title: "Plan a micro-trip", text: "One night away nearby counts. Small adventures, big reconnection." },
  { emoji: "📸", title: "Golden-hour photo walk", text: "Take turns photographing each other as the sun sets." },
  { emoji: "🎉", title: "Celebrate a tiny anniversary", text: "Monthly 'us' day — cook a meal you both love." },
];

const clean = (s) =>
  String(s || "").replace(/```json|```/g, "").trim();

/**
 * AI relationship inspiration from PUBLIC posts.
 *
 * IMPORTANT (per brief): the AI must NEVER rank by popularity. We feed it a
 * category/caption sample of recent public posts and ask for warm, creative,
 * relationship-healthy ideas — meaning is prioritised, engagement is ignored.
 * Best-effort with a deterministic fallback.
 */
const getInspiration = async (userId = null) => {
  let sample = [];
  // Interest Engine personalisation — best-effort, in-app signals only.
  let interestLine = "";
  if (userId) {
    try {
      interestLine = await require("../interests/interest.service").interestContextLine(userId);
    } catch {
      interestLine = "";
    }
  }
  try {
    const { branches } = await publicScopeGate();
    if (branches.length) {
      const rows = await RelationshipPost.find({ $or: branches })
        .sort({ createdAt: -1 })
        .limit(40)
        .select("category caption location");
      sample = rows.map((r) => ({
        category: r.category,
        caption: (r.caption || "").slice(0, 80),
        location: r.location || "",
      }));
    }
  } catch {
    /* fall through to fallback */
  }

  if (!process.env.GROQ_API_KEY) {
    return { ideas: FALLBACK, source: "curated" };
  }

  try {
    const { generateAIResponse } = require("../ai/ai.engine");
    const cats = CATEGORIES.map((c) => c.key).join(", ");
    const context = sample.length
      ? `Recent public couple posts (category · caption · place):\n${sample
          .map((s) => `- ${s.category} · ${s.caption} · ${s.location}`)
          .join("\n")}`
      : "No community posts yet — suggest timeless ideas.";

    const prompt = `You are CoupleCare's relationship-inspiration guide. Using the community activity below ONLY as loose inspiration (never rank by popularity), suggest 4 warm, specific, healthy ideas couples could try — date ideas, travel, photography, or anniversary celebrations. Prioritise meaningful connection and creative memories, not trends.

Categories available: ${cats}.
${interestLine ? `\n${interestLine} Lean the ideas toward these interests without mentioning that you know them.\n` : ""}
${context}

Return ONLY a JSON array of 4 objects: {"emoji","title","text"}. Keep each "text" under 18 words. No prose, no markdown.`;

    const raw = await generateAIResponse(prompt, 0.7, 400);
    const parsed = JSON.parse(clean(raw));
    if (Array.isArray(parsed) && parsed.length) {
      const ideas = parsed
        .slice(0, 6)
        .filter((i) => i && i.title && i.text)
        .map((i) => ({
          emoji: String(i.emoji || "❤️").slice(0, 4),
          title: String(i.title).slice(0, 60),
          text: String(i.text).slice(0, 160),
        }));
      if (ideas.length) return { ideas, source: "ai" };
    }
  } catch (err) {
    console.error("[explore] AI inspiration failed:", err.message);
  }

  return { ideas: FALLBACK, source: "curated" };
};

module.exports = { getInspiration };
