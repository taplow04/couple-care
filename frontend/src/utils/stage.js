/**
 * Relationship lifecycle stages (client mirror of backend stage.helper.js).
 * The whole UI adapts to `user.stage`, which the server computes and ships on
 * the `/auth/me` payload — so there is no extra fetch and no client-side query.
 */
export const STAGE = {
  PREPARING: "preparing", // 🌱 Preparing For Love — no partner yet
  GROWING: "growing", // ❤️ Growing Together — partner connected
  HEALING: "healing", // 🌤 Growing After Goodbye — relationship ended
};

// Default to PREPARING for a freshly-registered user whose payload hasn't
// resolved a stage yet (safe: the solo dashboard never assumes a couple).
export const getStage = (user) => user?.stage || STAGE.PREPARING;

export const isPreparing = (user) => getStage(user) === STAGE.PREPARING;
export const isGrowing = (user) => getStage(user) === STAGE.GROWING;
export const isHealing = (user) => getStage(user) === STAGE.HEALING;

// Themed metadata for headers/labels per stage.
export const STAGE_META = {
  [STAGE.PREPARING]: { emoji: "🌱", title: "Preparing For Love" },
  [STAGE.GROWING]: { emoji: "❤️", title: "Growing Together" },
  [STAGE.HEALING]: { emoji: "🌤", title: "Healing Journey" },
};
