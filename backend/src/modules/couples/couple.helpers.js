/**
 * The effective relationship start date.
 *
 * Prefers the real dating date captured during onboarding
 * (`relationshipStartDate`) and falls back to when the couple record was
 * created (`relationshipStartedAt`) for couples that predate the field or
 * never set it. This is the single source of truth for "days together",
 * milestones, journey, and health-score math.
 */
const getRelationshipStart = (couple) => {
  if (!couple) return null;
  return couple.relationshipStartDate || couple.relationshipStartedAt || null;
};

const getDaysTogether = (couple) => {
  const start = getRelationshipStart(couple);
  if (!start) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)),
  );
};

module.exports = {
  getRelationshipStart,
  getDaysTogether,
};
