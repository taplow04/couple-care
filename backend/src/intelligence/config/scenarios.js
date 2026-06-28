/**
 * CCIE — Context scenarios. Each scenario has a deterministic detect(features)
 * predicate and `modifiers`: multiplicative adjustments applied to component
 * sub-scores (or their weights) BEFORE weighting. This is how context "modifies
 * all algorithms" without touching engine code.
 *
 * `features` is the normalised feature object built by lib/features.js. Modifiers
 * default to 1 (no change) for any component not listed.
 *
 * Scenarios are NON-exclusive (a couple can be both long_distance + busy_week);
 * modifiers compose multiplicatively. Detection uses only CoupleCare data.
 */
const SCENARIOS = [
  {
    tag: "new_relationship",
    label: "New couple",
    detect: (f) => f.daysTogether != null && f.daysTogether < 30,
    // Don't punish a short history or thin memory bank early on.
    modifiers: { longevity: 1.15, memory: 1.1, aiAnalysis: 1.1 },
  },
  {
    tag: "established",
    label: "Established couple",
    detect: (f) => f.daysTogether != null && f.daysTogether >= 365,
    modifiers: { longevity: 1.0 },
  },
  {
    tag: "long_distance",
    label: "Long distance",
    // Inferred (no surveillance): lots of calls/video but few in-person memories.
    detect: (f) =>
      (f.callCount || 0) + (f.videoCount || 0) >= 4 && (f.memoryCount || 0) <= 2,
    // Reward remote-connection channels; soften the in-person memory expectation.
    modifiers: { calls: 1.2, video: 1.25, voice: 1.15, memory: 0.8 },
  },
  {
    tag: "busy_week",
    label: "Busy week",
    // Activity dropped well below the couple's OWN recent baseline.
    detect: (f) => f.activityVsBaseline != null && f.activityVsBaseline < 0.5,
    // Don't penalise a quiet week as harshly; lean on consistency over volume.
    modifiers: { communication: 1.15, engagement: 1.15 },
  },
  {
    tag: "vacation",
    label: "Vacation / celebration",
    // A burst of memories/stories well above baseline.
    detect: (f) =>
      (f.memoryCount7 || 0) >= 3 || (f.activityVsBaseline != null && f.activityVsBaseline > 2),
    modifiers: { memory: 1.1, engagement: 1.05 },
  },
  {
    tag: "conflict_period",
    label: "Working through something",
    // Negative-leaning moods + reduced communication recently.
    detect: (f) =>
      f.positivity != null && f.positivity < 0.35 && (f.activityVsBaseline ?? 1) < 0.8,
    // Recovery matters more than raw output during a rough patch.
    modifiers: { conflictRecovery: 1.25, compatibility: 1.1, communication: 1.05 },
  },
];

module.exports = { SCENARIOS };
