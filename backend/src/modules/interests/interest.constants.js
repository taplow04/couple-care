/**
 * AI Interest Engine — canonical interest taxonomy + the mappings that turn
 * IN-APP actions into interest signals.
 *
 * PRIVACY-FIRST: every signal comes ONLY from things a user does inside
 * CoupleCare (searches, explore categories, bucket goals, memory types, saved
 * ideas). No other apps, no device data, ever.
 */

// Canonical interest categories (key → display).
const INTERESTS = [
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "adventure", label: "Adventure", emoji: "🧗" },
  { key: "movies", label: "Movies", emoji: "🎬" },
  { key: "music", label: "Music", emoji: "🎶" },
  { key: "food", label: "Food", emoji: "🍕" },
  { key: "coffee", label: "Coffee", emoji: "☕" },
  { key: "nature", label: "Nature", emoji: "🌿" },
  { key: "photography", label: "Photography", emoji: "📸" },
  { key: "games", label: "Games", emoji: "🎮" },
  { key: "fitness", label: "Fitness", emoji: "💪" },
  { key: "dates", label: "Date Ideas", emoji: "❤️" },
  { key: "gifts", label: "Gifts", emoji: "🎁" },
  { key: "celebration", label: "Celebrations", emoji: "🎉" },
  { key: "home", label: "Home & Cozy", emoji: "🏡" },
  { key: "learning", label: "Learning", emoji: "📚" },
  { key: "wellness", label: "Wellness", emoji: "🧘" },
];

const INTEREST_KEYS = INTERESTS.map((i) => i.key);

// Explore post categories → interest categories.
const FROM_EXPLORE_CATEGORY = {
  date: "dates",
  travel: "travel",
  photography: "photography",
  birthday: "celebration",
  anniversary: "celebration",
  coffee: "coffee",
  food: "food",
  vacation: "travel",
  proposal: "celebration",
  nature: "nature",
  music: "music",
  movies: "movies",
};

// Bucket-list categories → interest categories.
const FROM_BUCKET_CATEGORY = {
  travel: "travel",
  food: "food",
  movies: "movies",
  dreams: "adventure",
  fitness: "fitness",
  learning: "learning",
  adventure: "adventure",
  home: "home",
};

// Memory types → interest categories.
const FROM_MEMORY_TYPE = {
  date: "dates",
  trip: "travel",
  birthday: "celebration",
  anniversary: "celebration",
  proposal: "celebration",
  gift: "gifts",
  milestone: "celebration",
};

// In-app search / free-text → interest categories (deterministic keyword map).
const KEYWORDS = {
  travel: ["travel", "trip", "vacation", "beach", "mountain", "flight", "hotel", "holiday", "roadtrip", "getaway"],
  adventure: ["adventure", "hike", "hiking", "trek", "camping", "skydiv", "climb", "explore"],
  movies: ["movie", "film", "cinema", "netflix", "series", "show"],
  music: ["music", "song", "concert", "playlist", "band", "gig"],
  food: ["food", "dinner", "restaurant", "cook", "recipe", "pizza", "sushi", "brunch", "dessert", "baking"],
  coffee: ["coffee", "cafe", "latte", "espresso", "tea"],
  nature: ["nature", "park", "sunset", "sunrise", "garden", "lake", "forest", "picnic"],
  photography: ["photo", "photography", "camera", "picture", "portrait"],
  games: ["game", "gaming", "board game", "puzzle", "quiz night"],
  fitness: ["gym", "workout", "fitness", "run", "running", "yoga", "cycling", "exercise"],
  dates: ["date", "date night", "date idea", "romantic", "candlelight", "stargazing"],
  gifts: ["gift", "present", "surprise", "flowers", "jewel"],
  celebration: ["birthday", "anniversary", "celebrat", "party", "proposal", "wedding"],
  home: ["home", "cozy", "decor", "movie night", "stay in"],
  learning: ["learn", "class", "course", "language", "book", "reading", "museum"],
  wellness: ["wellness", "spa", "massage", "meditat", "self care", "mindful"],
};

// Signal weights per source — deliberate actions weigh more than glances.
const SIGNAL_WEIGHTS = {
  page_visit: 0.5,
  explore_filter: 0.75,
  search: 1,
  reaction: 1.5,
  comment: 1.5,
  post: 2,
  memory: 2,
  bucket_add: 2.5,
  bucket_complete: 3,
};

// Exponential decay half-life (days) — old signals fade so the profile stays
// CURRENT interests, not an archive.
const DECAY_HALF_LIFE_DAYS = 45;

module.exports = {
  INTERESTS,
  INTEREST_KEYS,
  FROM_EXPLORE_CATEGORY,
  FROM_BUCKET_CATEGORY,
  FROM_MEMORY_TYPE,
  KEYWORDS,
  SIGNAL_WEIGHTS,
  DECAY_HALF_LIFE_DAYS,
};
