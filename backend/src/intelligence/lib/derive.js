/**
 * CCIE derived metrics — pure, deterministic transforms over raw rows. Kept
 * separate from features.js (DB) so they're unit-testable with fixtures. Each
 * returns null when there isn't enough signal (so the engine can skip that
 * component — graceful degrade).
 */
const { daysAgo, dayKey, DAY_MS } = require("./normalize");

/**
 * Responsiveness (0..100) from reply gaps: when the sender flips (a real reply),
 * how soon did it come? Median reply gap → score. Faster ⇒ higher. Needs ≥3
 * replies in the window or returns null.
 */
const responsiveness = (messages, now, windowDays = 14) => {
  const msgs = messages
    .filter((m) => new Date(m.createdAt).getTime() >= daysAgo(now, windowDays))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const gaps = [];
  for (let i = 1; i < msgs.length; i++) {
    const prev = String(msgs[i - 1].senderId);
    const cur = String(msgs[i].senderId);
    if (prev && cur && prev !== cur) {
      const gapMin = (new Date(msgs[i].createdAt) - new Date(msgs[i - 1].createdAt)) / 60000;
      if (gapMin >= 0) gaps.push(gapMin);
    }
  }
  if (gaps.length < 3) return null;
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  // 5 min → ~100, 6 h → ~0 (exponential decay, deterministic).
  const score = 100 * Math.exp(-median / 180);
  return Math.max(0, Math.min(100, score));
};

/**
 * Sleep sync (0..100): on nights BOTH partners logged, how aligned were their
 * sleep start times? Needs ≥2 shared nights or returns null.
 */
const sleepSync = (sleepA, sleepB) => {
  const byDayA = new Map(sleepA.map((s) => [s.day, s]));
  const shared = sleepB.filter((s) => byDayA.has(s.day));
  if (shared.length < 2) return null;
  let total = 0;
  for (const b of shared) {
    const a = byDayA.get(b.day);
    const diffH = Math.abs(new Date(a.sleepAt) - new Date(b.sleepAt)) / 3600000;
    // 0h apart → 100, 4h+ apart → 0.
    total += Math.max(0, 100 - (diffH / 4) * 100);
  }
  return total / shared.length;
};

/**
 * Conflict recovery (0..100): did a negative-mood day get followed within 3 days
 * by a positive reconnection (a positive mood OR a memory)? Rewards bouncing
 * back. null when there were no negative days to recover from.
 */
const POSITIVE = new Set(["happy", "loved", "excited"]);
const NEGATIVE = new Set(["sad", "angry", "stressed", "anxious"]);
const conflictRecovery = (moods, memories, now, windowDays = 30) => {
  const within = (d) => new Date(d).getTime() >= daysAgo(now, windowDays);
  const negs = moods.filter((m) => NEGATIVE.has(m.moodType) && within(m.createdAt));
  if (negs.length === 0) return null;
  let recovered = 0;
  for (const neg of negs) {
    const t = new Date(neg.createdAt).getTime();
    const windowEnd = t + 3 * DAY_MS;
    const bounce =
      moods.some((m) => POSITIVE.has(m.moodType) && new Date(m.createdAt).getTime() > t && new Date(m.createdAt).getTime() <= windowEnd) ||
      memories.some((m) => {
        const mt = new Date(m.memoryDate || m.createdAt).getTime();
        return mt > t && mt <= windowEnd;
      });
    if (bounce) recovered += 1;
  }
  return (recovered / negs.length) * 100;
};

/**
 * Activity vs the couple's OWN baseline: recent-7-day activity count ÷ the
 * prior-3-weeks daily average (×7). >1 = busier than usual, <1 = quieter. null
 * when there's no prior baseline.
 */
const activityVsBaseline = (events, now) => {
  const t = (e) => new Date(e.createdAt || e.memoryDate || e).getTime();
  const recent = events.filter((e) => t(e) >= daysAgo(now, 7)).length;
  const prior = events.filter((e) => t(e) < daysAgo(now, 7) && t(e) >= daysAgo(now, 28)).length;
  if (prior === 0) return null;
  const priorWeekly = (prior / 21) * 7;
  if (priorWeekly === 0) return null;
  return recent / priorWeekly;
};

module.exports = { responsiveness, sleepSync, conflictRecovery, activityVsBaseline };
