/**
 * CCIE feature extraction — THE only DB-touching layer for the engines. Each
 * gather* returns a plain `features` object the pure engine cores consume, so the
 * scoring math stays unit-testable with fixtures (no DB).
 *
 * Phase B expands the Relationship Health features to the full CCIE input set
 * (calls/video/voice/stories/sleep/bucket/aiCoach/achievements + derived
 * responsiveness/conflict-recovery/activity-baseline + the trust & growth sub-
 * feature sets). Every extra query is guarded so a missing collection/field can
 * never break scoring — the affected input simply degrades to null (skipped).
 */
const Couple = require("../../modules/couples/couple.model");
const Mood = require("../../modules/moods/mood.model");
const Memory = require("../../modules/memories/memory.model");
const Message = require("../../modules/chat/message.model");
const Call = require("../../modules/calls/call.model");
const SleepLog = require("../../modules/sleep/sleep.model");
const BucketItem = require("../../modules/bucket/bucket.model");
const Moment = require("../../modules/moments/moment.model");
const Achievement = require("../../modules/engagement/achievement.model");
const Engagement = require("../../modules/engagement/engagement.model");
const ActivityLog = require("../../modules/engagement/activityLog.model");
const User = require("../../modules/users/user.model");
const { getDaysTogether } = require("../../modules/couples/couple.helpers");
const { DAY_MS, dayKey } = require("./normalize");
const derive = require("./derive");

// Optional models (require defensively so a rename never breaks scoring).
const optionalModel = (path) => {
  try {
    return require(path);
  } catch {
    return null;
  }
};
const DailyCoupleMoment = optionalModel("../../modules/dailyMoment/dailyMoment.model");
const LoveLetter = optionalModel("../../modules/letters/letter.model");

const safeCount = async (model, query) => {
  if (!model) return 0;
  try {
    return await model.countDocuments(query);
  } catch {
    return 0;
  }
};

const MILESTONES = [30, 180, 365, 730, 1825];

const gatherHealthFeatures = async (coupleId, now = Date.now()) => {
  const couple = await Couple.findById(coupleId);
  if (!couple) throw new Error("Couple not found");

  const partnerIds = [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);
  const [pOne, pTwo] = partnerIds;
  const since = new Date(now - 30 * DAY_MS);
  const today = dayKey(now);

  const [
    moods,
    memories,
    messages,
    callsRecent,
    voiceCount,
    storyCount,
    sleepLogs,
    bucketCompleted,
    aiCoachCount,
    achievementCount,
    engagement,
    myMsgsAll,
    partnerMsgsAll,
    activeTodayUsers,
    users,
    challengesCount,
    dailyMomentsCount,
    loveLettersCount,
    storiesAll,
  ] = await Promise.all([
    Mood.find({ coupleId, createdAt: { $gte: since } }).select("moodType intensity userId createdAt"),
    Memory.find({ coupleId }).select("memoryType memoryDate createdAt"),
    Message.find({ coupleId, createdAt: { $gte: since } }).select("senderId createdAt text type"),
    Call.find({ coupleId, status: "completed", createdAt: { $gte: since } }).select("callType").catch(() => []),
    safeCount(Message, { coupleId, type: "audio", createdAt: { $gte: since } }),
    safeCount(Moment, { coupleId, createdAt: { $gte: since } }),
    SleepLog.find({ coupleId }).select("userId day sleepAt").catch(() => []),
    safeCount(BucketItem, { coupleId, completed: true }),
    safeCount(ActivityLog, { coupleId, type: "coach", day: { $exists: true } }),
    safeCount(Achievement, { coupleId }),
    Engagement.findOne({ coupleId }).select("currentStreak longestStreak totalXP level").catch(() => null),
    safeCount(Message, { coupleId, senderId: pOne }),
    safeCount(Message, { coupleId, senderId: pTwo }),
    ActivityLog.distinct("userId", { coupleId, day: today }).catch(() => []),
    User.find({ _id: { $in: partnerIds } }).select("privacy").catch(() => []),
    safeCount(ActivityLog, { coupleId, type: "challenge" }),
    safeCount(DailyCoupleMoment, { coupleId }),
    safeCount(LoveLetter, { coupleId }),
    safeCount(Moment, { coupleId }),
  ]);

  const moodsA = moods.filter((m) => String(m.userId) === String(pOne));
  const moodsB = moods.filter((m) => String(m.userId) === String(pTwo));
  const daysTogether = getDaysTogether(couple);

  // ── derived (pure) ──
  const callCount = callsRecent.length;
  const videoCount = callsRecent.filter((c) => c.callType === "video").length;
  const sleepA = sleepLogs.filter((s) => String(s.userId) === String(pOne));
  const sleepB = sleepLogs.filter((s) => String(s.userId) === String(pTwo));

  const responsiveness = derive.responsiveness(messages, now);
  const sleepSyncPct = derive.sleepSync(sleepA, sleepB);
  const conflictRecoveryPct = derive.conflictRecovery(moods, memories, now);
  const activityVsBaseline = derive.activityVsBaseline([...moods, ...memories, ...messages], now);

  // support ratio (positive interaction share) from message sentiment.
  const { positivityOf } = require("./sentiment");
  const supportRatio = positivityOf(messages).ratio;

  // couple-symmetric transparency (avg of both partners' partner-visible share).
  const transparencyPctOf = (u) => {
    const p = u?.privacy ? (u.privacy.toObject ? u.privacy.toObject() : u.privacy) : {};
    const keys = Object.keys(p);
    if (!keys.length) return 0;
    const visible = keys.filter((k) => p[k] !== "private").length;
    return (visible / keys.length) * 100;
  };
  const transparencyPct = users.length
    ? users.reduce((a, u) => a + transparencyPctOf(u), 0) / users.length
    : 0;

  const bothActiveToday =
    partnerIds.length === 2 && partnerIds.every((id) => activeTodayUsers.map(String).includes(String(id)));
  const journeyProgress = (MILESTONES.filter((m) => daysTogether >= m).length / MILESTONES.length) * 100;

  return {
    couple,
    now,
    partnerIds,
    daysTogether,
    // classic
    moods,
    memories,
    messages,
    moodsA,
    moodsB,
    // new health inputs (null ⇒ component skipped)
    callCount,
    videoCount,
    voiceCount,
    storyCount,
    bucketCompleted,
    aiCoachCount,
    achievementCount,
    responsiveness,
    sleepSyncPct,
    conflictRecoveryPct,
    activityVsBaseline,
    supportRatio,
    // sub-engine feature sets (trust & growth as health inputs)
    trustFeatures: {
      myMsgs: myMsgsAll,
      partnerMsgs: partnerMsgsAll,
      streak: engagement?.currentStreak ?? 0,
      longest: engagement?.longestStreak ?? 0,
      bothActiveToday,
      transparencyPct,
      supportRatio,
    },
    growthFeatures: {
      achievements: achievementCount,
      bucketCompleted,
      journeyProgress,
      memories: memories.length,
      stories: storiesAll,
      challenges: challengesCount,
      dailyMoments: dailyMomentsCount,
      loveLetters: loveLettersCount,
      aiSessions: aiCoachCount,
      xp: engagement?.totalXP ?? 0,
      level: engagement?.level ?? 1,
    },
    engagement,
  };
};

module.exports = { gatherHealthFeatures };
