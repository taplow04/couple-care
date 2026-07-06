/**
 * Relationship Maturity engine (PER-USER — behavioural, continuously evolving).
 *
 * NOT a personality test: every dimension is scored from OBSERVABLE behaviour
 * inside CoupleCare (moods, messages, journaling, challenges, privacy choices,
 * consistency of showing up). Dimensions with no observable data degrade to
 * null and are skipped (the score is normalised over the active weights), so a
 * solo user is scored only on solo-observable behaviour. Deterministic — `now`
 * is injected via features; no LLM anywhere in the score path.
 *
 * Output is framed as strengths / growth areas / trend — never labels, never
 * certainty. Confidence reflects data sufficiency only.
 */
const { clamp, saturate, levelFor, distinctDays, dayKey, DAY_MS } = require("../lib/normalize");
const { positivityOf } = require("../lib/sentiment");
const derive = require("../lib/derive");
const confidenceEngine = require("../meta/confidence.engine");
const explainEngine = require("../meta/explainability.engine");

const NEGATIVE = new Set(["sad", "angry", "stressed", "anxious"]);
const POSITIVE = new Set(["happy", "loved", "excited"]);

// Count occurrences of any phrase from `phrases` in the user's sent messages.
const phraseHits = (messages, phrases) => {
  let hits = 0;
  for (const m of messages) {
    const text = (m.text || "").toLowerCase();
    if (!text) continue;
    for (const p of phrases) {
      if (text.includes(p)) hits += 1;
    }
  }
  return hits;
};

// ── dimension sub-scores (each 0..100 or null = not observable) ──

// Emotional regulation: negative feelings expressed with moderate intensity +
// bounced back from within a couple of days.
const emotionalRegulation = (moods, now, mt) => {
  if (!moods.length) return null;
  const negs = moods.filter((m) => NEGATIVE.has(m.moodType));
  if (!negs.length) return 85; // no negative spikes observed — steady window
  const moderated = negs.filter((m) => (m.intensity || 5) < mt.regulatedIntensityCeiling).length;
  const moderation = (moderated / negs.length) * 100;
  let recovered = 0;
  for (const n of negs) {
    const t = new Date(n.createdAt).getTime();
    const bounce = moods.some(
      (m) =>
        !NEGATIVE.has(m.moodType) &&
        new Date(m.createdAt).getTime() > t &&
        new Date(m.createdAt).getTime() <= t + 2 * DAY_MS,
    );
    if (bounce) recovered += 1;
  }
  const recovery = (recovered / negs.length) * 100;
  return clamp(0.55 * moderation + 0.45 * recovery);
};

// Communication: regular, positive, substantive exchanges (couple users only).
const communication = (sentMessages, t) => {
  if (!sentMessages.length) return null;
  const activeDays = (distinctDays(sentMessages) / t.windows.primary) * 100;
  const sentiment = positivityOf(sentMessages).ratio;
  const substance =
    sentMessages.reduce((a, m) => a + Math.min((m.text || "").length / 40, 1), 0) /
    sentMessages.length;
  return clamp(
    0.4 * Math.min(activeDays * 2.2, 100) +
      0.35 * ((sentiment ?? 0.6) * 100) +
      0.25 * substance * 100,
  );
};

// Conflict resolution: after own negative-mood days, a positive reconnection
// (positive mood or shared memory) followed within 3 days.
const conflictResolution = (moods, memories, now) => derive.conflictRecovery(moods, memories, now);

// Trust building: choosing openness — partner-visible privacy settings and
// partner-visible moods.
const trustBuilding = (transparencyPct, moods) => {
  if (transparencyPct == null && !moods.length) return null;
  const visibleShare = moods.length
    ? (moods.filter((m) => m.visibility !== "private").length / moods.length) * 100
    : null;
  if (transparencyPct != null && visibleShare != null) return clamp(0.6 * transparencyPct + 0.4 * visibleShare);
  return clamp(transparencyPct ?? visibleShare);
};

// Consistency: distinct active days across everything observable.
const consistency = (feats, mt) => {
  const days = new Set([
    ...feats.activityDays,
    ...feats.journalDays,
    ...feats.myMoods.map((m) => dayKey(m.createdAt)),
    ...feats.sentMessages.map((m) => dayKey(m.createdAt)),
    ...feats.challenges.map((c) => c.day),
  ]);
  if (days.size === 0) return null;
  return clamp(saturate(days.size, mt.saturation.activeDays));
};

// Empathy: when the partner logged a (visible) negative mood, did this user
// show up with a message within the response window?
const empathy = (partnerMoods, sentMessages, mt) => {
  const negs = partnerMoods.filter((m) => NEGATIVE.has(m.moodType));
  if (!negs.length) return null;
  let showedUp = 0;
  for (const n of negs) {
    const t = new Date(n.createdAt).getTime();
    const windowEnd = t + mt.empathyResponseHours * 3600000;
    if (
      sentMessages.some((m) => {
        const mt2 = new Date(m.createdAt).getTime();
        return mt2 > t && mt2 <= windowEnd;
      })
    )
      showedUp += 1;
  }
  return clamp((showedUp / negs.length) * 100);
};

// Accountability: repair language after hard moments (owning mistakes).
const accountability = (sentMessages, repairPhrases, mt) => {
  if (!sentMessages.length) return null;
  const hits = phraseHits(sentMessages, repairPhrases);
  // A base of 40 acknowledges that a calm window may simply need no repairs;
  // observed repair moves lift it toward 100.
  return clamp(40 + saturate(hits, mt.saturation.repairMoves) * 0.6);
};

// Respect: everyday warmth markers vs harsh language in sent messages.
const respect = (sentMessages, warmthWords) => {
  if (sentMessages.length < 5) return null;
  let warm = 0;
  let harsh = 0;
  for (const m of sentMessages) {
    const text = (m.text || "").toLowerCase();
    for (const w of warmthWords) if (text.includes(w)) warm += 1;
    for (const w of ["stupid", "shut up", "whatever", "hate you", "idiot"]) if (text.includes(w)) harsh += 1;
  }
  const warmRate = Math.min(warm / Math.max(sentMessages.length * 0.25, 1), 1);
  const harshPenalty = Math.min(harsh * 15, 60);
  return clamp(45 + warmRate * 55 - harshPenalty);
};

// Patience: considered pacing — not machine-gunning messages in bursts.
const patience = (sentMessages, mt) => {
  if (sentMessages.length < 5) return null;
  const sorted = [...sentMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let burstExtras = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gapMin = (new Date(sorted[i].createdAt) - new Date(sorted[i - 1].createdAt)) / 60000;
    if (gapMin < 1) {
      run += 1;
      if (run > mt.impulsiveBurstSize) burstExtras += 1;
    } else {
      run = 1;
    }
  }
  const burstShare = burstExtras / sorted.length;
  return clamp(100 - burstShare * 220);
};

// Reliability: following through — challenge completion, mood-log regularity,
// live streak.
const reliability = (feats, t, mt) => {
  const parts = [];
  if (feats.challenges.length) {
    const done = feats.challenges.filter((c) => c.completed).length;
    parts.push((done / feats.challenges.length) * 100);
  }
  if (feats.myMoods.length) {
    parts.push(Math.min((distinctDays(feats.myMoods) / t.windows.recent) * 100, 100));
  }
  if (feats.streak > 0) parts.push(saturate(feats.streak, 14));
  if (feats.journalDays.length) parts.push(saturate(new Set(feats.journalDays).size, mt.saturation.journalEntries));
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
};

/**
 * Pure scoring core.
 * @returns {{ score, level, breakdown, confidence, factors, reasons, suggestions, statement }}
 */
const score = (features, cfg, prevBreakdown = null) => {
  const t = cfg.thresholds;
  const mt = t.maturity;
  const w = cfg.weights.maturity;
  const now = features.now ?? Date.now();
  const { REPAIR_PHRASES, WARMTH_WORDS } = cfg.rules;

  const raw = {
    emotionalRegulation: emotionalRegulation(features.myMoods, now, mt),
    communication: communication(features.sentMessages, t),
    conflictResolution: conflictResolution(features.myMoods, features.memories, now),
    trustBuilding: trustBuilding(features.transparencyPct, features.myMoods),
    consistency: consistency(features, mt),
    empathy: empathy(features.partnerMoods, features.sentMessages, mt),
    accountability: accountability(features.sentMessages, REPAIR_PHRASES, mt),
    respect: respect(features.sentMessages, WARMTH_WORDS),
    patience: patience(features.sentMessages, mt),
    reliability: reliability(features, t, mt),
  };

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

  const dataPoints =
    features.myMoods.length +
    features.sentMessages.length +
    features.journalDays.length +
    features.challenges.length;
  const confidence = confidenceEngine.compute(
    { dataPoints, bothPartners: false, historyDays: features.historyDays || 0 },
    cfg,
  );

  const explain = explainEngine.build(breakdown, w, prevBreakdown);

  return {
    score: value,
    level,
    breakdown,
    dimensionsObserved: Object.keys(breakdown),
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    factors: {
      strengths: explain.topPositives,
      growthAreas: explain.areasForImprovement,
    },
    reasons: explain.reasons,
    suggestions: explain.suggestions,
    // Honest framing — behaviour-based estimate, never a verdict on a person.
    statement: `Based on recent activity patterns, your relationship maturity is estimated at ${value}/100 (${confidence.value}% confidence). This reflects observed behaviour, not who you are.`,
  };
};

module.exports = { score };
