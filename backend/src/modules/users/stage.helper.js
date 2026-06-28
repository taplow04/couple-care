/**
 * Relationship Lifecycle — Stage Engine (single source of truth).
 *
 * The whole app (dashboard, AI Center, navigation, available features) adapts to
 * ONE derived value, computed server-side so it stays identical to what gates
 * the APIs and so the client never has to run cross-document queries.
 *
 *   growing   → currently in an active couple (partner connected, or a pending
 *               couple still waiting for the second partner to join)
 *   healing   → no current couple, but the user has at least one ended
 *               (broken_up) couple → "Growing After Goodbye"
 *   preparing → no current couple and never been in one → "Preparing For Love"
 *
 * Past relationships are found by querying the existing `Couple` collection
 * (relationshipStatus === "broken_up"); we deliberately do NOT add an archive
 * collection — couples are archived in place (the brief: reuse, never duplicate).
 */
const Couple = require("../couples/couple.model");

const STAGES = {
  PREPARING: "preparing",
  GROWING: "growing",
  HEALING: "healing",
};

/**
 * @param {object} user a loaded User doc (or plain object) — needs _id + currentCoupleId
 * @returns {Promise<{stage, hasPartner, coupleConnected, lastCoupleId}>}
 *   hasPartner / coupleConnected are true only when BOTH partners are linked.
 */
const resolveStage = async (user) => {
  const userId = user._id || user.id;

  // Active couple → GROWING (connected) or GROWING/pending (partner not joined).
  if (user.currentCoupleId) {
    const couple = await Couple.findById(user.currentCoupleId).select(
      "partnerOneId partnerTwoId relationshipStatus",
    );
    const coupleConnected = !!(couple && couple.partnerOneId && couple.partnerTwoId);
    return {
      stage: STAGES.GROWING,
      hasPartner: coupleConnected,
      coupleConnected,
      lastCoupleId: user.currentCoupleId,
    };
  }

  // No current couple → PREPARING (never matched) vs HEALING (a relationship
  // ended). Most-recent ended couple wins, so a re-heal after a second breakup
  // still resolves to HEALING.
  const endedCouple = await Couple.findOne({
    relationshipStatus: "broken_up",
    $or: [{ partnerOneId: userId }, { partnerTwoId: userId }],
  })
    .sort({ updatedAt: -1 })
    .select("_id");

  if (endedCouple) {
    return {
      stage: STAGES.HEALING,
      hasPartner: false,
      coupleConnected: false,
      lastCoupleId: endedCouple._id,
    };
  }

  return {
    stage: STAGES.PREPARING,
    hasPartner: false,
    coupleConnected: false,
    lastCoupleId: null,
  };
};

module.exports = { STAGES, resolveStage };
