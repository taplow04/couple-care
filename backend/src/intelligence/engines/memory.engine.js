/**
 * AI Memory engine (couple). NOT a 0–100 scorer — it assembles deterministic
 * relationship timelines/recaps (daily / weekly / monthly / yearly) from the
 * sources that already exist (memories, moments, stories, daily couple moments,
 * achievements, journey). Optional AI narration is text-only and never feeds any
 * score. Phase A is a thin assembler; Phase D wires the real sources + narration.
 *
 * The pure `assemble(features, period)` is deterministic; `gather` (facade) pulls
 * the source rows.
 */
const PERIODS = ["daily", "weekly", "monthly", "yearly"];

const { positivityRatio } = require("../lib/normalize");

// Deterministic emoji highlight lines for the period recap ("Today: ❤️ 42
// meaningful messages · 😊 positive moods · 📷 one shared story…"). Only
// mentions what actually happened — no filler.
const buildHighlights = (features, period) => {
  const { memories = [], moments = [], achievements = [], moods = [] } = features;
  const messageCount = features.messageCount || 0;
  const callCount = features.callCount || 0;
  const highlights = [];

  if (messageCount > 0) {
    highlights.push(`❤️ ${messageCount} meaningful message${messageCount === 1 ? "" : "s"}`);
  }
  const positivity = positivityRatio(moods);
  if (positivity != null) {
    highlights.push(
      positivity >= 0.6
        ? "😊 Positive moods logged"
        : positivity >= 0.4
          ? "😌 Mixed moods logged"
          : "💙 Some heavier moods logged",
    );
  }
  if (moments.length > 0) {
    highlights.push(`📷 ${moments.length === 1 ? "One shared story" : `${moments.length} shared stories`}`);
  }
  if (memories.length > 0) {
    highlights.push(`📔 ${memories.length === 1 ? "One new memory" : `${memories.length} new memories`}`);
  }
  if (callCount > 0) {
    highlights.push(`📞 ${callCount} call${callCount === 1 ? "" : "s"} together`);
  }
  if (achievements.length > 0) {
    highlights.push(`🎉 ${achievements.length === 1 ? "One milestone unlocked" : `${achievements.length} milestones unlocked`}`);
  }
  if (messageCount >= (period === "daily" ? 10 : 40)) {
    highlights.push("💬 Communication looks healthy");
  }
  return highlights;
};

// Build deterministic chapters from already-fetched source items.
const assemble = (features, period = "weekly") => {
  const { memories = [], moments = [], dailyMoments = [], achievements = [] } = features;

  const chapters = [];
  for (const m of memories) {
    chapters.push({
      kind: "memory",
      at: m.memoryDate || m.createdAt,
      title: m.title || "A memory",
    });
  }
  for (const d of dailyMoments) {
    chapters.push({ kind: "daily_moment", at: d.day || d.createdAt, title: "Our day together" });
  }
  for (const a of achievements) {
    chapters.push({ kind: "achievement", at: a.unlockedAt || a.createdAt, title: a.key || "Achievement" });
  }

  // Deterministic order: chronological, then title (stable tiebreak).
  chapters.sort((x, y) => {
    const tx = new Date(x.at).getTime();
    const ty = new Date(y.at).getTime();
    if (tx !== ty) return tx - ty;
    return String(x.title).localeCompare(String(y.title));
  });

  return {
    period,
    counts: {
      memories: memories.length,
      moments: moments.length,
      dailyMoments: dailyMoments.length,
      achievements: achievements.length,
      messages: features.messageCount || 0,
      moods: (features.moods || []).length,
      calls: features.callCount || 0,
    },
    highlights: buildHighlights(features, period),
    chapters,
  };
};

module.exports = { assemble, PERIODS };
