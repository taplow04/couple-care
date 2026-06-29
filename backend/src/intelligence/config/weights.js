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
};
