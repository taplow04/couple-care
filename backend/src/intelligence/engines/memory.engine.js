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
    },
    chapters,
  };
};

module.exports = { assemble, PERIODS };
