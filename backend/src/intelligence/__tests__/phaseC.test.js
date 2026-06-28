const { test } = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const emotion = require("../engines/emotion.engine");
const trust = require("../engines/trust.engine");

const cfg = getConfig();

test("emotion blends multiple signals + degrades gracefully", () => {
  const full = emotion.score(
    {
      moods: [{ moodType: "happy", intensity: 8 }, { moodType: "loved", intensity: 7 }],
      sentMessages: [{ text: "i love you, today was amazing and fun" }],
      journal: [{ content: "grateful and happy and proud today" }],
      tempoScore: 80,
      sleepWellbeing: 75,
    },
    cfg,
  );
  assert.ok(full.signals.includes("moodHistory"));
  assert.ok(full.signals.includes("messageTempo"));
  assert.ok(full.signals.includes("journal"));
  assert.ok(full.signals.includes("sleep"));
  assert.ok(full.score >= 65);

  // Only one signal present → still works (graceful degrade), lower confidence.
  const sparse = emotion.score({ moods: [{ moodType: "happy", intensity: 6 }] }, cfg);
  assert.deepStrictEqual(sparse.signals, ["moodHistory"]);
  assert.ok(sparse.confidence < full.confidence);
});

test("emotion never claims certainty (statement carries confidence)", () => {
  const r = emotion.score({ moods: [], sentMessages: [] }, cfg);
  assert.match(r.statement, /Estimated/);
  assert.match(r.statement, /confidence/);
});

test("trust delegation parity — ported formulas reproduce Trust Center numbers", () => {
  // Same inputs the original getTrustCenter used → same sub-scores.
  const r = trust.score(
    { myMsgs: 150, partnerMsgs: 90, streak: 8, longest: 18, bothActiveToday: true, transparencyPct: 70 },
    cfg,
  );
  const totalMsgs = 240;
  const volumeScore = Math.min((totalMsgs / 200) * 60, 100);
  const balance = 1 - Math.abs(150 - 90) / totalMsgs;
  assert.strictEqual(r.breakdown.communication, Math.round(Math.min(volumeScore + balance * 40, 100)));
  assert.strictEqual(r.breakdown.participation, Math.min(8, 14) * 4 + 20 + 24);
  assert.strictEqual(r.breakdown.consistency, Math.min(18, 30) * 3 + 10);
});
