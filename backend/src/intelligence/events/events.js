/**
 * CCIE event names. Domain services publish these; the intelligence subscribers
 * recompute the engines they affect. Keeping them as constants avoids typos and
 * documents the surface the brain listens to.
 */
module.exports = {
  MESSAGE_SENT: "MESSAGE_SENT",
  CALL_COMPLETED: "CALL_COMPLETED",
  STORY_POSTED: "STORY_POSTED",
  MOMENT_POSTED: "MOMENT_POSTED",
  MOOD_LOGGED: "MOOD_LOGGED",
  MEMORY_CREATED: "MEMORY_CREATED",
  GOAL_COMPLETED: "GOAL_COMPLETED",
  JOURNAL_WRITTEN: "JOURNAL_WRITTEN",
  LOVE_LETTER_SENT: "LOVE_LETTER_SENT",
  AI_SESSION_COMPLETED: "AI_SESSION_COMPLETED",
  SLEEP_LOGGED: "SLEEP_LOGGED",
  REFLECTION_COMPLETED: "REFLECTION_COMPLETED",
};
