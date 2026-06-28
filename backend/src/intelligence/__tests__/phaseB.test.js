const { test } = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const health = require("../engines/relationshipHealth.engine");
const { healthyCouple, A, B, NOW } = require("./fixtures");

const cfg = getConfig();

// A rich couple = healthy base + new CCIE signals present.
const richCouple = () => ({
  ...healthyCouple(),
  callCount: 6,
  videoCount: 3,
  voiceCount: 8,
  storyCount: 10,
  sleepSyncPct: 80,
  bucketCompleted: 4,
  aiCoachCount: 3,
  achievementCount: 8,
  responsiveness: 85,
  conflictRecoveryPct: 90,
  trustFeatures: { myMsgs: 120, partnerMsgs: 110, streak: 12, longest: 25, bothActiveToday: true, transparencyPct: 80, supportRatio: 0.8 },
  growthFeatures: { achievements: 8, bucketCompleted: 4, memories: 6, stories: 10, challenges: 3, dailyMoments: 12, loveLetters: 2, aiSessions: 3, journeyProgress: 70, xp: 900, level: 5 },
});

test("new CCIE inputs appear in the breakdown when data exists", () => {
  const r = health.score(richCouple(), cfg);
  for (const k of ["calls", "video", "voice", "stories", "sleep", "bucket", "aiCoach", "achievements", "responsiveness", "conflictRecovery", "trust", "growth"]) {
    assert.ok(k in r.breakdown, `expected breakdown.${k}`);
  }
});

test("a data-less couple omits the new components (graceful degrade)", () => {
  const r = health.score(healthyCouple(), cfg);
  assert.ok(!("calls" in r.breakdown));
  assert.ok(!("trust" in r.breakdown));
  // classic 7 always present
  for (const k of ["moodHealth", "communication", "memory", "longevity", "compatibility", "engagement", "aiAnalysis"]) {
    assert.ok(k in r.breakdown);
  }
});

test("determinism + partner-order invariance hold WITH the full input set", () => {
  const f = richCouple();
  const r1 = health.score(f, cfg);
  const r2 = health.score(richCouple(), cfg);
  assert.deepStrictEqual(r1, r2);

  const swapped = {
    ...f,
    moodsA: f.moodsB,
    moodsB: f.moodsA,
    partnerIds: [B, A],
    trustFeatures: { ...f.trustFeatures, myMsgs: f.trustFeatures.partnerMsgs, partnerMsgs: f.trustFeatures.myMsgs },
  };
  const rs = health.score(swapped, cfg);
  assert.strictEqual(r1.score, rs.score);
});

test("anti-gaming: spam volume does NOT out-score genuine two-way variety", () => {
  const base = {
    moods: [], memories: [], moodsA: [], moodsB: [], partnerIds: [A, B], daysTogether: 200, now: NOW,
  };
  // 80 identical messages from one partner in a day (spam).
  const spam = [];
  for (let i = 0; i < 80; i++) spam.push({ senderId: A, text: "hi", createdAt: new Date(NOW - i * 1000) });
  // 20 genuine, varied, reciprocal messages across days.
  const genuine = [];
  for (let d = 0; d < 10; d++) {
    genuine.push({ senderId: A, text: `good morning love ${d}`, createdAt: new Date(NOW - d * 86400000) });
    genuine.push({ senderId: B, text: `morning! miss you ${d}`, createdAt: new Date(NOW - d * 86400000 - 600000) });
  }
  const spamScore = health.score({ ...base, messages: spam }, cfg).breakdown.communication;
  const genuineScore = health.score({ ...base, messages: genuine }, cfg).breakdown.communication;
  assert.ok(genuineScore > spamScore, `genuine ${genuineScore} > spam ${spamScore}`);
});

test("long-distance context is detected and boosts remote channels", () => {
  const ld = health.score(
    {
      moods: [], memories: [{ memoryType: "date", memoryDate: new Date(NOW - 5 * 86400000), createdAt: new Date(NOW - 5 * 86400000) }],
      moodsA: [], moodsB: [], partnerIds: [A, B], daysTogether: 200, now: NOW,
      callCount: 6, videoCount: 4,
    },
    cfg,
  );
  assert.ok(ld.context.tags.includes("long_distance"));
});

test("rich, thriving couple lands in a healthy band with high confidence", () => {
  const r = health.score(richCouple(), cfg);
  assert.ok(r.score >= 65, `score ${r.score}`);
  assert.ok(r.confidence >= 60);
  assert.ok(r.factors.topPositives.length > 0);
});
