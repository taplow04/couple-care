/**
 * Shared relationship-context assembler for AI features (Love Letters, AI Coach,
 * Surprise Box, Sleep analysis). Gathers a compact, token-conscious snapshot of
 * the couple — partner profile, days together, health, recent moods (both
 * partners), memories, and bucket list — so every AI surface reasons about the
 * SAME rich context. Reuses the existing models/helpers; no duplicate logic.
 */
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Mood = require("../moods/mood.model");
const Memory = require("../memories/memory.model");
const BucketItem = require("../bucket/bucket.model");
const { getDaysTogether } = require("../couples/couple.helpers");
const { getCoupleHealthForUser } = require("../couples/health.service");

const firstName = (n) => n?.split(" ")[0] || "your partner";
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const noRelationship = () => {
  const e = new Error("No active relationship");
  e.statusCode = 400;
  return e;
};

const buildRelationshipContext = async (userId) => {
  const user = await User.findById(userId);
  if (!user?.currentCoupleId) throw noRelationship();

  const couple = await Couple.findById(user.currentCoupleId);
  if (!couple) throw noRelationship();

  const partnerId =
    String(couple.partnerOneId) === String(userId)
      ? couple.partnerTwoId
      : couple.partnerOneId;

  const [partner, myMoods, partnerMoods, memories, bucket] = await Promise.all([
    partnerId
      ? User.findById(partnerId).select("name bio hobbies likes dislikes birthday")
      : null,
    Mood.find({ userId }).sort({ createdAt: -1 }).limit(10).select("moodType createdAt"),
    partnerId
      ? Mood.find({ userId: partnerId }).sort({ createdAt: -1 }).limit(10).select("moodType createdAt")
      : [],
    Memory.find({ coupleId: couple._id }).sort({ memoryDate: -1 }).limit(8).select("title memoryType"),
    BucketItem.find({ coupleId: couple._id }).limit(15).select("title completed"),
  ]);

  let health = null;
  try {
    health = await getCoupleHealthForUser(userId);
  } catch {
    /* health optional */
  }

  return {
    user,
    partner,
    couple,
    daysTogether: getDaysTogether(couple),
    myMoods,
    partnerMoods,
    memories,
    bucket,
    health,
    authorName: firstName(user?.name),
    partnerName: firstName(partner?.name),
  };
};

// Compact textual block for prompt injection (kept short to control tokens).
const formatContext = (ctx) => {
  const lines = [];
  lines.push(`Author (the one writing/asking): ${ctx.authorName}`);
  lines.push(`Partner: ${ctx.partnerName}`);
  lines.push(`Days together: ${ctx.daysTogether}`);
  if (ctx.health) lines.push(`Relationship health: ${ctx.health.score}/100 (${ctx.health.level})`);
  if (ctx.partner?.bio) lines.push(`Partner bio: ${ctx.partner.bio}`);

  const hobbies = asList(ctx.partner?.hobbies);
  const likes = asList(ctx.partner?.likes);
  const dislikes = asList(ctx.partner?.dislikes);
  if (hobbies.length) lines.push(`Partner hobbies: ${hobbies.join(", ")}`);
  if (likes.length) lines.push(`Partner likes: ${likes.join(", ")}`);
  if (dislikes.length) lines.push(`Partner dislikes: ${dislikes.join(", ")}`);

  const moodNames = (m) => (m.length ? m.map((x) => x.moodType).join(", ") : "none logged");
  lines.push(`Author recent moods: ${moodNames(ctx.myMoods)}`);
  lines.push(`Partner recent moods: ${moodNames(ctx.partnerMoods)}`);

  if (ctx.memories?.length) {
    lines.push(`Shared memories: ${ctx.memories.map((m) => m.title).join("; ")}`);
  }
  const done = ctx.bucket?.filter((b) => b.completed).map((b) => b.title) || [];
  const dreams = ctx.bucket?.filter((b) => !b.completed).map((b) => b.title) || [];
  if (done.length) lines.push(`Bucket-list achieved: ${done.join("; ")}`);
  if (dreams.length) lines.push(`Bucket-list dreams: ${dreams.join("; ")}`);

  return lines.join("\n");
};

module.exports = { buildRelationshipContext, formatContext, firstName };
