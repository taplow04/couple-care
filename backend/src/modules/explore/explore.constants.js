// 🌍 Explore — shared taxonomy (categories, reactions, curated inspiration).

// Post categories. `key` is stored on the post; label/emoji drive the UI.
const CATEGORIES = [
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

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

// CoupleCare reactions (NOT Instagram likes) — warm + relationship-focused.
const REACTIONS = [
  { key: "loved", label: "Loved", emoji: "❤️" },
  { key: "beautiful", label: "Beautiful", emoji: "🌸" },
  { key: "emotional", label: "Emotional", emoji: "🥹" },
  { key: "precious", label: "Precious", emoji: "✨" },
  { key: "celebrate", label: "Celebrate", emoji: "🎉" },
];

const REACTION_KEYS = REACTIONS.map((r) => r.key);

const POST_VISIBILITY = ["public", "partner_only", "private"];

// A post is either co-owned by a couple ("relationship") or authored solo by a
// single/unmatched/connected user ("personal"). Personal posts have no coupleId
// and are gated by the author's own User.exploreVisibility. Relationship posts
// stay exclusive to active couples (enforced in the service).
const POST_SCOPES = ["relationship", "personal"];

// Discovery visibility levels shared by the couple's exploreVisibility and the
// new per-user exploreVisibility. `friends` is future-ready (non-public today).
const EXPLORE_VISIBILITY = ["public", "friends", "partner_only", "private"];

// Manually-curated inspiration rails — mapped to CATEGORIES, never ranked by
// popularity/engagement (by design). This is the whole point of Explore.
const INSPIRATION_RAILS = [
  { key: "date_ideas", title: "Beautiful Date Ideas", emoji: "❤️", categories: ["date", "coffee"] },
  { key: "travel", title: "Travel Together", emoji: "✈️", categories: ["travel", "vacation"] },
  { key: "anniversary", title: "Anniversary Celebrations", emoji: "🎉", categories: ["anniversary"] },
  { key: "proposal", title: "Proposal Ideas", emoji: "💍", categories: ["proposal"] },
  { key: "photography", title: "Couple Photography", emoji: "📸", categories: ["photography"] },
  { key: "nature", title: "Nature & Adventure", emoji: "🌅", categories: ["nature", "music"] },
];

module.exports = {
  CATEGORIES,
  CATEGORY_KEYS,
  REACTIONS,
  REACTION_KEYS,
  POST_VISIBILITY,
  POST_SCOPES,
  EXPLORE_VISIBILITY,
  INSPIRATION_RAILS,
};
