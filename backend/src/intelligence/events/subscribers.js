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
