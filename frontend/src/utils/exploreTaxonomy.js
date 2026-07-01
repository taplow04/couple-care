// Mirrors backend modules/explore/explore.constants.js (kept in sync manually —
// small, stable taxonomy; avoids a round-trip just to render chips).

export const CATEGORIES = [
  { key: "date", label: "Date", emoji: "❤️" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "photography", label: "Photography", emoji: "📸" },
  { key: "birthday", label: "Birthday", emoji: "🎂" },
  { key: "anniversary", label: "Anniversary", emoji: "🎉" },
  { key: "coffee", label: "Coffee", emoji: "☕" },
  { key: "food", label: "Food", emoji: "🍕" },
  { key: "vacation", label: "Vacation", emoji: "🏖️" },
  { key: "proposal", label: "Proposal", emoji: "💍" },
  { key: "nature", label: "Nature", emoji: "🌅" },
  { key: "music", label: "Music", emoji: "🎶" },
  { key: "movies", label: "Movies", emoji: "🎬" },
];

export const REACTIONS = [
  { key: "loved", label: "Loved", emoji: "❤️" },
  { key: "beautiful", label: "Beautiful", emoji: "🌸" },
  { key: "emotional", label: "Emotional", emoji: "🥹" },
  { key: "precious", label: "Precious", emoji: "✨" },
  { key: "celebrate", label: "Celebrate", emoji: "🎉" },
];

export const categoryMeta = (key) =>
  CATEGORIES.find((c) => c.key === key) || { key, label: key, emoji: "❤️" };

export const reactionMeta = (key) => REACTIONS.find((r) => r.key === key);

// "Together since May 2023" / "1 year together" helpers.
export const togetherLabel = (days) => {
  if (!days || days < 1) return "Just started";
  if (days < 30) return `${days} days together`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m > 1 ? "s" : ""} together`;
  }
  const y = Math.floor(days / 365);
  return `${y} year${y > 1 ? "s" : ""} together`;
};

export const postDateLabel = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const day = Math.floor(diff / 86400000);
  if (day < 1) return "Today";
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
