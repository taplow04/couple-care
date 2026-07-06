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
    bucketTotal,
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
    safeCount(BucketItem, { coupleId }),
  ]);

  // Love Meter 2.0: couple-symmetric average of both partners' latest maturity
  // snapshots (null ⇒ component skipped — regression-free for new couples).
  const maturityAvg = await latestMaturityAvg(partnerIds);

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
    bucketTotal,
    maturityAvg,
    dailyMomentsCount,
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

const GrowthJournal = optionalModel("../../modules/growth/growth.model");
const { EMOJI_VALENCE } = require("../config/rules");

// Emoji-only positivity (0..100) over a list of {text}. null when no emoji used.
// Distinct from sentiment.positivityOf (words+emoji) so emoji usage is its OWN
// emotional signal (people lean on emoji to convey tone they don't type out).
const emojiPositivity = (items, field = "text") => {
  let pos = 0;
  let neg = 0;
  let total = 0;
  for (const it of items) {
    for (const ch of Array.from(it[field] || "")) {
      const v = EMOJI_VALENCE[ch];
      if (v > 0) {
        pos += 1;
        total += 1;
      } else if (v < 0) {
        neg += 1;
        total += 1;
      }
    }
  }
  if (pos + neg === 0) return { score: null, count: 0 };
  return { score: (pos / (pos + neg)) * 100, count: total };
};

// Per-USER emotional features (Emotion engine). Every extra query is guarded so a
// missing collection/field degrades that signal to null (component skipped) and
// never breaks scoring. `signalsMeta` carries recency/magnitude facts the
// current-mood derivation turns into human-readable reasons.
const gatherEmotionFeatures = async (userId, now = Date.now()) => {
  const user = await User.findById(userId).select("currentCoupleId");
  const coupleId = user?.currentCoupleId || null;
  const since = new Date(now - 30 * DAY_MS);
  const today = dayKey(now);

  const [
    moods,
    sentMessages,
    coupleMessages,
    journalRows,
    sleepRows,
    myMoments,
    calls,
    voiceCount,
    recentMemories,
    dailyMomentsRecent,
  ] = await Promise.all([
    Mood.find({ userId, createdAt: { $gte: since } }).select("moodType intensity createdAt"),
    coupleId
      ? Message.find({ coupleId, senderId: userId, createdAt: { $gte: since } }).select("text createdAt type").catch(() => [])
      : [],
    coupleId
      ? Message.find({ coupleId, createdAt: { $gte: since } }).select("senderId createdAt").catch(() => [])
      : [],
    GrowthJournal
      ? GrowthJournal.GrowthJournal.find({ userId, createdAt: { $gte: since } }).select("content createdAt").catch(() => [])
      : [],
    SleepLog.find({ userId }).sort({ day: -1 }).limit(14).select("quality hours day").catch(() => []),
    coupleId
      ? Moment.find({ coupleId, authorId: userId, createdAt: { $gte: since } }).select("caption reactions createdAt").catch(() => [])
      : [],
    Call.find({ $or: [{ callerId: userId }, { receiverId: userId }], status: "completed", createdAt: { $gte: since } }).select("duration callType createdAt").catch(() => []),
    safeCount(Message, { coupleId, senderId: userId, type: "audio", createdAt: { $gte: since } }),
    coupleId ? safeCount(Memory, { coupleId, createdAt: { $gte: since } }) : 0,
    coupleId ? safeCount(DailyCoupleMoment, { coupleId, createdAt: { $gte: since } }) : 0,
  ]);

  // ── Message tempo: longer, considered messages read as more invested. ──
  let tempoScore = null;
  if (sentMessages.length) {
    const avgLen = sentMessages.reduce((a, m) => a + ((m.text || "").length), 0) / sentMessages.length;
    tempoScore = Math.min((avgLen / 100) * 100, 100);
  }

  // ── Sleep wellbeing: avg quality (1–5) blended with hours adequacy (~8h). ──
  let sleepWellbeing = null;
  if (sleepRows.length) {
    const avgQ = sleepRows.reduce((a, s) => a + (s.quality || 3), 0) / sleepRows.length;
    const avgH = sleepRows.reduce((a, s) => a + (s.hours || 0), 0) / sleepRows.length;
    const qScore = (avgQ / 5) * 100;
    const hScore = Math.max(0, 100 - Math.abs(avgH - 8) * 12.5);
    sleepWellbeing = 0.6 * qScore + 0.4 * hScore;
  }

  // ── Emoji positivity (own signal). ──
  const emoji = emojiPositivity(sentMessages);

  // ── Reply speed: this user's responsiveness within the couple thread. ──
  const replySpeed = derive.responsiveness(coupleMessages, now);

  // ── Story captions sentiment + reactions received on my Moments. ──
  const { positivityOf } = require("./sentiment");
  const captionSent = positivityOf(myMoments.map((m) => ({ text: m.caption || "" })));
  const storyCaptionScore = captionSent.ratio != null ? captionSent.ratio * 100 : null;

  let storyReactionScore = null;
  const reactionsReceived = myMoments.reduce((a, m) => a + (m.reactions?.length || 0), 0);
  if (myMoments.length) {
    // Any reaction from a partner is affirming; saturate at ~6 reactions/30d.
    storyReactionScore = Math.min(reactionsReceived / 6, 1) * 100;
  }

  // ── Call connection: frequency + total minutes with the partner. ──
  let callConnectionScore = null;
  if (calls.length) {
    const totalMin = calls.reduce((a, c) => a + (c.duration || 0), 0) / 60;
    const freqScore = Math.min(calls.length / 8, 1) * 100; // ~8 calls/30d ⇒ full
    const durScore = Math.min(totalMin / 60, 1) * 100; // ~60 min/30d ⇒ full
    callConnectionScore = 0.5 * freqScore + 0.5 * durScore;
  }

  // ── Voice warmth: voice-note activity. ──
  const voiceWarmthScore = voiceCount > 0 ? Math.min(voiceCount / 5, 1) * 100 : null;

  // ── Shared activity: recent memories + daily-couple-moments + my Moments. ──
  const sharedCount = recentMemories + dailyMomentsRecent + myMoments.length;
  const sharedActivityScore = sharedCount > 0 ? Math.min(sharedCount / 8, 1) * 100 : null;

  // ── signalsMeta — recency facts for the human "why" of the current mood. ──
  const within = (d, days) => d && new Date(d).getTime() >= now - days * DAY_MS;
  const lastMood = moods.length
    ? [...moods].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;
  // Sleep trend: most-recent night vs the average of the prior nights.
  let sleepImproved = false;
  if (sleepRows.length >= 3) {
    const latest = sleepRows[0]?.quality || 0;
    const priorAvg =
      sleepRows.slice(1).reduce((a, s) => a + (s.quality || 0), 0) / (sleepRows.length - 1);
    sleepImproved = latest > priorAvg + 0.4;
  }
  const signalsMeta = {
    storyToday: myMoments.some((m) => dayKey(m.createdAt) === today),
    storyCount: myMoments.length,
    reactionsReceived,
    recentCall: calls.some((c) => within(c.createdAt, 3)),
    callCount: calls.length,
    voiceRecent: voiceCount > 0,
    journaledRecently: (journalRows || []).some((j) => within(j.createdAt, 3)),
    lastMoodType: lastMood?.moodType || null,
    lastMoodAt: lastMood?.createdAt || null,
    lastMoodRecent: within(lastMood?.createdAt, 2),
    positiveChat: emoji.score != null ? emoji.score >= 60 : false,
    chatActive: sentMessages.length >= 5,
    sleepImproved,
    recentMemories,
  };

  return {
    now,
    moods,
    sentMessages,
    journal: (journalRows || []).map((j) => ({ content: j.content })),
    tempoScore,
    sleepWellbeing,
    storyReactionScore,
    // new emotion signals (each null ⇒ component skipped)
    emojiPositivity: emoji.score,
    replySpeed,
    storyCaptions: storyCaptionScore,
    callConnection: callConnectionScore,
    voiceWarmth: voiceWarmthScore,
    sharedActivity: sharedActivityScore,
    signalsMeta,
  };
};

const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

// Couple memory sources for the Memory engine (timeline assembly).
const gatherMemoryFeatures = async (coupleId, period = "weekly", now = Date.now()) => {
  const days = PERIOD_DAYS[period] || 7;
  const since = new Date(now - days * DAY_MS);

  const [memories, moments, dailyMoments, achievements] = await Promise.all([
    Memory.find({ coupleId, $or: [{ memoryDate: { $gte: since } }, { createdAt: { $gte: since } }] })
      .select("title memoryType memoryDate createdAt photos")
      .catch(() => []),
    Moment.find({ coupleId, createdAt: { $gte: since } }).select("type createdAt caption").catch(() => []),
    DailyCoupleMoment
      ? DailyCoupleMoment.find({ coupleId, createdAt: { $gte: since } }).select("day createdAt").catch(() => [])
      : [],
    Achievement.find({ coupleId, unlockedAt: { $gte: since } }).select("key unlockedAt").catch(() => []),
  ]);

  return { memories, moments, dailyMoments, achievements, period };
};

// ── Relationship Maturity (PER-USER, works in EVERY lifecycle stage). Couple
// signals (messages/partner moods) are simply absent for solo users — those
// dimensions degrade to null and the engine scores what it can observe. ──
const GrowthChallengeModel = optionalModel("../../modules/growth/growth.model");
const CoachConversation = optionalModel("../../modules/coach/coach.model");

const gatherMaturityFeatures = async (userId, now = Date.now()) => {
  const user = await User.findById(userId).select(
    "currentCoupleId privacy growthStreak readinessScore loveLanguage attachmentStyle",
  );
  const coupleId = user?.currentCoupleId || null;
  const since = new Date(now - 30 * DAY_MS);

  let partnerId = null;
  if (coupleId) {
    const couple = await Couple.findById(coupleId).select("partnerOneId partnerTwoId").catch(() => null);
    if (couple) {
      partnerId =
        String(couple.partnerOneId) === String(userId) ? couple.partnerTwoId : couple.partnerOneId;
    }
  }

  const [
    myMoods,
    coupleMessages,
    partnerMoods,
    memories,
    journalRows,
    challengeRows,
    activityDays,
    engagement,
  ] = await Promise.all([
    Mood.find({ userId, createdAt: { $gte: since } })
      .select("moodType intensity visibility createdAt")
      .catch(() => []),
    coupleId
      ? Message.find({ coupleId, createdAt: { $gte: since } }).select("senderId text createdAt").catch(() => [])
      : [],
    partnerId
      ? Mood.find({
          userId: partnerId,
          coupleId,
          visibility: { $ne: "private" },
          createdAt: { $gte: since },
        })
          .select("moodType intensity createdAt")
          .catch(() => [])
      : [],
    coupleId ? Memory.find({ coupleId, createdAt: { $gte: since } }).select("memoryDate createdAt").catch(() => []) : [],
    GrowthJournal
      ? GrowthJournal.GrowthJournal.find({ userId, createdAt: { $gte: since } }).select("day createdAt").catch(() => [])
      : [],
    GrowthChallengeModel
      ? GrowthChallengeModel.GrowthChallenge.find({ userId, createdAt: { $gte: since } }).select("completed day").catch(() => [])
      : [],
    coupleId ? ActivityLog.distinct("day", { userId, coupleId, createdAt: { $gte: since } }).catch(() => []) : [],
    coupleId ? Engagement.findOne({ coupleId }).select("currentStreak").catch(() => null) : null,
  ]);

  // Transparency: share of privacy settings that are partner-visible.
  const privacyObj = user?.privacy ? (user.privacy.toObject ? user.privacy.toObject() : user.privacy) : {};
  const privacyKeys = Object.keys(privacyObj);
  const transparencyPct = privacyKeys.length
    ? (privacyKeys.filter((k) => privacyObj[k] !== "private").length / privacyKeys.length) * 100
    : null;

  const sentMessages = coupleMessages.filter((m) => String(m.senderId) === String(userId));

  return {
    now,
    userId: String(userId),
    hasCouple: Boolean(coupleId),
    myMoods,
    sentMessages,
    coupleMessages,
    partnerMoods,
    memories,
    journalDays: (journalRows || []).map((j) => j.day || dayKey(j.createdAt)),
    challenges: challengeRows || [],
    activityDays: activityDays || [],
    streak: engagement?.currentStreak ?? user?.growthStreak?.current ?? 0,
    transparencyPct,
    quizzesTaken:
      (user?.readinessScore != null ? 1 : 0) +
      (user?.loveLanguage ? 1 : 0) +
      (user?.attachmentStyle ? 1 : 0),
  };
};

// ── Healing & Recovery (PER-USER, Stage 3). Measures ENGAGEMENT with recovery
// activities — never emotional worth. Two mood windows so the engine can see a
// gentle recovery trend without over-reading it. ──
const gatherHealingFeatures = async (userId, now = Date.now()) => {
  const user = await User.findById(userId).select(
    "growthStreak personalXp readinessScore loveLanguage attachmentStyle",
  );
  const since30 = new Date(now - 30 * DAY_MS);
  const since60 = new Date(now - 60 * DAY_MS);

  const endedCouple = await Couple.findOne({
    relationshipStatus: "broken_up",
    $or: [{ partnerOneId: userId }, { partnerTwoId: userId }],
  })
    .sort({ endedAt: -1, updatedAt: -1 })
    .select("endedAt updatedAt")
    .catch(() => null);

  const [moods, journalRows, challengeRows, sleepRows, coachConvos, growthReports] = await Promise.all([
    Mood.find({ userId, createdAt: { $gte: since60 } }).select("moodType intensity createdAt").catch(() => []),
    GrowthJournal
      ? GrowthJournal.GrowthJournal.find({ userId, createdAt: { $gte: since30 } })
          .select("type day content createdAt")
          .catch(() => [])
      : [],
    GrowthChallengeModel
      ? GrowthChallengeModel.GrowthChallenge.find({ userId, createdAt: { $gte: since30 } })
          .select("completed day")
          .catch(() => [])
      : [],
    SleepLog.find({ userId }).sort({ day: -1 }).limit(30).select("hours quality day").catch(() => []),
    CoachConversation
      ? CoachConversation.find({ userId, updatedAt: { $gte: since30 } }).select("messages.role updatedAt").catch(() => [])
      : [],
    safeCount(optionalModel("../../modules/lifecycle/lifecycle.model")?.GrowthReport, { userId }),
  ]);

  const coachMessages = (coachConvos || []).reduce(
    (a, c) => a + (c.messages || []).filter((m) => m.role === "user").length,
    0,
  );

  return {
    now,
    userId: String(userId),
    endedAt: endedCouple?.endedAt || endedCouple?.updatedAt || null,
    moods,
    journal: journalRows || [],
    challenges: challengeRows || [],
    sleepRows: sleepRows || [],
    coachMessages,
    growthReports,
    growthStreak: user?.growthStreak?.current ?? 0,
    quizzesTaken:
      (user?.readinessScore != null ? 1 : 0) +
      (user?.loveLanguage ? 1 : 0) +
      (user?.attachmentStyle ? 1 : 0),
  };
};

// Latest maturity snapshots for a couple's two partners (Love Meter 2.0 input).
// Couple-symmetric: averages whatever exists regardless of which partner asks.
const IntelSnapshot = require("../intelSnapshot.model");
const latestMaturityAvg = async (partnerIds) => {
  try {
    const rows = await Promise.all(
      partnerIds.map((id) =>
        IntelSnapshot.findOne({ subjectId: id, engine: "maturity" })
          .sort({ createdAt: -1 })
          .select("score"),
      ),
    );
    const scores = rows.filter((r) => r && typeof r.score === "number").map((r) => r.score);
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  } catch {
    return null;
  }
};

module.exports = {
  gatherHealthFeatures,
  gatherEmotionFeatures,
  gatherMemoryFeatures,
  gatherMaturityFeatures,
  gatherHealingFeatures,
  latestMaturityAvg,
};
