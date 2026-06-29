/**
 * AI Current Mood — the user-facing service over the CCIE emotion engine.
 *
 * Provides:
 *   • getAiMood(userId)         — my own estimated current mood (+ timeline)
 *   • getPartnerAiMood(userId)  — my partner's estimated mood, PRIVACY-AWARE
 *                                 (respects their privacy.moodVisibility)
 *   • recomputeAndBroadcast(coupleId) — recompute BOTH partners' AI mood and push
 *                                 it live (chat header / mood page update with no
 *                                 manual refresh). Debounced by the CCIE
 *                                 subscribers; never throws into the caller.
 *
 * This is the THIRD mood concept and is deliberately read-only against the Mood
 * collection — it never writes a manual mood and never carries an intensity.
 */
const intelligence = require("../../intelligence");
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const { emitToUser } = require("../../utils/realtime");

const partnerIdOf = (couple, userId) => {
  if (!couple) return null;
  const uid = String(userId);
  if (String(couple.partnerOneId) === uid) return couple.partnerTwoId;
  if (String(couple.partnerTwoId) === uid) return couple.partnerOneId;
  return null;
};

// My own AI current mood (full payload, including the timeline).
const getAiMood = async (userId) => {
  return intelligence.getCurrentMood(userId);
};

// A trimmed payload safe to show on a partner-facing surface (no timeline array).
// `reasons` ARE included: they're derived from mutual/shared activity (calls,
// stories, chat, memories) and power the chat header's "Why?" transparency sheet.
const partnerView = (mood) => ({
  moodType: mood.moodType,
  emoji: mood.emoji,
  label: mood.label,
  display: mood.display,
  headline: mood.headline,
  valence: mood.valence,
  confidence: mood.confidence,
  trend: mood.trend,
  direction: mood.direction,
  reasons: mood.reasons || [],
  isEstimate: true,
  updatedAt: mood.updatedAt,
});

/**
 * Partner's AI current mood, respecting their mood-visibility privacy. Returns
 * `{ available: false }` when the partner hid their moods or there's no partner.
 */
const getPartnerAiMood = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) return { available: false };
  const couple = await Couple.findById(user.currentCoupleId);
  const partnerId = partnerIdOf(couple, userId);
  if (!partnerId) return { available: false };

  const partner = await User.findById(partnerId).select("privacy name");
  if (partner?.privacy?.moodVisibility === "private") {
    return { available: false, reason: "private" };
  }

  const mood = await intelligence.getCurrentMood(partnerId);
  return { available: true, partnerId: String(partnerId), ...partnerView(mood) };
};

/**
 * Recompute + broadcast BOTH partners' AI mood. Each partner gets:
 *   • `mood:ai-update`      — their OWN updated mood (mood page / self surfaces)
 *   • `partner:mood-update` — the OTHER partner's mood (chat header), privacy-aware
 * Best-effort: a failure for one partner never blocks the other or the trigger.
 */
const recomputeAndBroadcast = async (coupleId) => {
  try {
    const couple = await Couple.findById(coupleId).select("partnerOneId partnerTwoId");
    if (!couple) return;
    const ids = [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);
    if (!ids.length) return;

    // Compute each partner's mood once, plus their privacy flag.
    const computed = await Promise.all(
      ids.map(async (id) => {
        try {
          const [mood, u] = await Promise.all([
            intelligence.getCurrentMood(id),
            User.findById(id).select("privacy"),
          ]);
          return { id: String(id), mood, hidden: u?.privacy?.moodVisibility === "private" };
        } catch {
          return null;
        }
      }),
    );

    for (const entry of computed) {
      if (!entry) continue;
      // Push their own mood to themselves.
      emitToUser(entry.id, "mood:ai-update", entry.mood);
      // Push their mood to the partner (chat header) unless they hid moods.
      if (!entry.hidden) {
        const other = computed.find((e) => e && e.id !== entry.id);
        if (other) {
          emitToUser(other.id, "partner:mood-update", {
            partnerId: entry.id,
            ...partnerView(entry.mood),
          });
        }
      }
    }
  } catch (e) {
    console.error("[aiMood] recomputeAndBroadcast failed:", e.message);
  }
};

module.exports = { getAiMood, getPartnerAiMood, recomputeAndBroadcast };
