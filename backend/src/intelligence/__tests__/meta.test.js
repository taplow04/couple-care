const { test } = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const confidence = require("../meta/confidence.engine");
const learning = require("../meta/learning.engine");
const context = require("../meta/context.engine");
const antiGaming = require("../meta/antiGaming.engine");
const { spamBurst, A, B } = require("./fixtures");

const cfg = getConfig();

test("confidence is monotonic in data volume", () => {
  const low = confidence.compute({ dataPoints: 0, bothPartners: false }, cfg).value;
  const mid = confidence.compute({ dataPoints: 40, bothPartners: false }, cfg).value;
  const high = confidence.compute({ dataPoints: 300, bothPartners: true, historyDays: 10 }, cfg).value;
  assert.ok(low < mid && mid < high);
  assert.ok(high >= 95);
  assert.ok(low <= 25);
});

test("learning.trend compares against the subject's own baseline", () => {
  const up = learning.trend(80, [72, 74, 70]);
  assert.strictEqual(up.direction, "improving");
  assert.strictEqual(up.baseline, 72);

  const down = learning.trend(60, [72, 74, 70]);
  assert.strictEqual(down.direction, "declining");

  const flat = learning.trend(72, [72, 73, 71]);
  assert.strictEqual(flat.direction, "stable");

  const noHistory = learning.trend(80, []);
  assert.strictEqual(noHistory.direction, "stable");
});

test("context: long-distance inferred from calls + few in-person memories", () => {
  const ld = context.detect({ callCount: 3, videoCount: 2, memoryCount: 1, daysTogether: 200 });
  assert.ok(ld.tags.includes("long_distance"));
  assert.ok(ld.modifiers.video > 1); // remote channels rewarded
});

test("anti-gaming collapses identical burst messages + caps per day", () => {
  const { messages, meaningful } = antiGaming.sanitizeMessages(spamBurst(), cfg);
  // 80 identical 'hi' from one sender within seconds → collapses to 1.
  assert.strictEqual(messages.length, 1);
  // 'hi' is >= minMeaningfulMessageLen(2) so it stays meaningful, but it's one.
  assert.strictEqual(meaningful.length, 1);
});

test("anti-gaming drops ultra-short low-content messages from meaningful set", () => {
  const now = Date.now();
  const msgs = [
    { senderId: A, text: "k", createdAt: new Date(now) },
    { senderId: B, text: "love you lots", createdAt: new Date(now + 1000) },
  ];
  const { meaningful } = antiGaming.sanitizeMessages(msgs, cfg);
  assert.strictEqual(meaningful.length, 1);
  assert.strictEqual(meaningful[0].senderId, B);
});

test("anti-gaming caps rapid-fire mood logging per day", () => {
  const now = Date.now();
  const moods = Array.from({ length: 10 }, (_, i) => ({
    userId: A,
    moodType: "happy",
    createdAt: new Date(now - i * 1000),
  }));
  const capped = antiGaming.sanitizeMoods(moods, cfg);
  assert.strictEqual(capped.length, cfg.thresholds.antiGaming.maxMoodsPerDay);
});
