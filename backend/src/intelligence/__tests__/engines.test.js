const { test } = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const emotion = require("../engines/emotion.engine");
const trust = require("../engines/trust.engine");
const growth = require("../engines/growth.engine");
const memory = require("../engines/memory.engine");
const context = require("../meta/context.engine");
const { A, B, ago } = require("./fixtures");

const cfg = getConfig();

// ── Emotion (per-user) ──
test("emotion: positive moods + warm messages → positive trend; deterministic", () => {
  const features = {
    moods: [
      { userId: A, moodType: "happy", intensity: 8, createdAt: ago(1) },
      { userId: A, moodType: "loved", intensity: 7, createdAt: ago(2) },
    ],
    sentMessages: [
      { text: "i love you so much, today was amazing", createdAt: ago(1) },
      { text: "thank you, you're the best, so happy", createdAt: ago(2) },
    ],
  };
  const r1 = emotion.score(features, cfg);
  const r2 = emotion.score(features, cfg);
  assert.deepStrictEqual(r1, r2);
  assert.ok(r1.score >= 70);
  assert.strictEqual(r1.trend, "positive");
  assert.ok(/confidence/.test(r1.statement)); // never claims certainty
});

test("emotion: no data → neutral baseline with very low confidence", () => {
  const r = emotion.score({ moods: [], sentMessages: [] }, cfg);
  assert.strictEqual(r.score, cfg.thresholds.neutralBaseline);
  assert.ok(r.confidence <= 25);
});

// ── Trust (couple) — ports the existing Trust Center sub-scores verbatim ──
test("trust: golden sub-scores match the original Trust Center formulas", () => {
  const r = trust.score(
    { myMsgs: 100, partnerMsgs: 100, streak: 10, longest: 20, bothActiveToday: true, transparencyPct: 80 },
    cfg,
  );
  assert.strictEqual(r.breakdown.communication, 100); // 60 vol + 40 balance
  assert.strictEqual(r.breakdown.participation, 84); // 40 + 20 + 24
  assert.strictEqual(r.breakdown.consistency, 70); // 60 + 10
  assert.strictEqual(r.breakdown.transparency, 80);
  assert.strictEqual(r.breakdown.supportiveness, 60); // neutral default
});

test("trust: one-sided messaging lowers communication vs balanced", () => {
  const balanced = trust.score({ myMsgs: 100, partnerMsgs: 100 }, cfg);
  const oneSided = trust.score({ myMsgs: 200, partnerMsgs: 0 }, cfg);
  assert.ok(balanced.breakdown.communication > oneSided.breakdown.communication);
});

// ── Growth (couple) ──
test("growth: more accomplishments → higher score; deterministic", () => {
  const low = growth.score({ achievements: 1, bucketCompleted: 0, memories: 1 }, cfg);
  const high = growth.score(
    { achievements: 12, bucketCompleted: 8, memories: 10, stories: 15, challenges: 6, dailyMoments: 20, loveLetters: 3, aiSessions: 5, journeyProgress: 80 },
    cfg,
  );
  assert.ok(high.score > low.score);
  assert.deepStrictEqual(growth.score({ achievements: 5 }, cfg), growth.score({ achievements: 5 }, cfg));
});

// ── Memory (couple) — deterministic chronological assembly ──
test("memory: assembles chapters in stable chronological order", () => {
  const features = {
    memories: [{ title: "Trip", memoryDate: ago(10) }, { title: "Dinner", memoryDate: ago(2) }],
    moments: [],
    dailyMoments: [{ day: "2026-06-20" }],
    achievements: [{ key: "first_steps", unlockedAt: ago(30) }],
  };
  const a = memory.assemble(features, "monthly");
  const b = memory.assemble(features, "monthly");
  assert.deepStrictEqual(a, b);
  const times = a.chapters.map((c) => new Date(c.at).getTime());
  for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1]);
  assert.strictEqual(a.counts.memories, 2);
});

// ── Context scenarios (deterministic detection) ──
test("context: busy_week + conflict_period detected from features", () => {
  const busy = context.detect({ activityVsBaseline: 0.3, daysTogether: 200 });
  assert.ok(busy.tags.includes("busy_week"));

  const conflict = context.detect({ positivity: 0.2, activityVsBaseline: 0.6, daysTogether: 200 });
  assert.ok(conflict.tags.includes("conflict_period"));
  assert.ok(conflict.modifiers.conflictRecovery > 1);
});
