/**
 * CCIE — component weights (THE single place weights live). No engine hardcodes a
 * weight; every engine reads these via config/index.getConfig().
 *
 * relationshipHealth defaults reproduce the ORIGINAL couples/health.service
 * formula exactly (the 7 classic components sum to 1.0; every new CCIE input
 * starts at 0 so Phase A is byte-for-byte regression-free). Phase B rebalances
 * to fold in the new inputs — editing these numbers is all that takes.
 *
 * Weights within an engine do NOT need to sum to 1: the engine normalises by the
 * sum of the weights of the components that actually have data, so a couple with
 * no calls/sleep/etc. is scored only on what it does have (graceful degrade).
 */
module.exports = {
  relationshipHealth: {
    // ── classic 7 (original health.service weights) ──
    moodHealth: 0.25,
    communication: 0.2,
    memory: 0.15,
    longevity: 0.1,
    compatibility: 0.1,
    engagement: 0.1,
    aiAnalysis: 0.1, // deterministic last-7-vs-prior-7 trend (NOT an LLM call)
    // ── new CCIE inputs (ADDITIVE — classic weights above are untouched). A
    // component only counts when the couple actually has that data, so a
    // data-less couple is scored exactly as before; richer couples blend these
    // in. Tune freely; the engine normalises by the active weight sum. ──
    responsiveness: 0.05,
    calls: 0.04,
    video: 0.03,
    voice: 0.02,
    stories: 0.04,
    sleep: 0.03,
    bucket: 0.03,
    aiCoach: 0.02,
    journey: 0, // folded into longevity for now
    achievements: 0.03,
    conflictRecovery: 0.03,
    trust: 0.06,
    growth: 0.06,
    // ── Love Meter 2.0 inputs (ADDITIVE, same graceful-degrade rule). maturity
    // is the couple-symmetric average of both partners' latest Relationship
    // Maturity snapshots; emotionalSupport is the supportive-interaction share;
    // sharedGoals reflects joint bucket-list intent (not just completions). ──
    maturity: 0.05,
    emotionalSupport: 0.04,
    sharedGoals: 0.03,
  },

  trust: {
    communication: 0.25,
    participation: 0.25,
    consistency: 0.2,
    supportiveness: 0.15,
    transparency: 0.15,
  },

  emotion: {
    chatSentiment: 0.3,
    moodHistory: 0.3,
    messageTempo: 0.15, // length + response delay
    journal: 0.1,
    storyReactions: 0.08,
    sleep: 0.07,
    // ── new emotion signals (ADDITIVE — a component only counts when the user
    // actually has that data, so a sparse user is scored exactly as before). ──
    emojiPositivity: 0.08, // valence of emojis in sent messages
    replySpeed: 0.06, // responsiveness (faster replies ⇒ more engaged)
    storyCaptions: 0.05, // sentiment of the user's Moment captions
    callConnection: 0.05, // call frequency + duration with the partner
    voiceWarmth: 0.03, // voice-note activity (intimate communication)
    sharedActivity: 0.05, // recent memories / bucket / daily-moment participation
  },

  growth: {
    achievements: 0.2,
    bucket: 0.15,
    journey: 0.15,
    memories: 0.1,
    stories: 0.1,
    challenges: 0.1,
    dailyMoments: 0.08,
    loveLetters: 0.06,
    aiSessions: 0.06,
  },

  // ── Relationship Maturity engine (PER-USER — behavioural, not a personality
  // test). Ten dimensions, each 0..100, normalised by the active-weight sum so
  // a user without (say) sleep or partner data is scored only on what they
  // actually do. Equal defaults; tune freely. ──
  maturity: {
    emotionalRegulation: 0.1,
    communication: 0.1,
    conflictResolution: 0.1,
    trustBuilding: 0.1,
    consistency: 0.1,
    empathy: 0.1,
    accountability: 0.1,
    respect: 0.1,
    patience: 0.1,
    reliability: 0.1,
  },

  // ── Behaviour Intelligence engine (COUPLE — identical for both partners).
  // Indicator weights feed the overall behavioural-wellness score used for the
  // trend snapshot; each indicator is also reported individually with its own
  // confidence-hedged insight. emotionalDistance is scored INVERTED (higher =
  // less distance) so all weights point the same direction. ──
  behavior: {
    healthyCommunication: 0.2,
    emotionalSupport: 0.16,
    mutualEffort: 0.16,
    consistency: 0.14,
    engagement: 0.14,
    conflictPressure: 0.1, // inverted conflict frequency (higher = calmer)
    emotionalCloseness: 0.1, // inverted emotional distance
  },

  // ── Attraction / Attachment / Growing-Love pattern model (COUPLE). Each
  // pattern is a weighted blend of deterministic signals; the three are then
  // normalised to a 100-point distribution. NEVER presented as fact — the
  // engine wraps the result in confidence-hedged language. ──
  behaviorPatterns: {
    attraction: {
      messageIntensity: 0.3, // bursty, high-volume messaging
      novelty: 0.3, // early-days effect (fades with time together)
      excitementMoods: 0.25, // excited/happy mood share
      mediaPlayfulness: 0.15, // stories/voice/video experimentation
    },
    attachment: {
      routine: 0.3, // steady daily active-day coverage
      streakHabit: 0.25, // sustained streaks (daily habit)
      responsiveness: 0.25, // reliance on quick mutual replies
      dailyRituals: 0.2, // daily couple moments / recurring habits
    },
    growingLove: {
      trust: 0.25,
      conflictRecovery: 0.2,
      longevity: 0.15,
      mutualEffort: 0.15,
      sharedGrowth: 0.15, // bucket goals, achievements, milestones
      supportiveness: 0.1,
    },
  },

  // ── Healing & Recovery engine (PER-USER, Stage 3). The Healing Progress score
  // reflects ENGAGEMENT with recovery activities — never emotional worth. Each
  // dimension degrades to null when the user has no data for it. ──
  healing: {
    routine: 0.18, // showing up (active days + growth streak)
    journaling: 0.16, // journal/reflection/gratitude consistency
    moodCare: 0.14, // logging moods + gentle recovery trend
    challenges: 0.14, // daily healing challenges completed
    sleep: 0.12, // sleep logging + adequacy
    support: 0.13, // coach conversations / reaching out
    selfDiscovery: 0.13, // quizzes, growth report, learning activities
  },
};
