/**
 * AI Relationship Assistant jobs — the proactive half of the notification
 * system (Features: Real-time AI Notifications + Relationship Change Detection
 * + nightly AI Relationship Timeline recap).
 *
 * Rules the whole file follows:
 *  - Observations, never accusations — all copy is hedged and warm.
 *  - PRIVACY-FIRST: everything is computed from in-app CoupleCare activity
 *    only; each AI notification carries an `aiExplanation` saying exactly that.
 *  - Anti-spam: every send is deduped per (user, type, kind) over a window, and
 *    routine greetings only go to recently-active users (never dead accounts).
 *  - Best-effort: one user's failure never stops a sweep.
 */
const cron = require("node-cron");

const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Message = require("../chat/message.model");
const Notification = require("./notification.model");
const { createNotification } = require("./notification.service");

const DAY_MS = 86400000;
const todayKey = () => new Date().toISOString().slice(0, 10);

// Has this user already received a `type` notification for `kind` within the
// last `days`? (The dedupe that keeps the assistant helpful, not noisy.)
const alreadySent = async (userId, type, kind, days) => {
  try {
    return Boolean(
      await Notification.exists({
        userId,
        type,
        ...(kind ? { "metadata.kind": kind } : {}),
        createdAt: { $gte: new Date(Date.now() - days * DAY_MS) },
      }),
    );
  } catch {
    return true; // fail closed: when in doubt, don't send
  }
};

const activeCouples = () =>
  Couple.find({ relationshipStatus: "active", partnerTwoId: { $ne: null } }).select(
    "_id partnerOneId partnerTwoId",
  );

// Deterministic per-day pick from a copy pool (no randomness — same day, same
// message, matching the CCIE reproducibility rule).
const pickForDay = (pool, salt = 0) => {
  const dayNum = Math.floor(Date.now() / DAY_MS);
  return pool[(dayNum + salt) % pool.length];
};

const GOOD_MORNING = [
  "A new day together starts now. One small kind gesture goes a long way. ☀️",
  "Good morning! A quick 'thinking of you' text is a lovely way to start. 💌",
  "Morning! What's one thing you appreciate about your partner today? ☕",
  "Rise and shine — a shared plan for tonight makes the whole day brighter. 🌤",
];

const GOOD_NIGHT = [
  "Before the day ends — a goodnight message means more than you think. 🌙",
  "Winding down? A one-minute reflection keeps your story growing. ✨",
  "End the day warm: tell your partner one thing they did well today. 💜",
  "Good night! Tomorrow is another page of your story together. 🌙",
];

const DATE_NIGHT = {
  travel: "How about planning a mini getaway this weekend? Even one night away counts. ✈️",
  food: "Weekend idea: cook something new together — one dish, two chefs. 🍕",
  coffee: "Weekend idea: find a café neither of you has tried. ☕",
  movies: "Movie night? Blankets, snacks, and something neither of you has seen. 🎬",
  music: "Any live music nearby this weekend? Or trade favourite playlists tonight. 🎶",
  nature: "A sunset walk or picnic this weekend could be just the reset you need. 🌅",
  adventure: "Feeling adventurous? Pick something neither of you has done before. 🧗",
  fitness: "A workout or long walk together this weekend — sweat, laugh, repeat. 💪",
  default: "It's almost the weekend — want to surprise your partner with a date night? ❤️",
};

const startAiAssistantJobs = () => {
  // ── Good morning (8am) — only to users seen in the last 7 days. ──
  cron.schedule("0 8 * * *", async () => {
    console.log("Running AI Good Morning Job");
    const since = new Date(Date.now() - 7 * DAY_MS);
    const users = await User.find({ lastSeen: { $gte: since } }).select("_id");
    for (const user of users) {
      try {
        if (await alreadySent(user._id, "good_morning", null, 1)) continue;
        await createNotification({
          userId: user._id,
          title: "Good morning ☀️",
          message: pickForDay(GOOD_MORNING),
          type: "good_morning",
          subtitle: "Your daily nudge from CoupleCare",
        });
      } catch {
        /* one user's failure must not stop the sweep */
      }
    }
  });

  // ── Good night (10pm) — only to users active TODAY. ──
  cron.schedule("0 22 * * *", async () => {
    console.log("Running AI Good Night Job");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const users = await User.find({ lastSeen: { $gte: todayStart } }).select("_id");
    for (const user of users) {
      try {
        if (await alreadySent(user._id, "good_night", null, 1)) continue;
        await createNotification({
          userId: user._id,
          title: "Good night 🌙",
          message: pickForDay(GOOD_NIGHT, 2),
          type: "good_night",
          subtitle: "Wind down together",
        });
      } catch {
        /* continue sweep */
      }
    }
  });

  // ── Reflection reminder (8:30pm) — only to users who HAVE the reflection
  // habit (an entry in the last 14 days) and skipped today. Encouraging. ──
  cron.schedule("30 20 * * *", async () => {
    console.log("Running Reflection Reminder Job");
    let DailyReflection;
    try {
      DailyReflection = require("../reflection/reflection.model");
    } catch {
      return;
    }
    const day = todayKey();
    const since = new Date(Date.now() - 14 * DAY_MS);
    const recentUserIds = await DailyReflection.distinct("userId", {
      createdAt: { $gte: since },
    });
    for (const userId of recentUserIds) {
      try {
        const doneToday = await DailyReflection.exists({ userId, day });
        if (doneToday) continue;
        if (await alreadySent(userId, "reflection_reminder", null, 1)) continue;
        await createNotification({
          userId,
          title: "One minute for today 🪞",
          message: "Your daily reflection is still open — energy, mood, one grateful thought. That's it.",
          type: "reflection_reminder",
          subtitle: "Optional, always",
          aiExplanation: "Sent because you've been reflecting recently and haven't logged today — based only on your own entries inside CoupleCare.",
        });
      } catch {
        /* continue sweep */
      }
    }
  });

  // ── Conversation reminder (8pm) — couples who usually chat daily (messages
  // on ≥4 of the last 7 days) but have NO messages today. ──
  cron.schedule("0 20 * * *", async () => {
    console.log("Running Conversation Reminder Job");
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);

    const couples = await activeCouples();
    for (const couple of couples) {
      try {
        const todayCount = await Message.countDocuments({
          coupleId: couple._id,
          createdAt: { $gte: todayStart },
        });
        if (todayCount > 0) continue;

        const recent = await Message.find({
          coupleId: couple._id,
          createdAt: { $gte: weekAgo },
        }).select("createdAt");
        const activeDays = new Set(recent.map((m) => m.createdAt.toISOString().slice(0, 10))).size;
        if (activeDays < 4) continue; // no daily-chat habit — nothing to observe

        for (const userId of [couple.partnerOneId, couple.partnerTwoId]) {
          if (await alreadySent(userId, "conversation_reminder", null, 2)) continue;
          await createNotification({
            userId,
            title: "You both haven't chatted much today 💬",
            message: "You usually talk every day — want to check in with your partner? Even a hello counts.",
            type: "conversation_reminder",
            subtitle: "A gentle observation, not a scorecard",
            aiExplanation: `Based only on your chat activity inside CoupleCare: messages on ${activeDays} of the last 7 days, none yet today.`,
            metadata: { kind: "no_chat_today" },
          });
        }
      } catch {
        /* continue sweep */
      }
    }
  });

  // ── Nightly relationship recap (9pm) — Feature: AI Relationship Timeline.
  // Couples with activity today get their day summarised (deterministic
  // highlights from the memory engine). ──
  cron.schedule("0 21 * * *", async () => {
    console.log("Running Nightly Relationship Recap Job");
    const intelligence = require("../../intelligence");
    const couples = await activeCouples();
    for (const couple of couples) {
      try {
        const recap = await intelligence.getMemory(couple._id, "daily");
        if (!recap.highlights || !recap.highlights.length) continue; // quiet day — stay quiet too
        const message = recap.highlights.join("  ·  ");
        for (const userId of [couple.partnerOneId, couple.partnerTwoId]) {
          if (await alreadySent(userId, "ai_insight", "daily_recap", 1)) continue;
          await createNotification({
            userId,
            title: "Today, together ❤️",
            message,
            type: "ai_insight",
            subtitle: "Your day in review",
            aiExplanation: "Assembled only from today's CoupleCare activity — messages, moods, stories, memories and milestones.",
            metadata: { kind: "daily_recap", counts: recap.counts },
          });
        }
      } catch {
        /* continue sweep */
      }
    }
  });

  // ── Change-detection sweep (03:00 UTC, after the nightly CCIE recompute) —
  // hedged observations vs the couple's own baseline, deduped per kind. ──
  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log("Running Relationship Change Detection Job");
      const intelligence = require("../../intelligence");
      const couples = await activeCouples();
      let sent = 0;
      for (const couple of couples) {
        try {
          const { observations } = await intelligence.getChangeObservations(couple._id);
          // At most the 2 most important observations per night — never a flood.
          for (const obs of observations.slice(0, 2)) {
            for (const userId of [couple.partnerOneId, couple.partnerTwoId]) {
              if (await alreadySent(userId, obs.type, obs.kind, 5)) continue;
              await createNotification({
                userId,
                title: obs.title,
                message: obs.message,
                type: obs.type,
                category: obs.category,
                priority: obs.priority,
                subtitle: obs.tone === "positive" ? "Something worth celebrating" : "A gentle observation",
                aiExplanation: obs.explanation,
                metadata: { kind: obs.kind, tone: obs.tone },
              });
              sent += 1;
            }
          }
        } catch {
          /* one couple's failure must not stop the sweep */
        }
      }
      console.log(`[ai-assistant] change detection: sent ${sent} observations`);
    },
    { timezone: "UTC" },
  );

  // ── Date-night suggestion (Friday 5pm) — personalised by the recipient's
  // Interest Profile (in-app signals only). ──
  cron.schedule("0 17 * * 5", async () => {
    console.log("Running Date Night Suggestion Job");
    let interestService;
    try {
      interestService = require("../interests/interest.service");
    } catch {
      interestService = null;
    }
    const couples = await activeCouples();
    for (const couple of couples) {
      for (const userId of [couple.partnerOneId, couple.partnerTwoId]) {
        try {
          if (await alreadySent(userId, "date_night_suggestion", null, 6)) continue;
          let message = DATE_NIGHT.default;
          if (interestService) {
            const { interests } = await interestService.getProfile(userId);
            const top = interests[0]?.key;
            if (top && DATE_NIGHT[top]) message = DATE_NIGHT[top];
          }
          await createNotification({
            userId,
            title: "Date night idea 💡",
            message,
            type: "date_night_suggestion",
            subtitle: "Inspired by what you love doing in CoupleCare",
            aiExplanation: "Personalised only from your in-app interests (searches, goals, saved ideas) — never from other apps.",
          });
        } catch {
          /* continue sweep */
        }
      }
    }
  });
};

module.exports = { startAiAssistantJobs };
