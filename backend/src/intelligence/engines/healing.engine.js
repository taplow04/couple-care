/**
 * Healing & Recovery engine (PER-USER — Stage 3 "Growing After Goodbye").
 *
 * The Healing Progress score reflects ENGAGEMENT with recovery activities —
 * journaling, daily challenges, mood check-ins, sleep care, coach support,
 * self-discovery — NEVER emotional worth or "how healed" someone is. Dimensions
 * with no data degrade to null (skipped); a brand-new healing user gets a
 * gentle baseline, not a failing grade.
 *
 * Behavioural insights (withdrawal / mood decline / inactivity / heavy
 * journaling negativity) are gentle, non-judgmental and NEVER diagnostic. When
 * several distress signals stack up, the engine adds an encouragement to lean
 * on trusted people or qualified professionals — it never attempts clinical
 * advice itself.
 *
 * Deterministic: `now` comes from features; no LLM in the score path.
 */
const { clamp, saturate, levelFor, distinctDays, dayKey, daysAgo, DAY_MS } = require("../lib/normalize");
const { positivityOf } = require("../lib/sentiment");
const confidenceEngine = require("../meta/confidence.engine");
const explainEngine = require("../meta/explainability.engine");

const NEGATIVE = new Set(["sad", "angry", "stressed", "anxious"]);
const POSITIVE = new Set(["happy", "loved", "excited"]);

// Intensity-weighted mood positivity for a window (null when empty).
const windowPositivity = (moods, now, fromDays, toDays) => {
  const rows = moods.filter((m) => {
    const t = new Date(m.createdAt).getTime();
    return t >= daysAgo(now, fromDays) && t < daysAgo(now, toDays);
  });
  let pos = 0;
  let neg = 0;
  for (const m of rows) {
    const w = m.intensity || 1;
    if (POSITIVE.has(m.moodType)) pos += w;
    else if (NEGATIVE.has(m.moodType)) neg += w;
  }
  if (pos + neg === 0) return null;
  return (pos / (pos + neg)) * 100;
};

/**
 * Pure scoring core over gatherHealingFeatures output.
 * @returns {{ score, level, breakdown, confidence, insights, factors, statement }}
 */
const score = (features, cfg, prevBreakdown = null) => {
  const t = cfg.thresholds;
  const ht = t.healing;
  const sat = ht.saturation;
  const w = cfg.weights.healing;
  const now = features.now ?? Date.now();
  const { moods = [], journal = [], challenges = [], sleepRows = [] } = features;

  const moods30 = moods.filter((m) => new Date(m.createdAt).getTime() >= daysAgo(now, 30));

  // ── dimensions (null = not observable yet → skipped) ──
  const raw = {};

  // Routine: distinct active days across everything + the growth streak.
  const activeDays = new Set([
    ...journal.map((j) => j.day || dayKey(j.createdAt)),
    ...challenges.map((c) => c.day),
    ...moods30.map((m) => dayKey(m.createdAt)),
    ...sleepRows.map((s) => s.day),
  ]);
  if (activeDays.size > 0 || features.growthStreak > 0) {
    raw.routine = clamp(
      0.7 * saturate(activeDays.size, sat.activeDays) + 0.3 * saturate(features.growthStreak, 10),
    );
  }

  // Journaling consistency.
  if (journal.length > 0) {
    raw.journaling = clamp(
      0.6 * saturate(journal.length, sat.journalEntries) + 0.4 * saturate(distinctDays(journal), 10),
    );
  }

  // Mood care: showing up to log + a GENTLE recovery-trend bonus (engagement
  // first; the trend can only add, never punish a hard week).
  if (moods30.length > 0) {
    const logging = saturate(moods30.length, sat.moodLogs);
    const recent = windowPositivity(moods, now, 14, 0);
    const prior = windowPositivity(moods, now, 42, 14);
    let trendBonus = 0;
    if (recent != null && prior != null && recent > prior) {
      trendBonus = Math.min((recent - prior) / 4, 12);
    }
    raw.moodCare = clamp(logging * 0.88 + trendBonus);
  }

  // Challenges completed.
  if (challenges.length > 0) {
    const done = challenges.filter((c) => c.completed).length;
    raw.challenges = clamp(
      0.7 * saturate(done, sat.challengesCompleted) + 0.3 * (done / challenges.length) * 100,
    );
  }

  // Sleep care: logging + adequacy (~8h).
  if (sleepRows.length > 0) {
    const avgH = sleepRows.reduce((a, s) => a + (s.hours || 0), 0) / sleepRows.length;
    const adequacy = clamp(100 - Math.abs(avgH - 8) * 12.5);
    raw.sleep = clamp(0.6 * saturate(sleepRows.length, sat.sleepLogs) + 0.4 * adequacy);
  }

  // Support: talking it through with the coach.
  if (features.coachMessages > 0) {
    raw.support = clamp(saturate(features.coachMessages, sat.coachMessages));
  }

  // Self-discovery: quizzes + growth report.
  if ((features.quizzesTaken || 0) + (features.growthReports || 0) > 0) {
    raw.selfDiscovery = clamp(
      saturate((features.quizzesTaken || 0) + (features.growthReports || 0), sat.quizzes + 1),
    );
  }

  const breakdown = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !Number.isNaN(v)) breakdown[k] = Math.round(clamp(v));
  }

  let weighted = 0;
  let active = 0;
  for (const [k, sub] of Object.entries(breakdown)) {
    const cw = w[k] || 0;
    if (cw <= 0) continue;
    weighted += sub * cw;
    active += cw;
  }
  const value = active > 0 ? clamp(Math.round(weighted / active)) : t.neutralBaseline;
  const level = levelFor(value, t.levels);

  // ── gentle behavioural insights (non-clinical, non-judgmental) ──
  const insights = [];
  let distressSignals = 0;

  // Inactivity: nothing logged for a while.
  const allTimestamps = [
    ...journal.map((j) => new Date(j.createdAt).getTime()),
    ...moods30.map((m) => new Date(m.createdAt).getTime()),
    ...challenges.filter((c) => c.completed).map((c) => new Date(`${c.day}T12:00:00Z`).getTime()),
  ].filter((n) => !Number.isNaN(n));
  const lastActivity = allTimestamps.length ? Math.max(...allTimestamps) : null;
  if (lastActivity != null && (now - lastActivity) / DAY_MS >= ht.inactivityDays) {
    insights.push({
      type: "inactivity",
      tone: "gentle",
      text: "It's been a little while since your last check-in. No pressure — even one small entry today counts.",
    });
    distressSignals += 1;
  }

  // Withdrawal: recent activity well below the user's own baseline.
  const recentCount = allTimestamps.filter((ts) => ts >= daysAgo(now, 7)).length;
  const priorCount = allTimestamps.filter((ts) => ts < daysAgo(now, 7) && ts >= daysAgo(now, 28)).length;
  if (priorCount >= 6) {
    const priorWeekly = (priorCount / 21) * 7;
    if (priorWeekly > 0 && recentCount / priorWeekly < ht.withdrawalRatio) {
      insights.push({
        type: "withdrawal",
        tone: "gentle",
        text: "You've been quieter than usual this week. Quiet stretches are normal — a small routine, or a chat with someone you trust, can help you stay connected.",
      });
      distressSignals += 1;
    }
  }

  // Mood decline: recent positivity notably below the prior window.
  const recentPos = windowPositivity(moods, now, 14, 0);
  const priorPos = windowPositivity(moods, now, 42, 14);
  if (recentPos != null && priorPos != null && recentPos - priorPos <= ht.moodDeclineDelta) {
    insights.push({
      type: "mood_decline",
      tone: "gentle",
      text: "Your recent mood logs look heavier than the weeks before. That can be a natural part of healing — be extra kind to yourself right now.",
    });
    distressSignals += 1;
  }

  // Heavy journal negativity (a rumination proxy — never diagnosed as such).
  if (journal.length >= 4) {
    const j = positivityOf(journal, "content");
    if (j.ratio != null && 1 - j.ratio >= ht.ruminationNegativeShare) {
      insights.push({
        type: "heavy_journaling",
        tone: "gentle",
        text: "Your recent writing has carried a lot of weight. Writing it out helps — and revisiting a happier memory or a gratitude note can balance the page.",
      });
      distressSignals += 1;
    }
  }

  // When several signals stack up: encourage human support. Never clinical.
  if (distressSignals >= ht.distressSignalCount) {
    insights.push({
      type: "support_encouragement",
      tone: "supportive",
      text: "A few signals suggest this stretch may feel heavy. You don't have to carry it alone — reaching out to people you trust, or a qualified professional, is a sign of strength. CoupleCare can support your routine, but it isn't a substitute for real support.",
    });
  }

  // Positive reinforcement when engagement is genuinely strong.
  if (value >= 70 && insights.length === 0) {
    insights.push({
      type: "encouragement",
      tone: "positive",
      text: "You've been showing up for yourself consistently — that steady effort is what recovery is built on.",
    });
  }

  const dataPoints = moods30.length + journal.length + challenges.length + sleepRows.length + (features.coachMessages || 0);
  const confidence = confidenceEngine.compute(
    { dataPoints, bothPartners: false, historyDays: features.historyDays || 0 },
    cfg,
  );

  const explain = explainEngine.build(breakdown, w, prevBreakdown);

  return {
    score: value,
    level,
    breakdown,
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    insights,
    factors: {
      strengths: explain.topPositives,
      focusAreas: explain.areasForImprovement,
    },
    suggestions: explain.suggestions,
    daysSinceBreakup:
      features.endedAt != null ? Math.max(0, Math.floor((now - new Date(features.endedAt).getTime()) / DAY_MS)) : null,
    statement: `Your Healing Progress is ${value}/100 — this measures your engagement with recovery activities, never your worth or how you should be feeling.`,
  };
};

module.exports = { score };
