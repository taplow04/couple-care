/**
 * CCIE subscribers — map events → the engines they dirty, and recompute
 * INCREMENTALLY with a per-couple debounce so a burst of activity coalesces into
 * one recompute instead of recomputing on every write.
 *
 * Registered once at server boot (server.js). Publishers are added to the domain
 * services in Phase B; until then this is dormant (no events fire), which is why
 * the existing recomputeAndBroadcast path keeps health live in Phase A.
 */
const { bus } = require("./bus");
const E = require("./events");

const DEBOUNCE_MS = 4000;
const timers = new Map(); // coupleId → timeout

// Which engines each event dirties (used in Phase B to scope recompute).
const EVENT_ENGINES = {
  [E.MESSAGE_SENT]: ["relationshipHealth", "trust", "emotion"],
  [E.CALL_COMPLETED]: ["relationshipHealth"],
  [E.STORY_POSTED]: ["relationshipHealth", "growth"],
  [E.MOMENT_POSTED]: ["relationshipHealth", "growth"],
  [E.MOOD_LOGGED]: ["relationshipHealth", "emotion"],
  [E.MEMORY_CREATED]: ["relationshipHealth", "growth", "memory"],
  [E.GOAL_COMPLETED]: ["growth", "trust"],
  [E.JOURNAL_WRITTEN]: ["emotion"],
  [E.LOVE_LETTER_SENT]: ["growth"],
  [E.AI_SESSION_COMPLETED]: ["growth"],
  [E.SLEEP_LOGGED]: ["relationshipHealth"],
  [E.REFLECTION_COMPLETED]: ["relationshipHealth", "emotion", "pulse"],
};

const scheduleRecompute = (coupleId) => {
  if (!coupleId) return;
  const key = String(coupleId);
  if (timers.has(key)) clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(async () => {
      timers.delete(key);
      try {
        // Recompute + broadcast the couple's health (the single live metric the
        // UI shows). Other engines refresh lazily on read. Lazy-require to avoid
        // a cycle (health.service → intelligence → subscribers).
        const { recomputeAndBroadcast } = require("../../modules/couples/health.service");
        await recomputeAndBroadcast(coupleId, "ccie");
      } catch (e) {
        console.error("[ccie:subscribers] recompute failed:", e.message);
      }
      // Recompute + push BOTH partners' AI current mood so the chat header / mood
      // page update live whenever emotional context changes (chat, calls, moods,
      // stories, journals…). Best-effort, lazy-required, never throws.
      try {
        await require("../../modules/moods/aiMood.service").recomputeAndBroadcast(coupleId);
      } catch (e) {
        console.error("[ccie:subscribers] mood broadcast failed:", e.message);
      }
      // Recompute + push the Relationship Pulse (dashboard analytics) to both
      // partners so it updates in real time — no manual refresh. Best-effort.
      try {
        const intelligence = require("../index");
        const pulse = await intelligence.getPulse(coupleId);
        const Couple = require("../../modules/couples/couple.model");
        const couple = await Couple.findById(coupleId).select("partnerOneId partnerTwoId");
        const { emitToUser } = require("../../utils/realtime");
        for (const uid of [couple?.partnerOneId, couple?.partnerTwoId].filter(Boolean)) {
          emitToUser(uid, "pulse:update", {
            score: pulse.score,
            level: pulse.level,
            breakdown: pulse.breakdown,
            confidence: pulse.confidence,
            trend: pulse.trend,
          });
        }
      } catch (e) {
        console.error("[ccie:subscribers] pulse broadcast failed:", e.message);
      }
    }, DEBOUNCE_MS),
  );
};

let registered = false;
const register = () => {
  if (registered) return;
  registered = true;
  for (const event of Object.keys(EVENT_ENGINES)) {
    bus.on(event, (payload) => scheduleRecompute(payload?.coupleId));
  }
  // Universal couple-activity event (published from engagement.recordActivity,
  // the choke-point every couple feature funnels through) + completed calls.
  bus.on("COUPLE_ACTIVITY", (payload) => scheduleRecompute(payload?.coupleId));
  console.log("[ccie] event subscribers registered");
};

module.exports = { register, EVENT_ENGINES, scheduleRecompute };
