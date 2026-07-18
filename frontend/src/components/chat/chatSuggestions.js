// Curated conversation sparks — deterministic, no API. Shared by the empty-chat
// starter chips and the composer's ✨ suggestion tray.
export const CHAT_SUGGESTIONS = [
  {
    emoji: "❤️",
    label: "Compliment",
    text: "Just so you know — you make ordinary days feel special. ❤️",
  },
  {
    emoji: "✨",
    label: "Deep question",
    text: "What's one tiny moment with me you never want to forget?",
  },
  {
    emoji: "💬",
    label: "Their day",
    text: "Tell me the best part of your day — I want every detail.",
  },
  {
    emoji: "🌹",
    label: "Romantic",
    text: "Thinking about you right now. Can't wait to see you. 🌹",
  },
  {
    emoji: "🎉",
    label: "Surprise",
    text: "Keep Saturday free — I'm planning something for us 😌",
  },
  {
    emoji: "😂",
    label: "Playful",
    text: "Be honest… who fell for who first? 😏",
  },
  {
    emoji: "🎁",
    label: "Wishlist",
    text: "If I surprised you with one little gift this week, what should it be?",
  },
];

// Shorter set for the empty-thread starter chips.
export const CHAT_STARTERS = CHAT_SUGGESTIONS.slice(0, 4);
