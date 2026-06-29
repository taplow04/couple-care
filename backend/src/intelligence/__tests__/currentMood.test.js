const { test } = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const emotion = require("../engines/emotion.engine");
const { deriveCurrentMood, MOODS } = require("../lib/currentMood");

const cfg = getConfig();

test("AI current mood is deterministic for identical input", () => {
  const input = {
    score: 82,
    confidence: 88,
    trend: "positive",
    direction: "up",
    signalsMeta: { storyToday: true, recentCall: true },
    historyScores: [80, 81, 83],
  };
  const a = deriveCurrentMood(input);
  const b = deriveCurrentMood(input);
  assert.deepStrictEqual(a, b);
});

test("AI current mood NEVER asserts certainty (always an estimate, hedged)", () => {
  for (const conf of [10, 55, 74, 91]) {
    const m = deriveCurrentMood({ score: 80, confidence: conf, signalsMeta: {}, historyScores: [] });
    assert.strictEqual(m.isEstimate, true);
    assert.match(m.headline, /^(Probably|Possibly|Maybe) /);
    assert.strictEqual(m.confidence, conf);
  }
});

test("score bands map to the expected mood family", () => {
  const at = (score, meta = {}) => deriveCurrentMood({ score, confidence: 70, signalsMeta: meta, historyScores: [] }).moodType;
  assert.strictEqual(at(90, { lastMoodType: "loved", lastMoodRecent: true }), "loved");
  assert.strictEqual(at(72), "happy");
  assert.strictEqual(at(60), "calm");
  assert.strictEqual(at(50), "peaceful");
  assert.strictEqual(at(40), "stressed");
  // Low band names the recent negative feeling when the user told us.
  assert.strictEqual(at(30, { lastMoodType: "anxious", lastMoodRecent: true }), "anxious");
  assert.strictEqual(at(20), "low");
});

test("stability is higher for a steady history than a volatile one", () => {
  const steady = deriveCurrentMood({ score: 70, confidence: 60, signalsMeta: {}, historyScores: [70, 71, 69, 70] });
  const volatile = deriveCurrentMood({ score: 70, confidence: 60, signalsMeta: {}, historyScores: [20, 95, 30, 90] });
  assert.ok(steady.stability.score > volatile.stability.score);
});

test("every mood key resolves to an emoji + label", () => {
  for (const key of Object.keys(MOODS)) {
    assert.ok(MOODS[key].emoji && MOODS[key].label, `mood ${key} must have emoji + label`);
  }
});

test("new emotion signals show up in the breakdown when present", () => {
  const r = emotion.score(
    {
      moods: [{ moodType: "happy", intensity: 7 }],
      emojiPositivity: 90,
      replySpeed: 80,
      callConnection: 70,
      voiceWarmth: 60,
      storyCaptions: 75,
      sharedActivity: 65,
    },
    cfg,
  );
  assert.ok(r.signals.includes("emojiPositivity"));
  assert.ok(r.signals.includes("callConnection"));
  assert.ok(r.signals.includes("sharedActivity"));
});

test("emotion with NO new signals scores identically to the classic set (regression-free)", () => {
  const classic = {
    moods: [{ moodType: "happy", intensity: 8 }, { moodType: "loved", intensity: 7 }],
    sentMessages: [{ text: "i love you, today was amazing and fun" }],
    journal: [{ content: "grateful and happy and proud today" }],
    tempoScore: 80,
    sleepWellbeing: 75,
  };
  const before = emotion.score(classic, cfg);
  // Adding only NULL new signals must not change the score.
  const withNulls = emotion.score(
    { ...classic, emojiPositivity: null, callConnection: null, sharedActivity: null },
    cfg,
  );
  assert.strictEqual(before.score, withNulls.score);
});
