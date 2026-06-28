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
};

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

module.exports = { SUGGESTIONS, POSITIVE_WORDS, NEGATIVE_WORDS, EMOJI_VALENCE };
