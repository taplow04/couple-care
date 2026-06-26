/**
 * Profile aggregator — READ-ONLY. Assembles the Personal Profile, Partner
 * Profile, CoupleCare Journey count, Relationship Profile, Trust Center and
 * Relationship Passport entirely from data that already exists elsewhere
 * (engagement, health, moods/memories/messages, gallery). It never writes and
 * never duplicates state.
 */
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Message = require("../chat/message.model");
const Mood = require("../moods/mood.model");
const Memory = require("../memories/memory.model");
const { getDaysTogether, getRelationshipStart } = require("../couples/couple.helpers");
const { getCachedHealth } = require("../couples/health.service");
const { getEngagementForUser } = require("../engagement/engagement.service");
const { getMoodAnalytics } = require("../moods/mood.service");
const galleryService = require("../gallery/gallery.service");
const { canPartnerView, transparencyLabel } = require("../users/privacy.helper");

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// ─── badge helpers (deterministic) ───────────────────────────────────────────

// Relationship level → friendly badge (mirrors the engagement level curve).
const LEVEL_BADGES = {
  1: { label: "New Spark", emoji: "✨" },
  2: { label: "Growing", emoji: "🌱" },
  3: { label: "Strong Bond", emoji: "💪" },
  4: { label: "Committed", emoji: "💞" },
  5: { label: "Power Couple", emoji: "👑" },
};
const levelBadge = (level) => LEVEL_BADGES[Math.min(level || 1, 5)] || LEVEL_BADGES[1];

// Couple health → trust badge tier.
const trustBadge = (score) => {
  if (score == null) return { label: "Unrated", emoji: "🤍", tier: "none" };
  if (score >= 85) return { label: "Platinum Trust", emoji: "💎", tier: "platinum" };
  if (score >= 70) return { label: "Gold Trust", emoji: "🥇", tier: "gold" };
  if (score >= 50) return { label: "Silver Trust", emoji: "🥈", tier: "silver" };
  return { label: "Bronze Trust", emoji: "🥉", tier: "bronze" };
};

// ─── CoupleCare Journey count (no details ever exposed) ──────────────────────

const getJourneyCounts = async (userId, currentCoupleId) => {
  const couples = await Couple.find({
    $or: [{ partnerOneId: userId }, { partnerTwoId: userId }],
  }).select("_id relationshipStatus");

  const total = couples.length;
  const previous = couples.filter(
    (c) => String(c._id) !== String(currentCoupleId || ""),
  ).length;

  return { total, previous, hasCurrent: Boolean(currentCoupleId) };
};

// ─── shared loaders ──────────────────────────────────────────────────────────

const loadCoupleContext = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.currentCoupleId) throw new Error("No active relationship");

  const couple = await Couple.findById(user.currentCoupleId);
  if (!couple) throw new Error("Couple not found");

  const partnerId =
    couple.partnerOneId.toString() === userId.toString()
      ? couple.partnerTwoId
      : couple.partnerOneId;

  return { user, couple, partnerId };
};

// Couple health + engagement + love meter — the trio reused by most surfaces.
const computeLoveMeter = (healthScore, streak) =>
  healthScore == null
    ? null
    : clamp(healthScore * 0.9 + Math.min(streak || 0, 30) * 0.4);

const loadCoreMetrics = async (userId, coupleId, couple) => {
  let health = null;
  try {
    const { score, level } = await getCachedHealth(coupleId);
    health = { score, level };
  } catch {
    /* health optional */
  }

  let engagement = null;
  try {
    engagement = await getEngagementForUser(userId);
  } catch {
    /* engagement optional */
  }

  const loveMeter = computeLoveMeter(
    health?.score ?? null,
    engagement?.currentStreak ?? 0,
  );
  const daysTogether = getDaysTogether(couple);

  return { health, engagement, loveMeter, daysTogether };
};

// ─── 1. Personal Profile (owner viewing their own) ───────────────────────────

const getPersonalProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const [stats, journey] = await Promise.all([
    galleryService.getStats(userId),
    getJourneyCounts(userId, user.currentCoupleId),
  ]);

  let engagement = null;
  let health = null;
  let daysTogether = 0;
  let relationshipStatus = "single";

  if (user.currentCoupleId) {
    const couple = await Couple.findById(user.currentCoupleId);
    if (couple) {
      relationshipStatus = couple.relationshipStatus;
      daysTogether = getDaysTogether(couple);
      const core = await loadCoreMetrics(userId, couple._id, couple);
      engagement = core.engagement;
      health = core.health;
    }
  }

  const level = engagement?.level ?? 1;

  return {
    user: {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePhoto: user.profilePhoto,
      coverPhoto: user.coverPhoto,
      birthday: user.birthday,
      hobbies: user.hobbies,
      likes: user.likes,
      dislikes: user.dislikes,
      emailVerified: user.emailVerified,
      joinedDate: user.createdAt,
    },
    relationship: {
      status: relationshipStatus,
      daysTogether,
      level,
      badge: levelBadge(level),
      trustBadge: trustBadge(health?.score ?? null),
    },
    stats: {
      photos: stats.photos,
      videos: stats.videos,
      achievements: engagement?.achievementsUnlocked ?? 0,
      relationshipJourney: daysTogether,
      coupleCareJourney: journey.total,
    },
    journey: {
      current: journey.hasCurrent,
      previous: journey.previous,
      total: journey.total,
    },
    health,
    xp: engagement
      ? {
          totalXP: engagement.totalXP,
          level: engagement.level,
          levelProgress: engagement.levelProgress,
        }
      : null,
  };
};

// ─── 2. Partner Profile (privacy-aware) ──────────────────────────────────────

const getPartnerProfile = async (viewerId) => {
  const { couple, partnerId } = await loadCoupleContext(viewerId);
  if (!partnerId) throw new Error("Partner has not joined yet");

  const partner = await User.findById(partnerId).select(
    "name username profilePhoto coverPhoto bio hobbies likes dislikes birthday privacy createdAt",
  );
  if (!partner) throw new Error("Partner not found");

  const p = partner.privacy || {};
  const core = await loadCoreMetrics(viewerId, couple._id, couple);

  // Gallery (partner's personal items, gated by their gallery/video privacy).
  const gallery = await galleryService.listPartnerPersonal(partnerId);

  // Mood summary (gated by moodVisibility) + recent activity (activityVisibility).
  let moodSummary = null;
  let recentMoods = [];
  if (canPartnerView(p.moodVisibility)) {
    const analytics = await getMoodAnalytics(partnerId);
    const counts = { ...analytics };
    delete counts.averageIntensity;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    moodSummary = {
      dominant: sorted[0]?.[1] > 0 ? sorted[0][0] : null,
      averageIntensity: analytics.averageIntensity,
      counts,
    };
    if (canPartnerView(p.activityVisibility)) {
      recentMoods = await Mood.find({
        userId: partnerId,
        visibility: { $ne: "private" },
      })
        .sort({ createdAt: -1 })
        .limit(5);
    }
  }

  // Journey count (gated).
  let journey = null;
  if (canPartnerView(p.journeyCountVisibility)) {
    const j = await getJourneyCounts(partnerId, couple._id);
    journey = { previous: j.previous, total: j.total };
  }

  // Trust + AI badges (gated by transparency / ai visibility).
  const showTrust = canPartnerView(p.transparencyVisibility);
  const showAi = canPartnerView(p.aiVisibility);

  return {
    partner: {
      _id: partner._id,
      name: partner.name,
      username: partner.username,
      profilePhoto: partner.profilePhoto,
      coverPhoto: partner.coverPhoto,
      bio: canPartnerView(p.bioVisibility) ? partner.bio : null,
      hobbies: partner.hobbies,
      likes: partner.likes,
      dislikes: partner.dislikes,
      birthday: canPartnerView(p.birthdayVisibility) ? partner.birthday : null,
      joinedDate: partner.createdAt,
    },
    relationship: {
      status: couple.relationshipStatus,
      startDate: getRelationshipStart(couple),
      daysTogether: core.daysTogether,
      level: core.engagement?.level ?? 1,
      badge: levelBadge(core.engagement?.level ?? 1),
    },
    gallery: gallery.hidden ? { hidden: true, items: [] } : { hidden: false, items: gallery.items },
    achievements: core.engagement?.achievements?.filter((a) => a.unlocked) ?? [],
    journey, // null when hidden
    trustBadge: showTrust ? trustBadge(core.health?.score ?? null) : null,
    aiBadges: showAi ? deriveAiBadges(core) : null,
    moodSummary,
    recentMoods,
    stats: {
      memoryCount: await Memory.countDocuments({ coupleId: couple._id }),
      chatMessageCount: await Message.countDocuments({ coupleId: couple._id }),
    },
  };
};

// AI-flavoured badges derived deterministically from couple metrics (no LLM).
const deriveAiBadges = (core) => {
  const badges = [];
  const streak = core.engagement?.currentStreak ?? 0;
  const health = core.health?.score ?? 0;
  if (streak >= 7) badges.push({ label: "Consistent", emoji: "📆" });
  if (health >= 75) badges.push({ label: "Thriving", emoji: "🌟" });
  if ((core.engagement?.achievementsUnlocked ?? 0) >= 5)
    badges.push({ label: "Achiever", emoji: "🏆" });
  if (core.daysTogether >= 365) badges.push({ label: "Devoted", emoji: "💍" });
  return badges;
};

// ─── 3. CoupleCare Journey ───────────────────────────────────────────────────

const getJourney = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const journey = await getJourneyCounts(userId, user.currentCoupleId);

  let level = 1;
  let health = null;
  let xp = 0;
  let achievements = 0;
  let daysTogether = 0;

  if (user.currentCoupleId) {
    const couple = await Couple.findById(user.currentCoupleId);
    if (couple) {
      daysTogether = getDaysTogether(couple);
      const core = await loadCoreMetrics(userId, couple._id, couple);
      level = core.engagement?.level ?? 1;
      health = core.health?.score ?? null;
      xp = core.engagement?.totalXP ?? 0;
      achievements = core.engagement?.achievementsUnlocked ?? 0;
    }
  }

  const daysOnCoupleCare = Math.max(
    0,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000),
  );

  return {
    currentRelationship: journey.hasCurrent,
    previousJourneys: journey.previous,
    totalJourneys: journey.total,
    memberSince: user.createdAt,
    daysOnCoupleCare,
    daysTogether,
    level,
    badge: levelBadge(level),
    trustBadge: trustBadge(health),
    relationshipHealth: health,
    relationshipXP: xp,
    achievements,
  };
};

// ─── 4. Relationship Profile (shared) ────────────────────────────────────────

const getRelationshipProfile = async (userId) => {
  const { couple } = await loadCoupleContext(userId);
  const core = await loadCoreMetrics(userId, couple._id, couple);

  return {
    couple: {
      _id: couple._id,
      coverPhoto: couple.coverPhoto,
      relationshipPhoto: couple.relationshipPhoto,
      status: couple.relationshipStatus,
      startDate: getRelationshipStart(couple),
    },
    daysTogether: core.daysTogether,
    loveMeter: core.loveMeter,
    health: core.health,
    level: core.engagement?.level ?? 1,
    badge: levelBadge(core.engagement?.level ?? 1),
    xp: core.engagement
      ? {
          totalXP: core.engagement.totalXP,
          xpThisWeek: core.engagement.xpThisWeek,
          levelProgress: core.engagement.levelProgress,
          nextLevelXp: core.engagement.nextLevelXp,
        }
      : null,
    streak: {
      current: core.engagement?.currentStreak ?? 0,
      longest: core.engagement?.longestStreak ?? 0,
    },
    achievements: {
      unlocked: core.engagement?.achievementsUnlocked ?? 0,
      total: core.engagement?.achievementsTotal ?? 0,
    },
  };
};

// ─── 5. Trust Center (deterministic, CoupleCare-only) ────────────────────────

const getTrustCenter = async (userId) => {
  const { user, couple, partnerId } = await loadCoupleContext(userId);
  const core = await loadCoreMetrics(userId, couple._id, couple);

  // Communication: chat volume + two-sided balance (both partners talking).
  const [myMsgs, partnerMsgs] = await Promise.all([
    Message.countDocuments({ coupleId: couple._id, senderId: userId }),
    partnerId
      ? Message.countDocuments({ coupleId: couple._id, senderId: partnerId })
      : Promise.resolve(0),
  ]);
  const totalMsgs = myMsgs + partnerMsgs;
  const volumeScore = clamp((totalMsgs / 200) * 60); // 200 msgs ≈ 60 pts
  const balance =
    totalMsgs === 0 ? 0 : 1 - Math.abs(myMsgs - partnerMsgs) / totalMsgs; // 0..1
  const communicationScore = clamp(volumeScore + balance * 40);

  // Participation: how mutual today + lifetime engagement breadth.
  const streak = core.engagement?.currentStreak ?? 0;
  const participationScore = clamp(
    Math.min(streak, 14) * 4 + (core.engagement?.bothActiveToday ? 20 : 0) + 24,
  );

  // Consistency: streak longevity vs days together.
  const longest = core.engagement?.longestStreak ?? 0;
  const consistencyScore = clamp(Math.min(longest, 30) * 3 + (streak > 0 ? 10 : 0));

  // Transparency level: share of partner-visible privacy settings.
  const p = user.privacy || {};
  const keys = Object.keys(p.toObject ? p.toObject() : p);
  const visible = keys.filter((k) => p[k] !== "private").length;
  const transparencyPct = keys.length ? clamp((visible / keys.length) * 100) : 0;
  const transparencyLevel =
    transparencyPct >= 80 ? "High" : transparencyPct >= 50 ? "Medium" : "Low";

  // Activity summary (lifetime CoupleCare activity only).
  const [memoryCount] = await Promise.all([
    Memory.countDocuments({ coupleId: couple._id }),
  ]);

  return {
    scores: {
      communication: communicationScore,
      participation: participationScore,
      consistency: consistencyScore,
      relationshipHealth: core.health?.score ?? null,
    },
    activitySummary: {
      messages: totalMsgs,
      messagesByYou: myMsgs,
      messagesByPartner: partnerMsgs,
      memories: memoryCount,
      currentStreak: streak,
      longestStreak: longest,
      daysTogether: core.daysTogether,
      achievements: core.engagement?.achievementsUnlocked ?? 0,
    },
    sharedProgress: {
      level: core.engagement?.level ?? 1,
      xp: core.engagement?.totalXP ?? 0,
      loveMeter: core.loveMeter,
    },
    transparency: {
      level: transparencyLevel,
      percent: transparencyPct,
      label: transparencyLabel(p.transparencyVisibility),
    },
    trustBadge: trustBadge(core.health?.score ?? null),
    aiInsight: buildTrustInsight(communicationScore, participationScore, core),
  };
};

// One deterministic insight line (no LLM — keeps it identical + free).
const buildTrustInsight = (comm, part, core) => {
  if ((core.health?.score ?? 0) >= 80)
    return "Your relationship is thriving — communication and trust are strong. Keep nurturing it. 💛";
  if (comm < 40)
    return "Try checking in with each other more often — small daily messages build big trust.";
  if (part < 40)
    return "More shared activity will lift your participation score. Log a mood or plan something together.";
  return "You're building healthy habits together. Stay consistent and keep showing up for each other.";
};

// ─── 6. Relationship Passport ────────────────────────────────────────────────

const getPassport = async (userId) => {
  const { user, couple } = await loadCoupleContext(userId);
  const core = await loadCoreMetrics(userId, couple._id, couple);
  const journey = await getJourneyCounts(userId, couple._id);

  // Journey chapters: reuse the Story assembler (start + memories + milestones…).
  let chapters = 0;
  try {
    const { getChapters } = require("../story/story.service");
    const list = await getChapters(userId);
    chapters = Array.isArray(list) ? list.length : 0;
  } catch {
    /* chapters optional */
  }

  const level = core.engagement?.level ?? 1;

  return {
    memberSince: user.createdAt,
    currentRelationship: journey.hasCurrent,
    previousJourneys: journey.previous,
    daysTogether: core.daysTogether,
    level,
    badge: levelBadge(level),
    trustBadge: trustBadge(core.health?.score ?? null),
    relationshipHealth: core.health?.score ?? null,
    loveMeter: core.loveMeter,
    relationshipXP: core.engagement?.totalXP ?? 0,
    journeyChapters: chapters,
    achievements: {
      unlocked: core.engagement?.achievementsUnlocked ?? 0,
      total: core.engagement?.achievementsTotal ?? 0,
    },
    coverPhoto: couple.coverPhoto,
    relationshipPhoto: couple.relationshipPhoto,
  };
};

module.exports = {
  getPersonalProfile,
  getPartnerProfile,
  getJourney,
  getRelationshipProfile,
  getTrustCenter,
  getPassport,
};
