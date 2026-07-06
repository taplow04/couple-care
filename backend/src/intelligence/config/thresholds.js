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

  // ── Maturity engine anchors ──
  maturity: {
    // Negative-mood intensity a regulated response stays under (1-10 scale).
    regulatedIntensityCeiling: 7,
    // Reply-gap (minutes) considered "patient, considered" vs rapid-fire.
    patienceIdealGapMin: 10,
    // Message burst size beyond which messaging reads as impulsive.
    impulsiveBurstSize: 6,
    // Empathy: hours within which a reply to a partner's negative mood counts
    // as showing up for them.
    empathyResponseHours: 24,
    saturation: {
      activeDays: 20, // distinct active days in 30d → 100
      journalEntries: 10,
      supportiveReplies: 6,
      repairMoves: 4, // accountability phrases after conflict
    },
  },

  // ── Behaviour Intelligence pattern-model anchors ──
  behavior: {
    // Novelty half-life: attraction's "new relationship" signal decays as days
    // together grow (piecewise below = score at day X).
    noveltyAnchors: [
      [0, 100],
      [60, 80],
      [180, 45],
      [365, 20],
      [730, 8],
    ],
    // Messages/day that reads as high-intensity courtship messaging.
    intensityMessagesPerDay: 25,
    // Distinct-active-day share (of the window) that reads as full routine.
    routineFullShare: 0.8,
    // Minimum overall data points before the pattern model reports a dominant
    // pattern at all (below this it reports "not enough signal yet").
    patternMinDataPoints: 20,
  },

  // ── Healing engine anchors ──
  healing: {
    saturation: {
      journalEntries: 12, // entries in 30d → 100
      challengesCompleted: 10,
      coachMessages: 8,
      sleepLogs: 10,
      moodLogs: 12,
      activeDays: 18,
      quizzes: 3,
    },
    // Behavioural-insight detection (gentle, non-clinical).
    inactivityDays: 5, // no activity this long → gentle nudge
    withdrawalRatio: 0.45, // recent activity < 45% of own baseline
    moodDeclineDelta: -12, // mood-positivity drop (pts) vs prior window
    ruminationNegativeShare: 0.7, // journal negativity share considered heavy
    // How many concurrent distress signals before we surface the
    // reach-out-to-people-you-trust encouragement.
    distressSignalCount: 3,
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
