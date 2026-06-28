/**
 * CCIE — thresholds, level cutoffs, normalisation denominators, anti-gaming
 * caps, and confidence breakpoints. All tunable in ONE place.
 */
module.exports = {
  // Score → level label (shared by every 0–100 engine).
  levels: [
    { min: 90, label: "Excellent" },
    { min: 75, label: "Healthy" },
    { min: 50, label: "Moderate" },
    { min: 0, label: "Needs Attention" },
  ],

  // Neutral baseline used when a component has no data (so absence ≠ failure).
  neutralBaseline: 50,

  // Analysis windows (days).
  windows: {
    primary: 30,
    recent: 14,
    short: 7,
  },

  // Normalisation denominators (raw count that maps to 100). Mirrors the
  // original health.service Math.min(x / D, 1) saturation points.
  saturation: {
    messages: 200,
    moods: 28,
    memories: 12,
    engagementActivity: 40,
    calls: 12,
    videoCalls: 8,
    voiceNotes: 20,
    stories: 20,
    bucketCompleted: 10,
    aiSessions: 8,
    journalEntries: 20,
    achievements: 16,
    challenges: 10,
    dailyMoments: 30,
    loveLetters: 5,
  },

  // Anti-gaming limits (per day, per couple/user) and meaningful-engagement gates.
  antiGaming: {
    maxMessagesPerDay: 60, // messages beyond this in a day don't add volume
    maxMoodsPerDay: 4,
    maxStoriesPerDay: 6,
    maxAiSessionsPerDay: 5,
    minMeaningfulMessageLen: 2, // chars; shorter = "low content"
    duplicateBurstWindowMs: 60000, // identical msgs within 1 min collapse to one
  },

  // Confidence breakpoints — how much data before we trust the score.
  confidence: {
    // data points (moods+messages+memories in window) → confidence anchors
    anchors: [
      [0, 20],
      [10, 50],
      [40, 75],
      [120, 92],
      [300, 98],
    ],
    bothPartnersBonus: 6, // both partners present in the data
    historyBonus: 4, // ≥7 prior daily snapshots
  },

  // Relationship-longevity piecewise anchors [days, score] (original curve).
  longevityAnchors: [
    [0, 40],
    [30, 55],
    [180, 70],
    [365, 80],
    [730, 90],
    [1825, 100],
  ],
  milestones: [30, 180, 365, 730, 1825],
};
