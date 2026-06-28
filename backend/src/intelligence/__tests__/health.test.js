const { test } = require("node:test");
const assert = require("node:assert");

const { getConfig } = require("../config");
const health = require("../engines/relationshipHealth.engine");
const { inactiveCouple, healthyCouple, newCouple, A, B } = require("./fixtures");

const cfg = getConfig();

test("empty/inactive couple → deterministic golden 52 (ported formula)", () => {
  const r = health.score(inactiveCouple(), cfg);
  // No data ⇒ neutral 50 for mood/comm/memory/compat, engagement 30 (idle),
  // aiAnalysis 60 (no trend signal). Fixture has daysTogether 400 ⇒ longevity 78.
  // 50*.25 + 50*.2 + 50*.15 + 78*.1 + 50*.1 + 30*.1 + 60*.1 = 51.8 → 52.
  assert.strictEqual(r.breakdown.longevity, 78);
  assert.strictEqual(r.breakdown.engagement, 30);
  assert.strictEqual(r.breakdown.aiAnalysis, 60);
  assert.strictEqual(r.score, 52);
  assert.strictEqual(r.level, "Moderate");
});

test("determinism — same input yields byte-identical output", () => {
  const f = healthyCouple();
  const a = health.score(f, cfg);
  const b = health.score(healthyCouple(), cfg);
  assert.deepStrictEqual(a, b);
});

test("partner-order invariance — swapping A/B gives the identical score", () => {
  const f = healthyCouple();
  const swapped = {
    ...f,
    moodsA: f.moodsB,
    moodsB: f.moodsA,
    partnerIds: [B, A],
  };
  const r1 = health.score(f, cfg);
  const r2 = health.score(swapped, cfg);
  assert.strictEqual(r1.score, r2.score);
  assert.deepStrictEqual(r1.breakdown, r2.breakdown);
});

test("healthy reciprocal couple scores well above an inactive one", () => {
  const healthy = health.score(healthyCouple(), cfg);
  const inactive = health.score(inactiveCouple(), cfg);
  assert.ok(healthy.score > inactive.score, `${healthy.score} > ${inactive.score}`);
  assert.ok(healthy.score >= 70);
});

test("confidence rises with data volume + both partners present", () => {
  const healthy = health.score(healthyCouple(), cfg);
  const inactive = health.score(inactiveCouple(), cfg);
  assert.ok(healthy.confidence > inactive.confidence);
  assert.ok(inactive.confidence <= 40);
});

test("context detects a new relationship", () => {
  const r = health.score(newCouple(), cfg);
  assert.ok(r.context.tags.includes("new_relationship"));
});

test("explainability returns reasons + suggestions, never bare numbers", () => {
  const r = health.score(inactiveCouple(), cfg);
  assert.ok(Array.isArray(r.factors.areasForImprovement));
  assert.ok(r.factors.areasForImprovement.length > 0);
  assert.ok(r.suggestions.length > 0);
});

test("two-way conversation beats one-sided volume (anti-gaming by design)", () => {
  const base = inactiveCouple();
  const now = base.now;
  const oneSided = [];
  const twoWay = [];
  for (let d = 0; d < 10; d++) {
    oneSided.push({ senderId: A, createdAt: new Date(now - d * 86400000) });
    oneSided.push({ senderId: A, createdAt: new Date(now - d * 86400000) });
    twoWay.push({ senderId: A, createdAt: new Date(now - d * 86400000) });
    twoWay.push({ senderId: B, createdAt: new Date(now - d * 86400000) });
  }
  const a = health.score({ ...base, messages: oneSided }, cfg);
  const b = health.score({ ...base, messages: twoWay }, cfg);
  assert.ok(b.breakdown.communication > a.breakdown.communication);
});
