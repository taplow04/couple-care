/**
 * Relationship Summary — computed ONCE when a relationship ends and kept forever
 * (archive-in-place on the Couple doc). Pure, deterministic aggregation over the
 * existing collections + a short (≤80 word) AI reflection generated in the
 * background. Best-effort: must never throw back into the unmatch path.
 */
const mongoose = require("mongoose");
const Couple = require("../couples/couple.model");
const User = require("../users/user.model");
const Message = require("../chat/message.model");
const Memory = require("../memories/memory.model");
const Mood = require("../moods/mood.model");
const BucketItem = require("../bucket/bucket.model");
const Moment = require("../moments/moment.model");
const GalleryItem = require("../gallery/gallery.model");
const Achievement = require("../engagement/achievement.model");
const Engagement = require("../engagement/engagement.model");
const ActivityLog = require("../engagement/activityLog.model");
const StoryChapter = require("../story/story.model");
const { getRelationshipStart } = require("../couples/couple.helpers");

const partnerIdsOf = (couple) =>
  [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);

const monthLabel = (ym) => {
  // ym = "YYYY-MM"
  if (!ym) return null;
  const [y, m] = ym.split("-");
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

const computeStats = async (couple) => {
  const coupleId = couple._id;
  const ids = partnerIdsOf(couple);

  const [
    messageCount,
    memoryDocs,
    bucketCompleted,
    momentDocs,
    galleryDocs,
    achievementCount,
    engagement,
    storyChapters,
    moodAgg,
    monthAgg,
  ] = await Promise.all([
    Message.countDocuments({ coupleId }),
    Memory.find({ coupleId }).sort({ memoryDate: -1 }).select("title memoryType memoryDate photos"),
    BucketItem.countDocuments({ coupleId, completed: true }),
    Moment.find({ coupleId }).select("type"),
    GalleryItem.find({ coupleId, scope: "relationship" }).select("type"),
    Achievement.countDocuments({ coupleId }),
    Engagement.findOne({ coupleId }).select("longestStreak totalXP level"),
    StoryChapter.countDocuments({ coupleId }),
    Mood.aggregate([
      { $match: { userId: { $in: ids.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
      { $group: { _id: "$moodType", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    ActivityLog.aggregate([
      { $match: { coupleId: new mongoose.Types.ObjectId(String(coupleId)) } },
      { $group: { _id: { $substr: ["$day", 0, 7] }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 1 },
    ]),
  ]);

  const photosShared =
    momentDocs.filter((m) => m.type === "photo").length +
    galleryDocs.filter((g) => g.type === "image").length;
  const videosShared =
    momentDocs.filter((m) => m.type === "video").length +
    galleryDocs.filter((g) => g.type === "video").length;

  const favoriteMemory =
    memoryDocs.find((m) => Array.isArray(m.photos) && m.photos.length)?.title ||
    memoryDocs[0]?.title ||
    null;

  const moodTrend = moodAgg.map((m) => ({ mood: m._id, count: m.n }));
  const topMood = moodAgg[0]?._id || null;

  const start = getRelationshipStart(couple);
  const end = couple.endedAt || new Date();
  const durationDays = start
    ? Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
    : 0;

  return {
    startDate: start,
    endDate: end,
    durationDays,
    messagesExchanged: messageCount,
    photosShared,
    videosShared,
    momentsShared: momentDocs.length,
    storyChapters,
    bucketGoalsCompleted: bucketCompleted,
    achievementsEarned: achievementCount,
    longestStreak: engagement?.longestStreak || 0,
    relationshipXp: engagement?.totalXP || 0,
    averageLoveMeter: couple.healthScore ?? null,
    memoriesCount: memoryDocs.length,
    favoriteMemory,
    topMood,
    moodTrend,
    mostActiveMonth: monthLabel(monthAgg[0]?._id) || null,
  };
};

/**
 * Compute + persist the permanent summary for an ended couple, then kick off the
 * background AI reflection. Idempotent-ish: re-running refreshes the stats but
 * won't duplicate. Never throws.
 */
const computeRelationshipSummary = async (coupleId) => {
  try {
    const couple = await Couple.findById(coupleId);
    if (!couple) return null;

    if (!couple.endedAt) couple.endedAt = new Date();
    const stats = await computeStats(couple);
    couple.summary = stats;
    couple.summaryFinalized = true;
    if (couple.aiReflection?.status !== "ready") {
      couple.aiReflection = { text: "", status: "pending", generatedAt: null };
    }
    await couple.save();

    // Background AI reflection (best-effort; deterministic fallback inside).
    generateReflectionInBackground(coupleId, stats).catch(() => {});

    return stats;
  } catch (e) {
    console.error("[lifecycle] computeRelationshipSummary failed:", e.message);
    return null;
  }
};

const generateReflectionInBackground = async (coupleId, stats) => {
  const { generateRelationshipReflection } = require("./lifecycle.ai");
  try {
    const couple = await Couple.findById(coupleId);
    if (!couple) return;
    const [p1, p2] = await Promise.all([
      couple.partnerOneId ? User.findById(couple.partnerOneId).select("name") : null,
      couple.partnerTwoId ? User.findById(couple.partnerTwoId).select("name") : null,
    ]);
    const text = await generateRelationshipReflection({
      stats,
      partnerOne: p1?.name?.split(" ")[0] || "one partner",
      partnerTwo: p2?.name?.split(" ")[0] || "the other",
    });
    couple.aiReflection = { text, status: "ready", generatedAt: new Date() };
    await couple.save();
  } catch (e) {
    console.error("[lifecycle] reflection generation failed:", e.message);
    try {
      await Couple.findByIdAndUpdate(coupleId, {
        "aiReflection.status": "failed",
      });
    } catch {
      /* ignore */
    }
  }
};

module.exports = { computeRelationshipSummary, computeStats };
