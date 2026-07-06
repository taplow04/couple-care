/**
 * CCIE — human-readable rules: suggestion map (weak component → advice), the
 * deterministic sentiment lexicon, and emoji valence. Lexicon-based sentiment is
 * intentionally simple + deterministic (no ML, reproducible).
 */

// component key → { low: suggestion when the sub-score is weak, label }
const SUGGESTIONS = {
  moodHealth: { label: "Mood", low: "Share how you're feeling more often — small check-ins help." },
  communication: { label: "Communication", low: "Reconnect with a message today; aim for a two-way exchange." },
  memory: { label: "Memories", low: "Capture a recent moment together as a memory." },
  longevity: { label: "Longevity", low: "Every day together adds to your story — keep showing up." },
  compatibility: { label: "Mood sync", low: "Talk about how you're each feeling to get back in sync." },
  engagement: { label: "Engagement", low: "A quick shared activity today keeps your momentum going." },
  aiAnalysis: { label: "Momentum", low: "A little more activity this week will lift your trend." },
  responsiveness: { label: "Responsiveness", low: "Replying a bit sooner helps you both feel heard." },
  calls: { label: "Calls", low: "A short call this week can deepen your connection." },
  video: { label: "Video calls", low: "A video call helps you feel closer across distance." },
  voice: { label: "Voice notes", low: "Send a voice note — tone says what text can't." },
  stories: { label: "Moments", low: "Share a Moment from your day with your partner." },
  sleep: { label: "Sleep sync", low: "Compare sleep and wind down together when you can." },
  bucket: { label: "Shared goals", low: "Add or complete a bucket-list goal together." },
  aiCoach: { label: "AI coach", low: "Ask the coach about something on your mind." },
  journey: { label: "Journey", low: "Mark a milestone in your journey together." },
  achievements: { label: "Achievements", low: "You're close to new badges — keep it up." },
  conflictRecovery: { label: "Recovery", low: "After a rough patch, a kind reconnect rebuilds trust." },
  trust: { label: "Trust", low: "Consistency and follow-through strengthen trust." },
  growth: { label: "Growth", low: "Try something new together to keep growing." },
  // trust-engine components
  participation: { label: "Participation", low: "Both showing up daily lifts participation." },
  consistency: { label: "Consistency", low: "Small daily habits beat occasional bursts." },
  supportiveness: { label: "Supportiveness", low: "A supportive reaction or word goes a long way." },
  transparency: { label: "Transparency", low: "Sharing a little more openly builds closeness." },
  // Love Meter 2.0 components
  maturity: { label: "Relationship maturity", low: "Growing individually strengthens what you build together." },
  emotionalSupport: { label: "Emotional support", low: "Acknowledging each other's feelings builds a safety net." },
  sharedGoals: { label: "Shared goals", low: "Add a dream to your bucket list — shared plans build a future." },
  // maturity-engine dimensions
  emotionalRegulation: { label: "Emotional regulation", low: "Naming a feeling before reacting helps it pass through you, not into the conversation." },
  conflictResolution: { label: "Conflict resolution", low: "After a hard moment, a small reconnect within a day or two rebuilds the bridge." },
  trustBuilding: { label: "Trust building", low: "Openness in small things is what trust is made of." },
  empathy: { label: "Empathy", low: "When your partner has a hard day, even a short check-in shows you're there." },
  accountability: { label: "Accountability", low: "Owning a small mistake out loud is a quiet superpower." },
  respect: { label: "Respect", low: "Warmth in everyday words keeps respect visible." },
  patience: { label: "Patience", low: "Leaving space before responding often says more than a fast reply." },
  reliability: { label: "Reliability", low: "Doing what you said you'd do — even tiny things — compounds." },
  // behaviour-engine indicators
  healthyCommunication: { label: "Healthy communication", low: "Balanced, regular exchanges keep you both feeling heard." },
  mutualEffort: { label: "Mutual effort", low: "When both partners initiate, connection feels effortless." },
  conflictPressure: { label: "Conflict pressure", low: "Frequent tense stretches deserve a gentle conversation about what's underneath." },
  emotionalCloseness: { label: "Emotional closeness", low: "A little more sharing — a mood, a moment — narrows distance." },
  // healing-engine dimensions
  routine: { label: "Routine", low: "One small daily anchor — a walk, a note, a check-in with yourself — rebuilds rhythm." },
  journaling: { label: "Journaling", low: "Writing a few honest lines helps feelings move through you." },
  moodCare: { label: "Mood care", low: "Logging how you feel gently maps your recovery — no judgment, just awareness." },
  challenges: { label: "Daily challenges", low: "Tiny completed goals rebuild confidence faster than big plans." },
  support: { label: "Support", low: "Talking it through — with the coach or someone you trust — lightens the load." },
  selfDiscovery: { label: "Self-discovery", low: "Learning about yourself now is an investment in every future relationship." },
};

// ── Maturity lexicons (deterministic, transparent). REPAIR = accountability
// phrases (owning mistakes, committing to change); WARMTH = everyday respect
// markers. Matched lowercase on sent-message text. ──
const REPAIR_PHRASES = [
  "i'm sorry", "im sorry", "my fault", "my bad", "i was wrong", "forgive me",
  "i apologize", "i apologise", "i shouldn't have", "i shouldnt have",
  "i'll do better", "ill do better", "i promise", "let me make it up",
  "you were right", "i understand now", "i hear you",
];
const WARMTH_WORDS = [
  "please", "thank", "thanks", "appreciate", "grateful", "proud of you",
  "love you", "miss you", "you matter", "take your time", "no rush",
  "of course", "always here", "i'm here", "im here",
];

// Deterministic sentiment lexicon (lowercase stems). Small, transparent.
const POSITIVE_WORDS = [
  "love", "happy", "great", "amazing", "thanks", "thank", "sweet", "cute",
  "miss", "proud", "excited", "fun", "beautiful", "perfect", "yes", "haha",
  "lol", "good", "best", "awesome", "care", "support", "hug", "kiss", "babe",
  "honey", "darling", "appreciate", "grateful", "wonderful", "nice", "glad",
];
const NEGATIVE_WORDS = [
  "hate", "angry", "mad", "sad", "tired", "annoyed", "upset", "sorry", "no",
  "never", "cant", "won't", "wont", "stupid", "ugh", "stressed", "worried",
  "anxious", "hurt", "cry", "alone", "ignore", "fight", "argue", "done",
  "whatever", "disappointed", "frustrated", "bad", "worse", "worst",
];

// Emoji valence (+1 positive, −1 negative). Unknown emojis are neutral (0).
const EMOJI_VALENCE = {
  "❤️": 1, "💕": 1, "😍": 1, "🥰": 1, "😘": 1, "😊": 1, "😁": 1, "😂": 1,
  "🤗": 1, "👍": 1, "🎉": 1, "💖": 1, "💗": 1, "✨": 1, "🙏": 1, "😄": 1,
  "😢": -1, "😭": -1, "😠": -1, "😡": -1, "😞": -1, "😔": -1, "💔": -1,
  "😤": -1, "😰": -1, "🙄": -1, "😒": -1, "😩": -1,
};

module.exports = {
  SUGGESTIONS,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  EMOJI_VALENCE,
  REPAIR_PHRASES,
  WARMTH_WORDS,
};
