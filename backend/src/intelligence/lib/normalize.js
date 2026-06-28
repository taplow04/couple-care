/**
 * CCIE shared math — pure, deterministic, time-injectable. Every helper that
 * depends on "now" takes it explicitly so engines are reproducible in tests
 * (pass a fixed `now`); production passes Date.now().
 */
const POSITIVE_MOODS = new Set(["happy", "loved", "excited"]);
const NEGATIVE_MOODS = new Set(["sad", "angry", "stressed", "anxious"]);

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const DAY_MS = 24 * 60 * 60 * 1000;

// UTC YYYY-MM-DD — matches engagement.service.dayKey.
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// Timestamp `n` days before `now`.
const daysAgo = (now, n) => now - n * DAY_MS;

// Days elapsed between two ms timestamps.
const daysBetween = (a, b) => (b - a) / DAY_MS;

// Intensity-weighted positivity ratio (0..1) for a set of moods. null if empty.
const positivityRatio = (moods) => {
  let pos = 0;
  let neg = 0;
  for (const m of moods) {
    const w = m.intensity || 1;
    if (POSITIVE_MOODS.has(m.moodType)) pos += w;
    else if (NEGATIVE_MOODS.has(m.moodType)) neg += w;
  }
  if (pos + neg === 0) return null;
  return pos / (pos + neg);
};

// Count of distinct UTC days present in a list of {createdAt|date}.
const distinctDays = (items, field = "createdAt") =>
  new Set(items.map((i) => dayKey(i[field] || i.createdAt))).size;

// Saturating normaliser: raw count → 0..100 (count == denom → 100).
const saturate = (count, denom) => Math.min((count || 0) / denom, 1) * 100;

// Map a 0..100 score to a level label using thresholds.levels.
const levelFor = (score, levels) => {
  for (const { min, label } of levels) {
    if (score >= min) return label;
  }
  return levels[levels.length - 1].label;
};

// Piecewise-linear interpolation over [x, y] anchors (x ascending).
const piecewise = (x, anchors) => {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (x <= x1) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return anchors[anchors.length - 1][1];
};

module.exports = {
  POSITIVE_MOODS,
  NEGATIVE_MOODS,
  DAY_MS,
  clamp,
  dayKey,
  daysAgo,
  daysBetween,
  positivityRatio,
  distinctDays,
  saturate,
  levelFor,
  piecewise,
};
