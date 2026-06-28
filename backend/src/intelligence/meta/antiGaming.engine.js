/**
 * Anti-gaming engine — sanitises raw feature signals BEFORE scoring so the
 * system rewards meaningful, reciprocal engagement, not volume or spam.
 * Deterministic; pure functions over the raw arrays.
 *
 * Strategies:
 *  - duplicate/burst collapse: identical low-content messages fired in quick
 *    succession count once
 *  - meaningful gate: ultra-short messages are "low content"
 *  - per-day caps: messages/moods/stories/AI beyond a daily cap stop adding volume
 *
 * NOTE: the relationshipHealth engine adopts this in Phase B (Phase A stays
 * byte-for-byte identical to the original formula). The functions are unit-tested
 * independently in Phase A.
 */
const { dayKey } = require("../lib/normalize");

// Collapse identical consecutive messages within the burst window to one, and
// drop ultra-short "low content" messages from the meaningful count.
const sanitizeMessages = (messages, cfg) => {
  const { duplicateBurstWindowMs, minMeaningfulMessageLen, maxMessagesPerDay } =
    cfg.thresholds.antiGaming;

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  const kept = [];
  const perDay = {};
  let lastText = null;
  let lastAt = 0;
  let lastSender = null;

  for (const m of sorted) {
    const text = (m.text || "").trim();
    const at = new Date(m.createdAt).getTime();
    const sender = String(m.senderId || m.userId || "");

    // Burst duplicate: same sender + same text within the window of the PREVIOUS
    // identical message (sliding window) → skip. A continuous stream of identical
    // messages collapses to one regardless of total span.
    const isDuplicate =
      text &&
      text === lastText &&
      sender === lastSender &&
      at - lastAt <= duplicateBurstWindowMs;

    // Track the last-seen message for the next comparison (kept or skipped).
    lastText = text;
    lastAt = at;
    lastSender = sender;

    if (isDuplicate) continue;

    // Per-day volume cap (spam beyond cap doesn't add to counted volume).
    const dk = dayKey(m.createdAt);
    perDay[dk] = (perDay[dk] || 0) + 1;
    if (perDay[dk] > maxMessagesPerDay) continue;

    kept.push(m);
  }

  // Meaningful subset (used for sentiment/quality, not raw volume).
  const meaningful = kept.filter(
    (m) => (m.text || "").trim().length >= minMeaningfulMessageLen,
  );

  return { messages: kept, meaningful };
};

// Cap rapid-fire mood logging per day (keeps the first N of each day).
const sanitizeMoods = (moods, cfg) => {
  const cap = cfg.thresholds.antiGaming.maxMoodsPerDay;
  const perDay = {};
  const sorted = [...moods].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  return sorted.filter((m) => {
    const dk = dayKey(m.createdAt);
    perDay[dk] = (perDay[dk] || 0) + 1;
    return perDay[dk] <= cap;
  });
};

// Generic per-day cap (stories, AI sessions, …).
const capPerDay = (items, cap) => {
  const perDay = {};
  const sorted = [...items].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
  return sorted.filter((i) => {
    const dk = dayKey(i.createdAt);
    perDay[dk] = (perDay[dk] || 0) + 1;
    return perDay[dk] <= cap;
  });
};

module.exports = { sanitizeMessages, sanitizeMoods, capPerDay };
