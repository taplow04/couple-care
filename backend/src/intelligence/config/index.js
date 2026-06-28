/**
 * CCIE config facade. Merges the config files and deep-freezes them so engines
 * can read but never mutate the live config. `getConfig(overrides)` returns a
 * shallow-merged view (used by tests to try alternate weightings deterministically).
 */
const weights = require("./weights");
const thresholds = require("./thresholds");
const rules = require("./rules");
const { SCENARIOS } = require("./scenarios");

const deepFreeze = (obj) => {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.values(obj).forEach(deepFreeze);
  }
  return obj;
};

const BASE = deepFreeze({ weights, thresholds, rules, scenarios: SCENARIOS });

const getConfig = (overrides) => {
  if (!overrides) return BASE;
  // Shallow per-engine weight override for tests; never mutates BASE.
  return {
    ...BASE,
    weights: { ...BASE.weights, ...(overrides.weights || {}) },
  };
};

module.exports = { getConfig, BASE };
