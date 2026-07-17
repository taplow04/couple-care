/**
 * Specs for the Relationship Pulse engine + Change Detection + the memory
 * engine's recap highlights. Pure engines, fixed clock, no DB — the same rules
 * as every other CCIE spec: determinism, partner-order invariance, graceful
 * degrade, hedged language.
 */
const test = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const pulseEngine = require("../engines/pulse.engine");
const changeDetection = require("../meta/changeDetection.engine");
const memoryEngine = require("../engines/memory.engine");
const { NOW, A, B, ago, healthyCouple, inactiveCouple } = require("./fixtures");

const cfg = getConfig();

// Full-featured pulse fixture on top of the shared healthy couple.
const pulseFeatures = (over = {}) => ({
  ...healthyCouple(),
  callCount: 5,
  videoCount: 2,
  voiceCount: 4,
  storyCount: 6,
  bucketCompleted: 3,
  dailyMomentsCount: 8,
  responsiveness: 72,
  conflictRecoveryPct: 60,
  activityVsBaseline: 1.0,
  supportRatio: 0.8,
  trustFeatures: { streak: 9, longest: 21, myMsgs: 200, partnerMsgs: 190 },
  growthFeatures: {
    achievements: 6,
    bucketCompleted: 3,
    journeyProgress: 40,
    memories: 3,
  },
  historyDays: 10,
  ...over,
});

test("pulse: deterministic — same input yields byte-identical output", () => {
  const a = pulseEngine.score(pulseFeatures(), cfg);
  const b = pulseEngine.score(pulseFeatures(), cfg);
  assert.deepStrictEqual(a, b);
});

test("pulse: partner-order invariance — swapping A/B gives the identical score", () => {
  const base = pulseFeatures();
  const swapped = pulseFeatures({
    partnerIds: [B, A],
    moodsA: base.moodsB,
    moodsB: base.moodsA,
  });
  assert.strictEqual(pulseEngine.score(base, cfg).score, pulseEngine.score(swapped, cfg).score);
});

test("pulse: reports all seven sub-scores for a fully active couple", () => {
  const result = pulseEngine.score(pulseFeatures(), cfg);
  for (const key of ["communication", "consistency", "engagement", "support", "activity", "growth", "connection"]) {
    assert.ok(typeof result.breakdown[key] === "number", `missing sub-score: ${key}`);
    assert.ok(result.breakdown[key] >= 0 && result.breakdown[key] <= 100);
  }
  assert.ok(result.score > 50, `active couple should beat neutral, got ${result.score}`);
  assert.ok(result.factors.length === 7);
  assert.ok(result.reasons.length >= 1);
});

test("pulse: graceful degrade — a data-less couple gets neutral baseline, no crash", () => {
  const result = pulseEngine.score({ ...inactiveCouple(), historyDays: 0 }, cfg);
  assert.strictEqual(result.score, cfg.thresholds.neutralBaseline);
  assert.deepStrictEqual(result.breakdown, {});
  assert.ok(result.confidence <= 40, "no data should mean low confidence");
});

test("pulse: statement is hedged and names the in-app-only basis", () => {
  const result = pulseEngine.score(pulseFeatures(), cfg);
  assert.match(result.statement, /inside CoupleCare/i);
  assert.match(result.statement, /confidence/i);
});

// ── change detection ──

const changeFeatures = (over = {}) => ({
  now: NOW,
  recent: { messages: 10, calls: 1, stories: 1, memories: 1, moods: 4, reflections: 2, positivity: 0.7 },
  baseline: { messages: 120, calls: 9, stories: 9, memories: 3, moods: 15, reflections: 9, positivity: 0.7 },
  lastStoryAt: ago(2),
  lastMemoryAt: ago(2),
  lastReflectionAt: ago(1),
  hasEverStory: true,
  hasEverMemory: true,
  hasEverReflection: true,
  ...over,
});

test("changes: a large message drop is observed with hedged, non-accusatory copy", () => {
  const obs = changeDetection.detect(changeFeatures());
  const drop = obs.find((o) => o.kind === "messages_drop");
  assert.ok(drop, "expected a messages_drop observation");
  assert.strictEqual(drop.type, "activity_drop");
  assert.match(drop.message, /we noticed|typical for you/i);
  assert.doesNotMatch(drop.message, /you failed|you must|your fault|ignor/i);
  assert.match(drop.explanation, /inside CoupleCare/i);
});

test("changes: a rise is celebrated as positive_progress", () => {
  const obs = changeDetection.detect(
    changeFeatures({
      recent: { messages: 90, calls: 1, stories: 1, memories: 1, moods: 4, reflections: 2, positivity: 0.7 },
      baseline: { messages: 90, calls: 3, stories: 3, memories: 1, moods: 9, reflections: 6, positivity: 0.7 },
    }),
  );
  const rise = obs.find((o) => o.kind === "messages_rise");
  assert.ok(rise, "expected a messages_rise observation");
  assert.strictEqual(rise.type, "positive_progress");
  assert.strictEqual(rise.tone, "positive");
});

test("changes: quiet couples below the baseline floor produce NO drop observations", () => {
  const obs = changeDetection.detect(
    changeFeatures({
      recent: { messages: 1, calls: 0, stories: 0, memories: 0, moods: 1, reflections: 0, positivity: null },
      baseline: { messages: 6, calls: 1, stories: 1, memories: 0, moods: 2, reflections: 0, positivity: null },
      lastStoryAt: ago(2),
      lastMemoryAt: ago(2),
      lastReflectionAt: ago(1),
    }),
  );
  assert.ok(!obs.some((o) => o.kind.endsWith("_drop")), "low-volume couples must not be scolded");
});

test("changes: story/memory gaps only fire for couples who HAVE the habit", () => {
  const withHabit = changeDetection.detect(changeFeatures({ lastStoryAt: ago(20), lastMemoryAt: ago(15) }));
  assert.ok(withHabit.some((o) => o.kind === "story_gap"));
  assert.ok(withHabit.some((o) => o.kind === "memory_gap"));

  const noHabit = changeDetection.detect(
    changeFeatures({ hasEverStory: false, hasEverMemory: false, lastStoryAt: null, lastMemoryAt: null }),
  );
  assert.ok(!noHabit.some((o) => o.kind === "story_gap" || o.kind === "memory_gap"));
});

test("changes: a mood positivity slide is a high-priority hedged observation", () => {
  const obs = changeDetection.detect(
    changeFeatures({
      recent: { messages: 40, calls: 3, stories: 3, memories: 1, moods: 6, reflections: 3, positivity: 0.3 },
      baseline: { messages: 120, calls: 9, stories: 9, memories: 3, moods: 15, reflections: 9, positivity: 0.75 },
    }),
  );
  const shift = obs.find((o) => o.kind === "mood_shift_down");
  assert.ok(shift, "expected a mood_shift_down observation");
  assert.strictEqual(shift.priority, "high");
  assert.match(shift.message, /observation/i);
});

test("changes: deterministic — same features, same observations", () => {
  assert.deepStrictEqual(changeDetection.detect(changeFeatures()), changeDetection.detect(changeFeatures()));
});

// ── memory recap highlights ──

test("memory: recap highlights speak only to what actually happened", () => {
  const recap = memoryEngine.assemble(
    {
      memories: [{ title: "Beach day", memoryDate: ago(1), createdAt: ago(1) }],
      moments: [{ type: "photo", createdAt: ago(0) }],
      dailyMoments: [],
      achievements: [],
      messageCount: 42,
      moods: [
        { moodType: "happy", intensity: 7 },
        { moodType: "loved", intensity: 8 },
      ],
      callCount: 1,
    },
    "daily",
  );
  assert.ok(recap.highlights.some((h) => h.includes("42 meaningful messages")));
  assert.ok(recap.highlights.some((h) => h.includes("Positive moods")));
  assert.ok(recap.highlights.some((h) => h.includes("One shared story")));
  assert.strictEqual(recap.counts.messages, 42);
  assert.strictEqual(recap.counts.calls, 1);
});

test("memory: a quiet day yields NO highlights (so no recap notification)", () => {
  const recap = memoryEngine.assemble(
    { memories: [], moments: [], dailyMoments: [], achievements: [], messageCount: 0, moods: [], callCount: 0 },
    "daily",
  );
  assert.deepStrictEqual(recap.highlights, []);
});
