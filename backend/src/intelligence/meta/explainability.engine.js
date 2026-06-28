/**
 * Explainability engine — turns a weighted breakdown (+ the previous snapshot)
 * into human reasons: top positive contributors, top areas for improvement, why
 * the score moved, and concrete suggestions. Deterministic. Numbers never travel
 * alone.
 */
const { SUGGESTIONS } = require("../config/rules");

// Weighted contribution of each component to the final score.
const contributions = (breakdown, weights) => {
  const items = [];
  let activeWeight = 0;
  for (const [k, sub] of Object.entries(breakdown)) {
    const w = weights[k] || 0;
    if (w > 0) activeWeight += w;
  }
  for (const [k, sub] of Object.entries(breakdown)) {
    const w = weights[k] || 0;
    if (w <= 0) continue;
    items.push({ component: k, sub, weight: w, contribution: (sub * w) / (activeWeight || 1) });
  }
  return items.sort((a, b) => b.contribution - a.contribution);
};

const labelFor = (k) => SUGGESTIONS[k]?.label || k;

/**
 * @param {object} breakdown component → 0..100 sub-scores
 * @param {object} weights   component → weight
 * @param {object|null} prevBreakdown previous snapshot's breakdown (for deltas)
 * @returns {{ topPositives, areasForImprovement, reasons:{up,down}, suggestions }}
 */
const build = (breakdown, weights, prevBreakdown = null) => {
  const items = contributions(breakdown, weights);

  // Top positive behaviours: highest sub-scores among weighted components.
  const topPositives = items
    .filter((i) => i.sub >= 65)
    .slice(0, 3)
    .map((i) => ({ component: i.component, label: labelFor(i.component), score: Math.round(i.sub) }));

  // Areas for improvement: lowest sub-scores → mapped suggestions.
  const weak = [...items].sort((a, b) => a.sub - b.sub);
  const areasForImprovement = weak
    .filter((i) => i.sub < 60)
    .slice(0, 3)
    .map((i) => ({
      component: i.component,
      label: labelFor(i.component),
      score: Math.round(i.sub),
      suggestion: SUGGESTIONS[i.component]?.low || "Keep nurturing this area.",
    }));

  // Why it changed: deltas vs the previous snapshot.
  const reasons = { up: [], down: [] };
  if (prevBreakdown) {
    const deltas = items
      .map((i) => ({
        component: i.component,
        label: labelFor(i.component),
        delta: Math.round((i.sub - (prevBreakdown[i.component] ?? i.sub)) * (i.weight)),
        raw: Math.round(i.sub - (prevBreakdown[i.component] ?? i.sub)),
      }))
      .filter((d) => d.raw !== 0);
    reasons.up = deltas.filter((d) => d.raw > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    reasons.down = deltas.filter((d) => d.raw < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  }

  const suggestions = areasForImprovement.map((a) => a.suggestion);

  return { topPositives, areasForImprovement, reasons, suggestions };
};

module.exports = { build, contributions };
