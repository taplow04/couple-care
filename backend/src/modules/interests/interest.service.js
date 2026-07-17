const InterestProfile = require("./interest.model");
const {
  INTERESTS,
  INTEREST_KEYS,
  FROM_EXPLORE_CATEGORY,
  FROM_BUCKET_CATEGORY,
  FROM_MEMORY_TYPE,
  KEYWORDS,
  SIGNAL_WEIGHTS,
  DECAY_HALF_LIFE_DAYS,
} = require("./interest.constants");

const DAY_MS = 86400000;
const KEY_SET = new Set(INTEREST_KEYS);

/**
 * Record one interest signal. BEST-EFFORT and NEVER throws — interest learning
 * must never break the action that triggered it (same rule as recordActivity).
 * @param {string} source one of SIGNAL_WEIGHTS keys (drives the weight)
 */
const recordSignal = async (userId, category, source = "search") => {
  try {
    if (!userId || !KEY_SET.has(category)) return null;
    const weight = SIGNAL_WEIGHTS[source] ?? 1;
    return await InterestProfile.findOneAndUpdate(
      { userId },
      {
        $inc: {
          [`interests.${category}.points`]: weight,
          [`interests.${category}.count`]: 1,
          totalSignals: 1,
        },
        $set: { [`interests.${category}.lastAt`]: new Date() },
      },
      { upsert: true, new: true },
    );
  } catch (e) {
    console.error("[interests] recordSignal failed:", e.message);
    return null;
  }
};

// Free text (an in-app search, a caption) → categories via the keyword map.
// Deterministic; records at most 3 categories per text. Never throws.
const recordSignalFromText = async (userId, text, source = "search") => {
  try {
    const lower = String(text || "").toLowerCase();
    if (!lower.trim()) return;
    const matched = [];
    for (const [category, words] of Object.entries(KEYWORDS)) {
      if (words.some((w) => lower.includes(w))) matched.push(category);
      if (matched.length >= 3) break;
    }
    await Promise.all(matched.map((c) => recordSignal(userId, c, source)));
  } catch (e) {
    console.error("[interests] recordSignalFromText failed:", e.message);
  }
};

// Domain-taxonomy helpers (each maps then records; unknown keys are ignored).
const recordExploreCategory = (userId, exploreCategory, source) =>
  recordSignal(userId, FROM_EXPLORE_CATEGORY[exploreCategory], source);
const recordBucketCategory = (userId, bucketCategory, source) =>
  recordSignal(userId, FROM_BUCKET_CATEGORY[bucketCategory], source);
const recordMemoryType = (userId, memoryType) =>
  recordSignal(userId, FROM_MEMORY_TYPE[memoryType], "memory");

// Time-decayed effective points: points earned long ago fade with a half-life,
// so the profile reflects CURRENT interests. Deterministic given `now`.
const effectivePoints = (entry, now) => {
  if (!entry || !entry.points) return 0;
  const last = entry.lastAt ? new Date(entry.lastAt).getTime() : now;
  const days = Math.max(0, (now - last) / DAY_MS);
  return entry.points * Math.pow(0.5, days / DECAY_HALF_LIFE_DAYS);
};

/**
 * The Interest Profile: every observed category scored 0–100 relative to the
 * user's STRONGEST interest (so the top interest is always ~100%), sorted
 * descending. Empty list until the user has produced signals.
 */
const getProfile = async (userId, now = Date.now()) => {
  const profile = await InterestProfile.findOne({ userId });
  const meta = Object.fromEntries(INTERESTS.map((i) => [i.key, i]));

  const scored = [];
  if (profile) {
    const entries = profile.interests instanceof Map
      ? Object.fromEntries(profile.interests)
      : profile.interests || {};
    let max = 0;
    const withEff = [];
    for (const [key, entry] of Object.entries(entries)) {
      if (!KEY_SET.has(key)) continue;
      const eff = effectivePoints(entry, now);
      if (eff <= 0) continue;
      withEff.push({ key, eff, count: entry.count || 0, lastAt: entry.lastAt });
      if (eff > max) max = eff;
    }
    for (const item of withEff) {
      scored.push({
        key: item.key,
        label: meta[item.key]?.label || item.key,
        emoji: meta[item.key]?.emoji || "✨",
        percent: Math.max(1, Math.round((item.eff / max) * 100)),
        signals: item.count,
        lastAt: item.lastAt,
      });
    }
    scored.sort((a, b) => b.percent - a.percent);
  }

  return {
    interests: scored,
    totalSignals: profile?.totalSignals || 0,
    updatedAt: profile?.updatedAt || null,
    basis:
      "Learned only from what you do inside CoupleCare — searches, saved ideas, goals and memories. Never from other apps.",
  };
};

/**
 * One compact line for AI prompts ("personalize with their in-app interests").
 * Best-effort: returns "" on any failure so prompt building never breaks.
 */
const interestContextLine = async (userId) => {
  try {
    const { interests } = await getProfile(userId);
    if (!interests.length) return "";
    const top = interests.slice(0, 5).map((i) => `${i.label} (${i.percent}%)`).join(", ");
    return `Their current in-app interests (from CoupleCare activity only): ${top}.`;
  } catch {
    return "";
  }
};

module.exports = {
  recordSignal,
  recordSignalFromText,
  recordExploreCategory,
  recordBucketCategory,
  recordMemoryType,
  getProfile,
  interestContextLine,
};
