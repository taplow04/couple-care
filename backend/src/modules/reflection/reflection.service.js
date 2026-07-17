const DailyReflection = require("./reflection.model");
const User = require("../users/user.model");
const { generateAIResponse } = require("../ai/ai.engine");
const { buildReflectionReportPrompt } = require("../ai/ai.prompts");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");
const { recordGrowthActivity } = require("../growth/growth.engagement");
const { publish } = require("../../intelligence/events/bus");
const EVENTS = require("../../intelligence/events/events");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// UTC YYYY-MM-DD — must match engagement.service.dayKey.
const dayKey = (d = Date.now()) => new Date(d).toISOString().slice(0, 10);
const DAY_MS = 86400000;

const NUMERIC_FIELDS = [
  "energy",
  "stress",
  "sleepQuality",
  "productivity",
  "exercise",
  "mood",
  "relationshipSatisfaction",
  "communicationRating",
];
const TEXT_FIELDS = ["gratitude", "partnerAppreciation", "highlight", "challenge", "notes"];

// Whitelist + coerce the client payload — every field is optional.
const sanitize = (data = {}) => {
  const doc = {};
  for (const key of NUMERIC_FIELDS) {
    if (data[key] === null || data[key] === undefined || data[key] === "") continue;
    const n = Number(data[key]);
    if (Number.isFinite(n)) doc[key] = Math.round(n);
  }
  for (const key of TEXT_FIELDS) {
    if (typeof data[key] === "string") doc[key] = data[key];
  }
  return doc;
};

/**
 * Create or update TODAY's reflection (idempotent — saving twice updates the
 * same entry). On the FIRST save of the day it feeds the engagement loop
 * (couple XP/streak for paired users, growth XP/streak for solo users) and
 * publishes REFLECTION_COMPLETED so the intelligence layer recomputes live.
 */
const saveToday = async (userId, data) => {
  const doc = sanitize(data);
  if (!Object.keys(doc).length) throw createError("Nothing to save", 400);

  const day = dayKey();
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user) throw createError("User not found", 404);

  const existing = await DailyReflection.findOne({ userId, day });
  let reflection;
  let isNew = false;

  if (existing) {
    Object.assign(existing, doc);
    reflection = await existing.save();
  } else {
    try {
      reflection = await DailyReflection.create({
        userId,
        coupleId: user.currentCoupleId || null,
        day,
        ...doc,
      });
      isNew = true;
    } catch (e) {
      if (e.code === 11000) {
        // Lost the same-day race — fall back to updating the winner's doc.
        reflection = await DailyReflection.findOneAndUpdate({ userId, day }, doc, { new: true });
      } else {
        throw e;
      }
    }
  }

  // Feed the shared engagement loop once per day. Never blocks the save.
  if (isNew) {
    try {
      if (user.currentCoupleId) {
        await recordActivity(user.currentCoupleId, userId, ACTIVITY_TYPES.REFLECTION, { day });
      } else {
        await recordGrowthActivity(userId, "reflection", { awardXp: true, day });
      }
    } catch (e) {
      console.error("[reflection] engagement record failed:", e.message);
    }
  }

  // Tell the intelligence layer (best-effort, in-process).
  publish(EVENTS.REFLECTION_COMPLETED, {
    coupleId: user.currentCoupleId || null,
    userId: String(userId),
  });

  return reflection;
};

const getToday = async (userId) => {
  return DailyReflection.findOne({ userId, day: dayKey() });
};

const getHistory = async (userId, days = 30) => {
  const span = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);
  const since = dayKey(Date.now() - span * DAY_MS);
  return DailyReflection.find({ userId, day: { $gte: since } }).sort({ day: 1 });
};

// ── reports (deterministic stats + best-effort AI narrative) ──

const avgOf = (rows, field) => {
  const vals = rows.map((r) => r[field]).filter((v) => typeof v === "number");
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
};

const averagesOf = (rows) => {
  const out = {};
  for (const f of NUMERIC_FIELDS) out[f] = avgOf(rows, f);
  return out;
};

// Consecutive-day reflection streak ending today or yesterday (non-punishing).
const streakOf = (rows, now = Date.now()) => {
  const daysSet = new Set(rows.map((r) => r.day));
  let cursor = daysSet.has(dayKey(now)) ? now : now - DAY_MS;
  let streak = 0;
  while (daysSet.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
};

const getReport = async (userId, period = "weekly") => {
  const days = period === "monthly" ? 30 : 7;
  const now = Date.now();
  const currentSince = dayKey(now - days * DAY_MS);
  const previousSince = dayKey(now - 2 * days * DAY_MS);

  const [current, previous] = await Promise.all([
    DailyReflection.find({ userId, day: { $gte: currentSince } }).sort({ day: 1 }),
    DailyReflection.find({ userId, day: { $gte: previousSince, $lt: currentSince } }).sort({ day: 1 }),
  ]);

  const averages = averagesOf(current);
  const previousAverages = averagesOf(previous);
  const deltas = {};
  for (const f of NUMERIC_FIELDS) {
    deltas[f] =
      averages[f] != null && previousAverages[f] != null
        ? Math.round((averages[f] - previousAverages[f]) * 10) / 10
        : null;
  }

  const stats = {
    period,
    days,
    entries: current.length,
    previousEntries: previous.length,
    completionRate: Math.round((current.length / days) * 100),
    streak: streakOf(current, now),
    averages,
    previousAverages,
    deltas,
  };

  // Chart-ready series (oldest-first).
  const series = current.map((r) => {
    const point = { day: r.day };
    for (const f of NUMERIC_FIELDS) point[f] = r[f] ?? null;
    return point;
  });

  // AI trend narrative — best-effort, never blocks the deterministic report.
  let analysis = null;
  if (current.length >= 2) {
    const lines = current
      .slice(-14)
      .map((r) => {
        const nums = NUMERIC_FIELDS.filter((f) => r[f] != null)
          .map((f) => `${f}:${r[f]}`)
          .join(" ");
        const texts = [r.highlight && `highlight:"${r.highlight}"`, r.challenge && `challenge:"${r.challenge}"`]
          .filter(Boolean)
          .join(" ");
        return `  ${r.day}: ${nums}${texts ? ` ${texts}` : ""}`;
      })
      .join("\n");
    const avgLine = NUMERIC_FIELDS.filter((f) => averages[f] != null)
      .map((f) => `${f} avg ${averages[f]}${deltas[f] != null ? ` (${deltas[f] >= 0 ? "+" : ""}${deltas[f]} vs prior ${period === "monthly" ? "month" : "week"})` : ""}`)
      .join(", ");
    try {
      analysis = await generateAIResponse(
        buildReflectionReportPrompt(period, `Recent entries:\n${lines}\n\nAverages: ${avgLine}`),
      );
    } catch {
      analysis = null;
    }
  }

  return { stats, series, analysis };
};

module.exports = {
  saveToday,
  getToday,
  getHistory,
  getReport,
  NUMERIC_FIELDS,
};
