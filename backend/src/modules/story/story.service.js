/**
 * Story Timeline — assembles the couple's relationship into ordered "chapters"
 * by COMBINING existing data (no duplication): the relationship start, memories,
 * days-together milestones, completed bucket-list goals, saved love letters, and
 * unlocked achievements — plus any custom chapters the partners add.
 */
const StoryChapter = require("./story.model");
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Memory = require("../memories/memory.model");
const BucketItem = require("../bucket/bucket.model");
const LoveLetter = require("../letters/letter.model");
const AchievementModel = require("../engagement/achievement.model");
const { ACHIEVEMENT_MAP } = require("../engagement/achievements.catalog");
const { getRelationshipStart, getDaysTogether } = require("../couples/couple.helpers");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getCouple = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) throw createError("No active relationship", 400);
  const couple = await Couple.findById(user.currentCoupleId);
  if (!couple) throw createError("Couple not found", 404);
  return couple;
};

const MEMORY_EMOJI = {
  date: "💕",
  trip: "✈️",
  birthday: "🎂",
  anniversary: "💍",
  proposal: "💎",
  gift: "🎁",
  milestone: "🏆",
  other: "📸",
};

// Days-together milestones that become chapters once reached.
const DAY_MILESTONES = [
  { days: 30, title: "One Month Together", emoji: "🌱" },
  { days: 100, title: "100 Days Together", emoji: "💯" },
  { days: 180, title: "Six Months Together", emoji: "🌸" },
  { days: 365, title: "One Year Together", emoji: "🎉" },
  { days: 730, title: "Two Years Together", emoji: "💞" },
  { days: 1095, title: "Three Years Together", emoji: "👑" },
  { days: 1825, title: "Five Years Together", emoji: "🏆" },
];

const LETTER_EMOJI = {
  romantic: "❤️",
  apology: "🕊️",
  appreciation: "🙏",
  motivation: "💪",
  anniversary: "💍",
  birthday: "🎂",
  surprise: "🎁",
};

const getChapters = async (userId) => {
  const couple = await getCouple(userId);
  const coupleId = couple._id;

  const [memories, bucket, letters, achievements, custom] = await Promise.all([
    Memory.find({ coupleId }).select("title description memoryType memoryDate"),
    BucketItem.find({ coupleId, completed: true }).select("title completedAt category"),
    LoveLetter.find({ coupleId }).select("type createdAt"),
    AchievementModel.find({ coupleId }).select("key unlockedAt"),
    StoryChapter.find({ coupleId }),
  ]);

  const chapters = [];

  // 1. The beginning.
  const start = getRelationshipStart(couple);
  if (start) {
    chapters.push({
      id: "start",
      kind: "start",
      title: "Where It All Began",
      description: "The day your journey together started.",
      emoji: "💗",
      date: new Date(start).toISOString(),
      custom: false,
    });
  }

  // 2. Memories.
  for (const m of memories) {
    chapters.push({
      id: `mem_${m._id}`,
      kind: "memory",
      title: m.title,
      description: m.description || "",
      emoji: MEMORY_EMOJI[m.memoryType] || "📸",
      date: new Date(m.memoryDate).toISOString(),
      custom: false,
    });
  }

  // 3. Days-together milestones already reached.
  const daysTogether = getDaysTogether(couple);
  if (start) {
    for (const ms of DAY_MILESTONES) {
      if (daysTogether >= ms.days) {
        const d = new Date(new Date(start).getTime() + ms.days * 86400000);
        chapters.push({
          id: `ms_${ms.days}`,
          kind: "milestone",
          title: ms.title,
          description: "A milestone worth celebrating.",
          emoji: ms.emoji,
          date: d.toISOString(),
          custom: false,
        });
      }
    }
  }

  // 4. Completed bucket-list goals.
  for (const b of bucket) {
    chapters.push({
      id: `bucket_${b._id}`,
      kind: "bucket",
      title: `Completed: ${b.title}`,
      description: "A shared dream, achieved together. 🎯",
      emoji: "✅",
      date: new Date(b.completedAt || b.updatedAt || Date.now()).toISOString(),
      custom: false,
    });
  }

  // 5. Saved love letters.
  for (const l of letters) {
    chapters.push({
      id: `letter_${l._id}`,
      kind: "letter",
      title: `A ${l.type} letter`,
      description: "Words from the heart. 💌",
      emoji: LETTER_EMOJI[l.type] || "💌",
      date: new Date(l.createdAt).toISOString(),
      custom: false,
    });
  }

  // 6. Unlocked achievements.
  for (const a of achievements) {
    const def = ACHIEVEMENT_MAP[a.key];
    if (!def) continue;
    chapters.push({
      id: `ach_${a.key}`,
      kind: "achievement",
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      date: new Date(a.unlockedAt).toISOString(),
      custom: false,
    });
  }

  // 7. Custom chapters.
  for (const c of custom) {
    chapters.push({
      id: String(c._id),
      kind: "custom",
      title: c.title,
      description: c.description || "",
      emoji: c.emoji || "📖",
      date: new Date(c.date).toISOString(),
      custom: true,
    });
  }

  // Order oldest -> newest and number them.
  chapters.sort((a, b) => new Date(a.date) - new Date(b.date));
  return chapters.map((c, i) => ({ ...c, chapter: i + 1 }));
};

const addChapter = async (userId, data) => {
  const couple = await getCouple(userId);
  if (!data.title?.trim()) throw createError("Title is required", 400);

  const chapter = await StoryChapter.create({
    coupleId: couple._id,
    createdBy: userId,
    title: data.title.trim(),
    description: data.description || "",
    emoji: data.emoji || "📖",
    date: data.date ? new Date(data.date) : new Date(),
  });

  await recordActivity(couple._id, userId, ACTIVITY_TYPES.STORY_CHAPTER, {
    chapterId: chapter._id,
  });

  return chapter;
};

const updateChapter = async (userId, id, data) => {
  const couple = await getCouple(userId);
  const chapter = await StoryChapter.findOne({ _id: id, coupleId: couple._id });
  if (!chapter) throw createError("Chapter not found", 404);

  ["title", "description", "emoji"].forEach((f) => {
    if (data[f] !== undefined) chapter[f] = data[f];
  });
  if (data.date !== undefined) chapter.date = new Date(data.date);

  await chapter.save();
  return chapter;
};

const deleteChapter = async (userId, id) => {
  const couple = await getCouple(userId);
  const chapter = await StoryChapter.findOne({ _id: id, coupleId: couple._id });
  if (!chapter) throw createError("Chapter not found", 404);
  await chapter.deleteOne();
  return true;
};

module.exports = { getChapters, addChapter, updateChapter, deleteChapter };
