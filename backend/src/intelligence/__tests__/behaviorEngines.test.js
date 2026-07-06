/**
 * Specs for the three AI Behaviour Engines (Maturity / Behaviour Intelligence /
 * Healing & Recovery) + the Love Meter 2.0 additive inputs. Pure engines, fixed
 * clock, no DB — the same rules as every other CCIE spec: determinism,
 * partner-order invariance, graceful degrade, hedged language, config-only
 * weights.
 */
const test = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const maturityEngine = require("../engines/maturity.engine");
const behaviorEngine = require("../engines/behavior.engine");
const healingEngine = require("../engines/healing.engine");
const healthEngine = require("../engines/relationshipHealth.engine");
const { NOW, DAY, A, B, ago, mood, msg, healthyCouple, inactiveCouple } = require("./fixtures");

const cfg = getConfig();

// ── shared fixture builders ──

const maturityFeatures = (over = {}) => ({
  now: NOW,
  userId: A,
  hasCouple: true,
  myMoods: [
    mood(A, "happy", 6, 1),
    mood(A, "stressed", 5, 4),
    mood(A, "happy", 7, 3),
    mood(A, "loved", 8, 8),
  ].map((m) => ({ ...m, visibility: "partner_only" })),
  sentMessages: [
    msg(A, 1, "thank you for today, love you"),
    msg(A, 2, "i'm sorry, my fault — i'll do better"),
    msg(A, 4, "how was your day? tell me everything"),
    msg(A, 6, "i appreciate you so much"),
    msg(A, 9, "take your time, no rush at all"),
  ],
  coupleMessages: [],
  partnerMoods: [mood(B, "sad", 6, 2), mood(B, "happy", 7, 5)],
  memories: [{ memoryDate: ago(3), createdAt: ago(3) }],
  journalDays: ["2026-06-25", "2026-06-26"],
  challenges: [
    { day: "2026-06-25", completed: true },
    { day: "2026-06-26", completed: true },
    { day: "2026-06-27", completed: false },
  ],
  activityDays: ["2026-06-24", "2026-06-25", "2026-06-26"],
  streak: 6,
  transparencyPct: 80,
  quizzesTaken: 2,
  historyDays: 0,
  ...over,
});

const healingFeatures = (over = {}) => ({
  now: NOW,
  userId: A,
  endedAt: ago(20),
  moods: [
    mood(A, "sad", 6, 25),
    mood(A, "sad", 7, 18),
    mood(A, "stressed", 5, 12),
    mood(A, "happy", 5, 6),
    mood(A, "happy", 6, 2),
  ],
  journal: [
    { day: "2026-06-20", content: "feeling grateful for small wins today", createdAt: ago(8) },
    { day: "2026-06-24", content: "a good walk, felt calm and hopeful", createdAt: ago(4) },
    { day: "2026-06-27", content: "proud of my progress", createdAt: ago(1) },
  ],
  challenges: [
    { day: "2026-06-24", completed: true },
    { day: "2026-06-26", completed: true },
  ],
  sleepRows: [
    { day: "2026-06-27", hours: 7.5, quality: 4 },
    { day: "2026-06-26", hours: 8, quality: 4 },
  ],
  coachMessages: 3,
  growthReports: 1,
  growthStreak: 4,
  quizzesTaken: 2,
  historyDays: 0,
  ...over,
});

const behaviorFeatures = (over = {}) => ({
  ...healthyCouple(),
  supportRatio: 0.8,
  responsiveness: 70,
  conflictRecoveryPct: 75,
  activityVsBaseline: 1.0,
  voiceCount: 3,
  videoCount: 2,
  storyCount: 5,
  bucketCompleted: 4,
  achievementCount: 6,
  dailyMomentsCount: 8,
  trustFeatures: {
    myMsgs: 120,
    partnerMsgs: 110,
    streak: 9,
    longest: 15,
    bothActiveToday: true,
    transparencyPct: 75,
    supportRatio: 0.8,
  },
  historyDays: 0,
  ...over,
});

// ── Maturity engine ──

test("maturity: deterministic — same features ⇒ identical output", () => {
  const a = maturityEngine.score(maturityFeatures(), cfg);
  const b = maturityEngine.score(maturityFeatures(), cfg);
  assert.deepStrictEqual(a, b);
});

test("maturity: engaged user scores all ten dimensions and lands high", () => {
  const r = maturityEngine.score(maturityFeatures(), cfg);
  assert.strictEqual(r.dimensionsObserved.length, 10);
  assert.ok(r.score >= 60, `expected >= 60, got ${r.score}`);
  for (const v of Object.values(r.breakdown)) {
    assert.ok(v >= 0 && v <= 100);
  }
});

test("maturity: solo user degrades gracefully — couple dimensions skipped, still scored", () => {
  const r = maturityEngine.score(
    maturityFeatures({
      hasCouple: false,
      sentMessages: [],
      coupleMessages: [],
      partnerMoods: [],
      memories: [],
      transparencyPct: null,
    }),
    cfg,
  );
  // communication / empathy / accountability / respect / patience need messages.
  assert.ok(!("communication" in r.breakdown));
  assert.ok(!("empathy" in r.breakdown));
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.ok(r.dimensionsObserved.length >= 3);
});

test("maturity: zero data ⇒ neutral baseline + very low confidence, no crash", () => {
  const r = maturityEngine.score(
    maturityFeatures({
      myMoods: [],
      sentMessages: [],
      coupleMessages: [],
      partnerMoods: [],
      memories: [],
      journalDays: [],
      challenges: [],
      activityDays: [],
      streak: 0,
      transparencyPct: null,
      quizzesTaken: 0,
    }),
    cfg,
  );
  assert.strictEqual(r.score, cfg.thresholds.neutralBaseline);
  assert.ok(r.confidence <= 35);
});

test("maturity: statement is hedged (estimate, never a verdict)", () => {
  const r = maturityEngine.score(maturityFeatures(), cfg);
  assert.match(r.statement, /estimated/i);
  assert.match(r.statement, /not who you are/i);
});

test("maturity: weights are config-only — overriding them moves the score", () => {
  const base = maturityEngine.score(maturityFeatures(), cfg);
  const skewed = getConfig({
    weights: {
      maturity: { ...cfg.weights.maturity, consistency: 5 },
    },
  });
  const r = maturityEngine.score(maturityFeatures(), skewed);
  assert.notStrictEqual(base.score, r.score);
});

// ── Behaviour Intelligence engine ──

test("behavior: deterministic + partner-order invariant", () => {
  const r1 = behaviorEngine.score(behaviorFeatures(), cfg);
  const r2 = behaviorEngine.score(behaviorFeatures(), cfg);
  assert.deepStrictEqual(r1, r2);

  // Swap partner order everywhere it appears — output must be identical.
  const f = behaviorFeatures();
  const swapped = {
    ...f,
    partnerIds: [B, A],
    moodsA: f.moodsB,
    moodsB: f.moodsA,
    trustFeatures: {
      ...f.trustFeatures,
      myMsgs: f.trustFeatures.partnerMsgs,
      partnerMsgs: f.trustFeatures.myMsgs,
    },
  };
  const r3 = behaviorEngine.score(swapped, cfg);
  assert.strictEqual(r1.score, r3.score);
  assert.deepStrictEqual(r1.pattern.distribution, r3.pattern.distribution);
});

test("behavior: reports all seven indicators with hedged insights for a rich couple", () => {
  const r = behaviorEngine.score(behaviorFeatures(), cfg);
  const keys = Object.keys(r.indicators);
  assert.ok(keys.length === 7, `expected 7 indicators, got ${keys.length}: ${keys}`);
  for (const ind of Object.values(r.indicators)) {
    assert.ok(ind.score >= 0 && ind.score <= 100);
    assert.ok(typeof ind.insight === "string" && ind.insight.length > 0);
    // Insights must never make absolute claims about feelings.
    assert.ok(!/definitely|certainly|proves/i.test(ind.insight));
  }
});

test("behavior: established, trusting couple ⇒ growing-love dominant; statement hedged", () => {
  const r = behaviorEngine.score(behaviorFeatures(), cfg);
  assert.strictEqual(r.pattern.dominant, "growingLove");
  assert.match(r.pattern.statement, /behavioural model currently detects/i);
  assert.match(r.pattern.statement, /estimate/i);
  assert.match(r.pattern.statement, /not a statement about how either of you feels/i);
});

test("behavior: brand-new intense couple leans toward attraction over growing love", () => {
  const messages = [];
  for (let d = 0; d < 5; d++) {
    for (let i = 0; i < 22; i++) {
      messages.push(msg(i % 2 ? A : B, d + i * 0.001, "cant wait to see you!!"));
    }
  }
  const f = behaviorFeatures({
    daysTogether: 10,
    messages,
    moods: [mood(A, "excited", 9, 1), mood(B, "excited", 8, 1), mood(A, "excited", 8, 2)],
    moodsA: [mood(A, "excited", 9, 1), mood(A, "excited", 8, 2)],
    moodsB: [mood(B, "excited", 8, 1)],
    memories: [],
    conflictRecoveryPct: null,
    bucketCompleted: 0,
    achievementCount: 0,
    dailyMomentsCount: 0,
    trustFeatures: {
      myMsgs: 60,
      partnerMsgs: 50,
      streak: 3,
      longest: 3,
      bothActiveToday: true,
      transparencyPct: 60,
      supportRatio: 0.7,
    },
  });
  const r = behaviorEngine.score(f, cfg);
  assert.ok(
    r.pattern.distribution.attraction > r.pattern.distribution.growingLove,
    `attraction ${r.pattern.distribution.attraction} should exceed growingLove ${r.pattern.distribution.growingLove}`,
  );
});

test("behavior: quiet couple ⇒ no dominant pattern claimed (not enough signal)", () => {
  const f = behaviorFeatures({
    ...inactiveCouple(),
    supportRatio: null,
    responsiveness: null,
    conflictRecoveryPct: null,
    activityVsBaseline: null,
    voiceCount: 0,
    videoCount: 0,
    storyCount: 0,
    bucketCompleted: 0,
    achievementCount: 0,
    dailyMomentsCount: 0,
    trustFeatures: { myMsgs: 0, partnerMsgs: 0, streak: 0, longest: 0, bothActiveToday: false, transparencyPct: 0, supportRatio: null },
  });
  const r = behaviorEngine.score(f, cfg);
  assert.strictEqual(r.pattern.dominant, null);
  assert.match(r.pattern.statement, /isn't enough recent activity/i);
});

// ── Healing & Recovery engine ──

test("healing: deterministic — same features ⇒ identical output", () => {
  const a = healingEngine.score(healingFeatures(), cfg);
  const b = healingEngine.score(healingFeatures(), cfg);
  assert.deepStrictEqual(a, b);
});

test("healing: engaged recovery ⇒ all dimensions observed, worth-safe framing, engagement monotone", () => {
  const r = healingEngine.score(healingFeatures(), cfg);
  assert.ok(r.score >= 40, `expected >= 40, got ${r.score}`);

  // More engagement must score higher than lighter engagement (never punished).
  const richer = healingEngine.score(
    healingFeatures({
      journal: Array.from({ length: 12 }, (_, i) => ({
        day: `2026-06-${String(10 + i).padStart(2, "0")}`,
        content: "grateful, calm, hopeful today",
        createdAt: ago(i + 1),
      })),
      challenges: Array.from({ length: 10 }, (_, i) => ({
        day: `2026-06-${String(10 + i).padStart(2, "0")}`,
        completed: true,
      })),
      sleepRows: Array.from({ length: 10 }, (_, i) => ({
        day: `2026-06-${String(10 + i).padStart(2, "0")}`,
        hours: 8,
        quality: 4,
      })),
      coachMessages: 8,
      growthStreak: 10,
    }),
    cfg,
  );
  assert.ok(richer.score > r.score, `richer ${richer.score} should beat lighter ${r.score}`);
  for (const k of ["routine", "journaling", "moodCare", "challenges", "sleep", "support", "selfDiscovery"]) {
    assert.ok(k in r.breakdown, `missing dimension ${k}`);
  }
  assert.match(r.statement, /engagement with recovery activities/i);
  assert.match(r.statement, /never your worth/i);
  assert.strictEqual(r.daysSinceBreakup, 20);
});

test("healing: zero data ⇒ neutral baseline, no crash, no scolding insights", () => {
  const r = healingEngine.score(
    healingFeatures({
      moods: [],
      journal: [],
      challenges: [],
      sleepRows: [],
      coachMessages: 0,
      growthReports: 0,
      growthStreak: 0,
      quizzesTaken: 0,
      endedAt: null,
    }),
    cfg,
  );
  assert.strictEqual(r.score, cfg.thresholds.neutralBaseline);
  assert.strictEqual(r.daysSinceBreakup, null);
  // No activity history ⇒ no inactivity/withdrawal claims can be made.
  assert.ok(!r.insights.some((i) => i.type === "withdrawal"));
});

test("healing: mood decline + inactivity + heavy journaling ⇒ gentle support encouragement, never diagnostic", () => {
  const heavy = healingFeatures({
    moods: [
      // prior window: positive; recent window: heavy — a real decline.
      mood(A, "happy", 7, 40),
      mood(A, "happy", 7, 35),
      mood(A, "loved", 6, 30),
      mood(A, "sad", 8, 10),
      mood(A, "sad", 8, 9),
      mood(A, "stressed", 7, 8),
    ],
    journal: [
      { day: "2026-06-14", content: "alone and hurt, everything feels worse", createdAt: ago(14) },
      { day: "2026-06-15", content: "sad and tired of it all, cry", createdAt: ago(13) },
      { day: "2026-06-16", content: "hate this, worst week, hurt", createdAt: ago(12) },
      { day: "2026-06-17", content: "angry and alone again", createdAt: ago(11) },
    ],
    challenges: [{ day: "2026-06-10", completed: true }],
    sleepRows: [],
    coachMessages: 0,
  });
  const r = healingEngine.score(heavy, cfg);
  const types = r.insights.map((i) => i.type);
  assert.ok(types.includes("mood_decline"));
  assert.ok(types.includes("support_encouragement"), `expected support encouragement, got ${types}`);
  const support = r.insights.find((i) => i.type === "support_encouragement");
  assert.match(support.text, /people you trust|qualified professional/i);
  // Never diagnostic language.
  for (const i of r.insights) {
    assert.ok(!/depress|disorder|diagnos|mental illness/i.test(i.text), `clinical language leaked: ${i.text}`);
  }
});

test("healing: a hard week can never LOWER moodCare below pure logging (trend only adds)", () => {
  const base = healingFeatures({
    moods: [mood(A, "sad", 7, 2), mood(A, "sad", 7, 5), mood(A, "stressed", 6, 8)],
  });
  const r = healingEngine.score(base, cfg);
  const loggingOnly = (Math.min(3 / cfg.thresholds.healing.saturation.moodLogs, 1) * 100) * 0.88;
  assert.ok(r.breakdown.moodCare >= Math.floor(loggingOnly), "trend must never punish");
});

// ── Love Meter 2.0 ──

test("love meter 2.0: new inputs are additive — absent data reproduces the old score exactly", () => {
  const f = healthyCouple();
  const before = healthEngine.score(f, cfg);
  const withNulls = healthEngine.score(
    { ...f, maturityAvg: null, bucketTotal: 0, supportRatio: null },
    cfg,
  );
  assert.strictEqual(before.score, withNulls.score);
});

test("love meter 2.0: maturity / emotionalSupport / sharedGoals join when present and are couple-symmetric", () => {
  const f = { ...healthyCouple(), maturityAvg: 82, supportRatio: 0.9, bucketTotal: 8, bucketCompleted: 5 };
  const r = healthEngine.score(f, cfg);
  assert.ok("maturity" in r.breakdown);
  assert.ok("emotionalSupport" in r.breakdown);
  assert.ok("sharedGoals" in r.breakdown);

  // Partner order can't matter: maturityAvg is already an average; swap the rest.
  const swapped = { ...f, partnerIds: [B, A], moodsA: f.moodsB, moodsB: f.moodsA };
  assert.strictEqual(r.score, healthEngine.score(swapped, cfg).score);
});
