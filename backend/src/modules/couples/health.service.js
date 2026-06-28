/**
 * Relationship Health — a COUPLE metric (identical for both partners).
 *
 * As of the CCIE refactor, ALL scoring lives in the intelligence layer
 * (`src/intelligence`). This module is now a thin adapter that: delegates the
 * computation to `intelligence.getHealth`, owns the Couple-doc CACHE (the single
 * source of truth for reads, so both partners always see the same number), and
 * handles real-time broadcast. The public surface is unchanged — callers
 * (dashboard, ai.context, ai.service, profile, mood/memory writes) are untouched.
 *
 * Output stays `{ score, level, breakdown }` PLUS additive CCIE fields
 * (`confidence, context, factors, reasons, trend`) that current UI ignores.
 */
const Couple = require("./couple.model");
const User = require("../users/user.model");
const { emitToUser } = require("../../utils/realtime");
const intelligence = require("../../intelligence");

/**
 * Compute (via CCIE) and cache the couple's Relationship Health. Deterministic
 * and identical for both partners.
 */
const computeCoupleHealth = async (coupleId) => {
  const result = await intelligence.getHealth(coupleId);

  // Persist the cache on the couple (best-effort — never block the response).
  try {
    await Couple.updateOne(
      { _id: coupleId },
      {
        $set: {
          healthScore: result.score,
          healthLevel: result.level,
          healthBreakdown: result.breakdown,
          healthConfidence: result.confidence ?? null,
          healthContext: result.context ?? null,
          healthFactors: result.factors ?? null,
          healthUpdatedAt: new Date(),
        },
      },
    );
  } catch (e) {
    console.error("[health] cache write failed:", e.message);
  }

  return result;
};

/**
 * Read the couple's CACHED health (the single source of truth for reads — keeps
 * the score identical for both partners and across surfaces). Computes only when
 * it has never been computed.
 */
const getCachedHealth = async (coupleId) => {
  const couple = await Couple.findById(coupleId).select(
    "healthScore healthLevel healthBreakdown healthConfidence healthContext healthFactors",
  );
  if (!couple) throw new Error("Couple not found");
  if (couple.healthScore == null) {
    return computeCoupleHealth(coupleId); // first time only
  }
  return {
    score: couple.healthScore,
    level: couple.healthLevel,
    breakdown: couple.healthBreakdown || null,
    confidence: couple.healthConfidence ?? null,
    context: couple.healthContext ?? null,
    factors: couple.healthFactors ?? null,
  };
};

// Resolve the caller's couple then return the cached couple health (identical per
// partner). Used by the AI/dashboard layers.
const getCoupleHealthForUser = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }
  return getCachedHealth(user.currentCoupleId);
};

// Push a couple-scoped event to BOTH partners (no room-join required).
const emitToCouple = (couple, event, payload) => {
  if (!couple) return;
  [couple.partnerOneId, couple.partnerTwoId].filter(Boolean).forEach((id) => {
    emitToUser(id, event, payload);
  });
};

/**
 * Recompute health for a couple and broadcast it live to both partners. Used by
 * mood/memory writes and the CCIE event subscribers for real-time propagation.
 * Never throws.
 */
const recomputeAndBroadcast = async (coupleId, activityType) => {
  try {
    const couple = await Couple.findById(coupleId).select(
      "partnerOneId partnerTwoId",
    );
    if (!couple) return;
    const health = await computeCoupleHealth(coupleId);
    emitToCouple(couple, "health:update", health);
    emitToCouple(couple, "couple:activity", {
      type: activityType,
      at: Date.now(),
    });
  } catch (e) {
    console.error("[health] recomputeAndBroadcast failed:", e.message);
  }
};

module.exports = {
  computeCoupleHealth,
  getCachedHealth,
  getCoupleHealthForUser,
  recomputeAndBroadcast,
  emitToCouple,
};
