/**
 * Daily Couple Moment service — the engine that turns "both partners shared a
 * Moment today" into a lasting, AI-narrated relationship-timeline entry, and the
 * read API behind the dashboard recap, the "Our Day" timeline, and the
 * Monthly / Yearly replays (Spotify-Wrapped style).
 *
 * Reuses the existing spine (no new SDK/socket/health algorithm):
 *   • couple resolution    → Couple model (+ engagement helpers)
 *   • realtime fan-out      → utils/realtime.emitToUser (per-user, no rooms)
 *   • notifications + push  → notifications/notification.service.createNotification
 *   • engagement (XP/streak) → engagement.service (recordActivity + dayKey)
 *   • AI summary             → ./dailyMoment.ai (Groq, best-effort)
 *
 * IMPORTANT (no circular require): this module imports the **Moment model**, not
 * moment.service — because moment.service imports THIS service to fire the
 * trigger. It therefore builds its own lite Moment DTO.
 */
const mongoose = require("mongoose");
const DailyCoupleMoment = require("./dailyMoment.model");
const Moment = require("../moments/moment.model");
const Message = require("../chat/message.model");
const Mood = require("../moods/mood.model");
const Memory = require("../memories/memory.model");
const Couple = require("../couples/couple.model");
const User = require("../users/user.model");
const AchievementModel = require("../engagement/achievement.model");
const { ACHIEVEMENT_MAP } = require("../engagement/achievements.catalog");
const { emitToUser } = require("../../utils/realtime");
const { createNotification } = require("../notifications/notification.service");
const { recordActivity, dayKey } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");
const { getDaysTogether } = require("../couples/couple.helpers");
const { generateDailySummary } = require("./dailyMoment.ai");
const {
  DAILY_MOMENT_XP,
  MAX_RECAP_MOMENTS,
  AI_STATUS,
  MOOD_EMOJI,
} = require("./dailyMoment.constants");

const err = (message, statusCode = 400) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

// ─── date helpers (UTC, aligned with engagement.service.dayKey) ──────────────
const dayBoundsUTC = (day) => {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
};
const monthBoundsUTC = (year, month /* 1-12 */) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};
const yearBoundsUTC = (year) => ({
  start: new Date(Date.UTC(year, 0, 1)),
  end: new Date(Date.UTC(year + 1, 0, 1)),
});

// ─── couple helpers ──────────────────────────────────────────────────────────
const getCoupleForUser = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) throw err("No active relationship", 400);
  const couple = await Couple.findById(user.currentCoupleId);
  if (!couple) throw err("Couple not found", 404);
  return couple;
};

const partnerIdsOf = (couple) =>
  [couple.partnerOneId, couple.partnerTwoId].filter(Boolean).map(String);

const emitToCouple = (couple, event, payload) =>
  [couple.partnerOneId, couple.partnerTwoId]
    .filter(Boolean)
    .forEach((id) => emitToUser(id, event, payload));

// ─── stats computation ───────────────────────────────────────────────────────
// Pull everything needed for a day's recap in parallel. Couple-level, viewer-
// agnostic. Non-private Moments only (private ones never enter a shared recap).
const computeDayStats = async (couple, partnerIds, day) => {
  const { start, end } = dayBoundsUTC(day);
  const coupleId = couple._id;

  const [moments, messageCount, moods] = await Promise.all([
    Moment.find({
      coupleId,
      privacy: { $ne: "private" },
      createdAt: { $gte: start, $lt: end },
    })
      .sort({ createdAt: 1 })
      .select("authorId type mediaUrl thumbnailUrl createdAt"),
    Message.countDocuments({ coupleId, createdAt: { $gte: start, $lt: end } }),
    Mood.find({
      userId: { $in: partnerIds.map((id) => new mongoose.Types.ObjectId(id)) },
      createdAt: { $gte: start, $lt: end },
    }).select("moodType"),
  ]);

  const counts = { moments: moments.length, photos: 0, videos: 0, voices: 0 };
  for (const m of moments) {
    if (m.type === "photo") counts.photos += 1;
    else if (m.type === "video") counts.videos += 1;
    else if (m.type === "voice") counts.voices += 1;
  }

  // Most-common mood across both partners (couple-level "mood of the day").
  let topMood = null;
  if (moods.length) {
    const tally = {};
    for (const md of moods) tally[md.moodType] = (tally[md.moodType] || 0) + 1;
    topMood = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Cover = first photo, else first video poster frame, else any media.
  const cover =
    moments.find((m) => m.type === "photo") ||
    moments.find((m) => m.thumbnailUrl) ||
    moments[0];
  const coverUrl = cover ? cover.thumbnailUrl || cover.mediaUrl : "";

  const authorIds = [...new Set(moments.map((m) => String(m.authorId)))];

  return {
    moments,
    momentIds: moments.map((m) => m._id),
    authorIds,
    counts,
    messageCount,
    topMood,
    coverUrl,
  };
};

const bothPartnersPosted = (partnerIds, authorIds) =>
  partnerIds.length === 2 && partnerIds.every((id) => authorIds.includes(id));

// Current streak for the couple (read straight off the Engagement doc to avoid a
// heavier recompute — best-effort, defaults to 0).
const currentStreak = async (coupleId) => {
  try {
    const Engagement = require("../engagement/engagement.model");
    const eng = await Engagement.findOne({ coupleId }).select("currentStreak");
    return eng?.currentStreak || 0;
  } catch {
    return 0;
  }
};

// ─── DTOs ────────────────────────────────────────────────────────────────────
// Lite Moment serializer (kept local to avoid importing moment.service).
const momentLite = (m) => ({
  _id: m._id,
  type: m.type,
  mediaUrl: m.mediaUrl,
  thumbnailUrl: m.thumbnailUrl || "",
  author: m.authorId?.name
    ? {
        _id: m.authorId._id,
        name: m.authorId.name,
        profilePhoto: m.authorId.profilePhoto || "",
      }
    : { _id: m.authorId },
  createdAt: m.createdAt,
});

const recapDTO = (doc, moments = null) => ({
  _id: doc._id,
  day: doc.day,
  date: doc.date,
  counts: doc.counts,
  messageCount: doc.messageCount,
  topMood: doc.topMood,
  topMoodEmoji: doc.topMood ? MOOD_EMOJI[doc.topMood] || "" : "",
  streak: doc.streak,
  xpAwarded: doc.xpAwarded,
  coverUrl: doc.coverUrl,
  ai: doc.ai,
  finalized: doc.finalized,
  momentCount: doc.momentIds?.length || 0,
  ...(moments ? { moments: moments.map(momentLite) } : {}),
  createdAt: doc.createdAt,
});

// ─── creation engine ─────────────────────────────────────────────────────────
// Persist the AI summary onto the doc once it resolves (background, best-effort).
const runAISummary = async (docId, stats, couple) => {
  try {
    const [partnerOne, partnerTwo] = await Promise.all([
      User.findById(couple.partnerOneId).select("name"),
      couple.partnerTwoId ? User.findById(couple.partnerTwoId).select("name") : null,
    ]);
    const { summary, ok } = await generateDailySummary(stats, {
      couple,
      partnerOne,
      partnerTwo,
    });
    const updated = await DailyCoupleMoment.findByIdAndUpdate(
      docId,
      {
        $set: {
          "ai.summary": summary,
          "ai.status": ok ? AI_STATUS.READY : AI_STATUS.FAILED,
          "ai.generatedAt": new Date(),
        },
      },
      { new: true },
    );
    if (updated) {
      emitToCouple(couple, "daily-moment:updated", recapDTO(updated));
    }
  } catch (e) {
    console.error("[daily-moment] runAISummary failed:", e.message);
  }
};

// Refresh a (non-finalized) doc's denormalised stats from the live data.
const applyStats = (doc, stats, streak) => {
  doc.momentIds = stats.momentIds;
  doc.authorIds = stats.authorIds;
  doc.counts = stats.counts;
  doc.messageCount = stats.messageCount;
  doc.topMood = stats.topMood;
  doc.coverUrl = stats.coverUrl;
  doc.streak = streak;
  doc.xpAwarded = DAILY_MOMENT_XP;
};

/**
 * Ensure today's (or `day`'s) Daily Couple Moment exists when both partners have
 * posted. Idempotent + race-safe (unique {coupleId,day} guards concurrent
 * creates). Called fire-and-forget from moment.service after each upload — it
 * must NEVER throw back into the upload path. Returns the recap DTO or null.
 *
 * `triggeringUserId` is the partner who just posted (used for the engagement
 * activity attribution only).
 */
const ensureForDay = async (coupleId, triggeringUserId, day = dayKey()) => {
  try {
    const couple = await Couple.findById(coupleId);
    if (!couple || couple.relationshipStatus !== "active") return null;
    const partnerIds = partnerIdsOf(couple);
    if (partnerIds.length < 2) return null;

    const stats = await computeDayStats(couple, partnerIds, day);
    if (!bothPartnersPosted(partnerIds, stats.authorIds)) return null;

    const streak = await currentStreak(coupleId);
    const { start } = dayBoundsUTC(day);

    let doc = await DailyCoupleMoment.findOne({ coupleId, day });
    let created = false;
    if (!doc) {
      try {
        doc = await DailyCoupleMoment.create({ coupleId, day, date: start });
        created = true;
      } catch (e) {
        if (e.code === 11000) {
          doc = await DailyCoupleMoment.findOne({ coupleId, day }); // lost the race
        } else {
          throw e;
        }
      }
    }
    if (!doc) return null;

    // Keep stats fresh until the day is finalized.
    if (!doc.finalized) {
      applyStats(doc, stats, streak);
      await doc.save();
    }

    if (created) {
      // Engagement: record the activity (achievements only — XP is day-based, so
      // this can't inflate it). Fire-and-forget, never throws.
      recordActivity(coupleId, triggeringUserId, ACTIVITY_TYPES.DAILY_MOMENT, {
        day,
      });

      // Notify + realtime to BOTH partners (Feature 12).
      emitToCouple(couple, "daily-moment:ready", recapDTO(doc));
      [couple.partnerOneId, couple.partnerTwoId].filter(Boolean).forEach((id) => {
        createNotification({
          userId: id,
          title: "Today's Couple Moment is ready 💕",
          message:
            "❤️ You both shared your day — your Daily Memory has been created.",
          type: "daily_moment_ready",
          metadata: { dailyMomentId: doc._id, day },
        }).catch(() => {});
      });

      // AI summary in the background (Feature 16 — never blocks the response).
      runAISummary(doc._id, stats, couple);
    }

    return recapDTO(doc);
  } catch (e) {
    console.error("[daily-moment] ensureForDay failed:", e.message);
    return null; // must never break the moment-upload path
  }
};

// ─── read API ────────────────────────────────────────────────────────────────
/**
 * Today's recap for the dashboard (Feature 5). When the recap exists, returns it
 * (stats refreshed live). Otherwise returns the encouragement state with which
 * partner still needs to post.
 */
const getToday = async (userId) => {
  const couple = await getCoupleForUser(userId);
  const partnerIds = partnerIdsOf(couple);
  const day = dayKey();

  const stats = await computeDayStats(couple, partnerIds, day);
  const youId = String(userId);
  const partnerId = partnerIds.find((id) => id !== youId) || null;
  const youPosted = stats.authorIds.includes(youId);
  const partnerPosted = partnerId ? stats.authorIds.includes(partnerId) : false;

  let doc = await DailyCoupleMoment.findOne({ coupleId: couple._id, day });
  if (doc && !doc.finalized) {
    applyStats(doc, stats, await currentStreak(couple._id));
    await doc.save();
  }

  if (!doc) {
    return {
      exists: false,
      day,
      bothPosted: false,
      youPosted,
      partnerPosted,
      counts: stats.counts,
    };
  }
  return { exists: true, day, youPosted, partnerPosted, recap: recapDTO(doc) };
};

// Newest-first timeline of past recaps (Feature 4 / 10).
const getTimeline = async (userId, { limit = 60, before } = {}) => {
  const couple = await getCoupleForUser(userId);
  const query = { coupleId: couple._id };
  if (before) query.date = { $lt: new Date(before) };
  const docs = await DailyCoupleMoment.find(query)
    .sort({ date: -1 })
    .limit(Math.min(Number(limit) || 60, 120));
  return docs.map((d) => recapDTO(d));
};

// Full recap for one day, with the underlying Moments populated (Feature 10).
const getByDay = async (userId, day) => {
  const couple = await getCoupleForUser(userId);
  const doc = await DailyCoupleMoment.findOne({ coupleId: couple._id, day });
  if (!doc) throw err("No Couple Moment for that day", 404);
  const moments = await Moment.find({
    _id: { $in: doc.momentIds.slice(0, MAX_RECAP_MOMENTS) },
  })
    .sort({ createdAt: 1 })
    .populate("authorId", "name profilePhoto");
  return recapDTO(doc, moments);
};

const getById = async (userId, id) => {
  const couple = await getCoupleForUser(userId);
  const doc = await DailyCoupleMoment.findOne({ _id: id, coupleId: couple._id });
  if (!doc) throw err("Couple Moment not found", 404);
  return getByDay(userId, doc.day);
};

// ─── replays (Feature 8 / 9) ─────────────────────────────────────────────────
const aggregateRange = async (coupleId, start, end) => {
  const docs = await DailyCoupleMoment.find({
    coupleId,
    date: { $gte: start, $lt: end },
  }).sort({ date: 1 });

  const totals = { moments: 0, photos: 0, videos: 0, voices: 0, messages: 0, xp: 0 };
  const moodTally = {};
  let longestStreak = 0;
  for (const d of docs) {
    totals.moments += d.counts.moments;
    totals.photos += d.counts.photos;
    totals.videos += d.counts.videos;
    totals.voices += d.counts.voices;
    totals.messages += d.messageCount;
    totals.xp += d.xpAwarded;
    if (d.topMood) moodTally[d.topMood] = (moodTally[d.topMood] || 0) + 1;
    if (d.streak > longestStreak) longestStreak = d.streak;
  }
  const mostCommonMood =
    Object.entries(moodTally).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return { docs, totals, moodTally, mostCommonMood, longestStreak };
};

const biggestAchievementIn = async (coupleId, start, end) => {
  const ach = await AchievementModel.find({
    coupleId,
    unlockedAt: { $gte: start, $lt: end },
  }).sort({ unlockedAt: -1 });
  // "Biggest" = the rarest/last we know about; surface the most recent with copy.
  const def = ach.map((a) => ACHIEVEMENT_MAP[a.key]).find(Boolean);
  return def ? { key: def.key, title: def.title, emoji: def.emoji } : null;
};

const getMonthlyReplay = async (userId, year, month) => {
  const couple = await getCoupleForUser(userId);
  const { start, end } = monthBoundsUTC(year, month);
  const { docs, totals, mostCommonMood, longestStreak } = await aggregateRange(
    couple._id,
    start,
    end,
  );
  const biggestAchievement = await biggestAchievementIn(couple._id, start, end);

  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    period: "month",
    year,
    month,
    label, // e.g. "June 2026"
    daysWithMoment: docs.length,
    totals,
    mostCommonMood,
    mostCommonMoodEmoji: mostCommonMood ? MOOD_EMOJI[mostCommonMood] || "" : "",
    longestStreak,
    biggestAchievement,
    cover: docs.find((d) => d.coverUrl)?.coverUrl || "",
    days: docs.map((d) => recapDTO(d)),
  };
};

const getYearlyReplay = async (userId, year) => {
  const couple = await getCoupleForUser(userId);
  const { start, end } = yearBoundsUTC(year);
  const { docs, totals, mostCommonMood, longestStreak } = await aggregateRange(
    couple._id,
    start,
    end,
  );

  // Happiest month = month with the most days whose mood was a positive one.
  const POSITIVE = new Set(["happy", "loved", "excited"]);
  const byMonth = {};
  for (const d of docs) {
    const m = d.date.getUTCMonth();
    byMonth[m] = byMonth[m] || { total: 0, positive: 0 };
    byMonth[m].total += 1;
    if (d.topMood && POSITIVE.has(d.topMood)) byMonth[m].positive += 1;
  }
  let happiestMonth = null;
  let bestScore = -1;
  for (const [m, v] of Object.entries(byMonth)) {
    if (v.positive > bestScore) {
      bestScore = v.positive;
      happiestMonth = Number(m);
    }
  }
  const happiestMonthLabel =
    happiestMonth != null
      ? new Date(Date.UTC(year, happiestMonth, 1)).toLocaleString("en-US", {
          month: "long",
          timeZone: "UTC",
        })
      : null;

  // Best trip + favourite memory from the Memory collection (no duplication).
  const [bestTrip, favoriteMemory] = await Promise.all([
    Memory.findOne({
      coupleId: couple._id,
      memoryType: "trip",
      memoryDate: { $gte: start, $lt: end },
    })
      .sort({ memoryDate: -1 })
      .select("title memoryDate photos"),
    Memory.findOne({ coupleId: couple._id, memoryDate: { $gte: start, $lt: end } })
      .sort({ memoryDate: 1 })
      .select("title memoryType memoryDate photos"),
  ]);

  return {
    period: "year",
    year,
    label: String(year),
    daysWithMoment: docs.length,
    totals,
    mostCommonMood,
    mostCommonMoodEmoji: mostCommonMood ? MOOD_EMOJI[mostCommonMood] || "" : "",
    longestStreak,
    happiestMonth: happiestMonthLabel,
    bestTrip: bestTrip
      ? { title: bestTrip.title, date: bestTrip.memoryDate, photo: bestTrip.photos?.[0] || "" }
      : null,
    favoriteMemory: favoriteMemory
      ? { title: favoriteMemory.title, type: favoriteMemory.memoryType, date: favoriteMemory.memoryDate }
      : null,
    cover: docs.find((d) => d.coverUrl)?.coverUrl || "",
  };
};

// ─── cron: nightly finalize (resilience + freeze) ────────────────────────────
/**
 * Run shortly after UTC midnight: for the day that just ended, (a) finalize any
 * existing recap so its stats freeze, and (b) RECONCILE — create a recap for any
 * couple where both partners posted but the live trigger was missed (server
 * restart, race, etc.). Returns { finalized, created }.
 */
const finalizeYesterday = async () => {
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  let finalized = 0;
  let created = 0;

  // (a) Freeze yesterday's recaps.
  const docs = await DailyCoupleMoment.find({ day: yesterday, finalized: false });
  for (const doc of docs) {
    doc.finalized = true;
    await doc.save();
    finalized += 1;
  }

  // (b) Reconcile: active couples with no recap yet for yesterday.
  const couples = await Couple.find({ relationshipStatus: "active" }).select(
    "_id partnerOneId partnerTwoId",
  );
  for (const couple of couples) {
    const exists = await DailyCoupleMoment.exists({
      coupleId: couple._id,
      day: yesterday,
    });
    if (exists) continue;
    const partnerIds = partnerIdsOf(couple);
    if (partnerIds.length < 2) continue;
    const stats = await computeDayStats(couple, partnerIds, yesterday);
    if (!bothPartnersPosted(partnerIds, stats.authorIds)) continue;
    const recap = await ensureForDay(couple._id, partnerIds[0], yesterday);
    if (recap) {
      created += 1;
      await DailyCoupleMoment.updateOne(
        { coupleId: couple._id, day: yesterday },
        { $set: { finalized: true } },
      );
    }
  }

  return { finalized, created };
};

module.exports = {
  ensureForDay,
  getToday,
  getTimeline,
  getByDay,
  getById,
  getMonthlyReplay,
  getYearlyReplay,
  finalizeYesterday,
  // exported for tests / story integration
  recapDTO,
};
