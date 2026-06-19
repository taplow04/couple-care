// Shared bucket-list category metadata (keys match the backend enum).
export const BUCKET_CATEGORIES = [
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "food", label: "Food", emoji: "🍽️" },
  { key: "movies", label: "Movies", emoji: "🎬" },
  { key: "dreams", label: "Dreams", emoji: "💭" },
  { key: "fitness", label: "Fitness", emoji: "💪" },
  { key: "learning", label: "Learning", emoji: "📚" },
  { key: "adventure", label: "Adventure", emoji: "🏔️" },
  { key: "home", label: "Home", emoji: "🏡" },
  { key: "other", label: "Other", emoji: "⭐" },
];

export const CATEGORY_META = BUCKET_CATEGORIES.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});
