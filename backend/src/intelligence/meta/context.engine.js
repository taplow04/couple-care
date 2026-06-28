/**
 * Context engine — detects the couple's situation from CoupleCare data only and
 * returns scenario tags + composed component MODIFIERS. Deterministic.
 *
 * Modifiers compose multiplicatively across all matched scenarios. An engine
 * applies them to its component sub-scores before weighting (Phase B onward).
 * Detecting context never requires anything outside CoupleCare (no surveillance).
 */
const { SCENARIOS } = require("../config/scenarios");

/**
 * @param {object} features normalised feature object (lib/features)
 * @returns {{ tags:string[], labels:string[], modifiers:Object<string,number> }}
 */
const detect = (features) => {
  const tags = [];
  const labels = [];
  const modifiers = {};

  for (const scenario of SCENARIOS) {
    let matched = false;
    try {
      matched = !!scenario.detect(features);
    } catch {
      matched = false;
    }
    if (!matched) continue;
    tags.push(scenario.tag);
    labels.push(scenario.label);
    for (const [component, factor] of Object.entries(scenario.modifiers || {})) {
      modifiers[component] = (modifiers[component] ?? 1) * factor;
    }
  }

  return { tags, labels, modifiers };
};

// Apply detected modifiers to a breakdown of component sub-scores (0..100).
const applyModifiers = (breakdown, modifiers, clampFn) => {
  if (!modifiers || Object.keys(modifiers).length === 0) return breakdown;
  const out = {};
  for (const [k, v] of Object.entries(breakdown)) {
    const f = modifiers[k] ?? 1;
    out[k] = clampFn ? clampFn(v * f) : v * f;
  }
  return out;
};

module.exports = { detect, applyModifiers };
