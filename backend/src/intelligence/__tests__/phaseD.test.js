const { test } = require("node:test");
const assert = require("node:assert");

const memory = require("../engines/memory.engine");
const { ago } = require("./fixtures");

test("memory: every period assembles deterministically + counts are exact", () => {
  const features = {
    memories: [
      { title: "Beach trip", memoryDate: ago(40) },
      { title: "Anniversary", memoryDate: ago(3) },
    ],
    moments: [{ type: "photo", createdAt: ago(1) }, { type: "video", createdAt: ago(2) }],
    dailyMoments: [{ day: "2026-06-25" }],
    achievements: [{ key: "streak_7", unlockedAt: ago(10) }],
  };
  for (const period of memory.PERIODS) {
    const a = memory.assemble(features, period);
    const b = memory.assemble(features, period);
    assert.deepStrictEqual(a, b);
    assert.strictEqual(a.period, period);
    assert.strictEqual(a.counts.memories, 2);
    assert.strictEqual(a.counts.moments, 2);
    // chapters are chronological
    const ts = a.chapters.map((c) => new Date(c.at).getTime());
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i] >= ts[i - 1]);
  }
});

test("memory: empty couple yields an empty, valid recap (no crash)", () => {
  const r = memory.assemble({ memories: [], moments: [], dailyMoments: [], achievements: [] }, "yearly");
  assert.strictEqual(r.chapters.length, 0);
  assert.strictEqual(r.counts.memories, 0);
});
