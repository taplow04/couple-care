/**
 * Confidence engine — how much we trust a score, from DATA SUFFICIENCY only
 * (volume + both-partners coverage + history length). Deterministic. Confidence
 * is additive metadata: it NEVER changes the score itself.
 */
const { piecewise, clamp } = require("../lib/normalize");

/**
 * @param {object} args
 *   dataPoints  total signal count (e.g. moods+messages+memories in window)
 *   bothPartners true if both partners appear in the data
 *   historyDays  number of prior daily snapshots available
 * @param {object} cfg getConfig() output
 * @returns {{ value:number, level:string, basis:string[] }}
 */
const compute = ({ dataPoints = 0, bothPartners = false, historyDays = 0 }, cfg) => {
  const c = cfg.thresholds.confidence;
  let value = piecewise(dataPoints, c.anchors);
  const basis = [];

  if (dataPoints > 0) basis.push(`${dataPoints} recent data points`);
  if (bothPartners) {
    value += c.bothPartnersBonus;
    basis.push("both partners active");
  } else {
    basis.push("limited to one partner's data");
  }
  if (historyDays >= 7) {
    value += c.historyBonus;
    basis.push("strong history");
  }

  value = Math.round(clamp(value));
  const level = value >= 85 ? "High" : value >= 60 ? "Moderate" : value >= 35 ? "Low" : "Very low";
  return { value, level, basis };
};

module.exports = { compute };
