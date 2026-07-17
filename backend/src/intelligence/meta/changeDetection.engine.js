/**
 * Relationship Change Detection (COUPLE — identical for both partners).
 *
 * Pure, deterministic pass over two windows of the couple's OWN in-app
 * activity: the recent window (7 days) vs their personal baseline (the prior
 * 21 days, per-week averaged). It emits OBSERVATIONS, never accusations —
 * every message is hedged ("we noticed…", "compared with what's typical for
 * you…") and framed as an invitation, not a verdict. Positive shifts are
 * surfaced too (positive_progress), so the assistant celebrates as much as it
 * nudges.
 *
 * A couple is only compared against ITSELF (never other couples), and only
 * from actions performed inside CoupleCare.
 *
 * Feature payload comes from lib/features.gatherChangeFeatures — this module is
 * DB-free so it stays unit-testable with fixtures.
 */
const { DAY_MS } = require("../lib/normalize");

// How far a metric must fall below its baseline before we mention it, and how
// far above before we celebrate it. Minimum baseline volume gates keep us from
// over-reading quiet couples (a drop from 2 messages to 1 is noise).
const RULES = {
  dropRatio: 0.5, // recent ≤ 50% of baseline → gentle observation
  riseRatio: 1.5, // recent ≥ 150% of baseline → positive progress
  minBaselinePerWeek: { messages: 10, moods: 3, calls: 2, stories: 2, memories: 1 },
  storyGapDays: 14,
  memoryGapDays: 10,
  reflectionGapDays: 3,
  moodPositivityDropPct: 25,
};

const round = (n) => Math.round(n * 10) / 10;

// One metric drop/rise check → observation or null.
const compareMetric = (key, recentCount, baselineWeekly, copy) => {
  const min = RULES.minBaselinePerWeek[key] || 1;
  if (baselineWeekly < min) return null;
  const ratio = recentCount / baselineWeekly;
  if (ratio <= RULES.dropRatio) {
    const pct = Math.round((1 - ratio) * 100);
    return {
      kind: `${key}_drop`,
      tone: "attention",
      type: "activity_drop",
      category: copy.category,
      priority: "normal",
      title: copy.dropTitle,
      message: copy.dropMessage(pct),
      explanation: `Observed inside CoupleCare only: ~${round(recentCount)} this week vs your usual ~${round(baselineWeekly)}/week over the prior 3 weeks.`,
    };
  }
  if (ratio >= RULES.riseRatio && recentCount >= min) {
    const pct = Math.round((ratio - 1) * 100);
    return {
      kind: `${key}_rise`,
      tone: "positive",
      type: "positive_progress",
      category: copy.category,
      priority: "low",
      title: copy.riseTitle,
      message: copy.riseMessage(pct),
      explanation: `Observed inside CoupleCare only: ~${round(recentCount)} this week vs your usual ~${round(baselineWeekly)}/week over the prior 3 weeks.`,
    };
  }
  return null;
};

const COPY = {
  messages: {
    category: "chat",
    dropTitle: "Conversations have been quieter",
    dropMessage: (pct) =>
      `We noticed your conversations have become less frequent — about ${pct}% below what's typical for you. Would you like to check in with your partner? 💬`,
    riseTitle: "Your communication is up",
    riseMessage: (pct) =>
      `Your communication has improved this week — about ${pct}% more messages than your usual rhythm. Keep it going! 💕`,
  },
  calls: {
    category: "calls",
    dropTitle: "Fewer calls than usual",
    dropMessage: () =>
      "Calls have dropped compared with your usual pattern. Hearing each other's voice can go a long way — maybe a quick call today? 📞",
    riseTitle: "You're calling more",
    riseMessage: () => "You've been calling each other more than usual this week. Lovely to see. 📞💕",
  },
  moods: {
    category: "mood",
    dropTitle: "Fewer mood check-ins",
    dropMessage: () =>
      "Mood check-ins have been less frequent than what's typical for you. A quick log helps you both stay in tune. 😊",
    riseTitle: "Great mood-tracking rhythm",
    riseMessage: () => "You've been checking in with your moods more than usual — that awareness really helps. 😊",
  },
  stories: {
    category: "stories",
    dropTitle: "Story sharing slowed down",
    dropMessage: () =>
      "You've been sharing fewer Moments than usual. Want to capture something from today? 📷",
    riseTitle: "You're sharing more Moments",
    riseMessage: () => "You two have been sharing more Moments than usual this week. 📷✨",
  },
  memories: {
    category: "memories",
    dropTitle: "Memory-making slowed down",
    dropMessage: () =>
      "Fewer memories have been added lately compared with your usual pace. A small one still counts. 📔",
    riseTitle: "Memory-making is up",
    riseMessage: () => "You've been capturing more memories than usual — your timeline is growing beautifully. 📔💕",
  },
};

/**
 * Pure detection core.
 * @param {object} features gatherChangeFeatures output:
 *   { now, recent: {messages,moods,calls,stories,memories,reflections,positivity},
 *     baseline: {messages,moods,calls,stories,memories,reflections,positivity},
 *     lastStoryAt, lastMemoryAt, lastReflectionAt, hasEverStory, hasEverMemory,
 *     hasEverReflection }
 *   recent counts cover 7 days; baseline counts cover the prior 21 days.
 * @returns {Array<observation>} sorted attention-first; may be empty.
 */
const detect = (features) => {
  const now = features.now ?? Date.now();
  const recent = features.recent || {};
  const baseline = features.baseline || {};
  const weekly = (k) => (baseline[k] || 0) / 3; // 21d baseline → per-week average
  const observations = [];

  for (const key of Object.keys(COPY)) {
    const obs = compareMetric(key, recent[key] || 0, weekly(key), COPY[key]);
    if (obs) observations.push(obs);
  }

  // ── gap detections (only for couples who HAVE the habit — never scold a
  // couple for a feature they've never used) ──
  const daysSince = (at) => (at ? (now - new Date(at).getTime()) / DAY_MS : Infinity);

  if (features.hasEverStory && daysSince(features.lastStoryAt) >= RULES.storyGapDays) {
    observations.push({
      kind: "story_gap",
      tone: "info",
      type: "story_reminder",
      category: "stories",
      priority: "low",
      title: "It's been a while since your last Moment",
      message: `No Moment has been shared for ${Math.floor(daysSince(features.lastStoryAt))} days. Want to capture one today? 📷`,
      explanation: "Based only on when Moments were last posted inside CoupleCare.",
    });
  }

  if (features.hasEverMemory && daysSince(features.lastMemoryAt) >= RULES.memoryGapDays) {
    observations.push({
      kind: "memory_gap",
      tone: "info",
      type: "memory_reminder",
      category: "memories",
      priority: "low",
      title: "Time for a new memory?",
      message: `You haven't created a memory in ${Math.floor(daysSince(features.lastMemoryAt))} days. Even a small one keeps your story growing. 📔`,
      explanation: "Based only on when memories were last added inside CoupleCare.",
    });
  }

  if (
    features.hasEverReflection &&
    daysSince(features.lastReflectionAt) >= RULES.reflectionGapDays
  ) {
    observations.push({
      kind: "reflection_gap",
      tone: "info",
      type: "reflection_reminder",
      category: "ai",
      priority: "low",
      title: "Your daily reflection is waiting",
      message:
        "Reflections have been skipped for a few days. One minute tonight is all it takes — no pressure. 🌙",
      explanation: "Based only on your own reflection entries inside CoupleCare.",
    });
  }

  // ── mood shift: recent positivity vs baseline positivity (both partners'
  // moods; a couple-symmetric signal). Only when both windows have moods. ──
  if (recent.positivity != null && baseline.positivity != null) {
    const delta = (recent.positivity - baseline.positivity) * 100;
    if (delta <= -RULES.moodPositivityDropPct) {
      observations.push({
        kind: "mood_shift_down",
        tone: "attention",
        type: "behaviour_change",
        category: "mood",
        priority: "high",
        title: "Mood patterns have shifted",
        message:
          "Recent mood logs look heavier than what's typical for you two. This is just an observation — would a check-in or a small surprise help? 💛",
        explanation: `Observed inside CoupleCare only: mood positivity moved ${Math.round(delta)} points vs your prior 3-week pattern.`,
      });
    } else if (delta >= RULES.moodPositivityDropPct) {
      observations.push({
        kind: "mood_shift_up",
        tone: "positive",
        type: "positive_progress",
        category: "mood",
        priority: "low",
        title: "Brighter moods this week",
        message: "Both of your recent moods look brighter than usual. Whatever you're doing — it's working. ☀️",
        explanation: `Observed inside CoupleCare only: mood positivity moved +${Math.round(delta)} points vs your prior 3-week pattern.`,
      });
    }
  }

  const TONE_ORDER = { attention: 0, info: 1, positive: 2 };
  return observations.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
};

module.exports = { detect, RULES };
