/**
 * Personal context assembler for SOLO AI features (Preparation Coach, Recovery
 * Coach, daily tip). The couple context builder (ai.context.js) throws without a
 * couple, so partner-less stages use this instead. Gathers a compact, token-
 * conscious snapshot of the individual.
 */
const User = require("../users/user.model");
const Mood = require("../moods/mood.model");
const { GrowthJournal } = require("../growth/growth.model");
const { LOVE_LANGUAGE_LABELS, ATTACHMENT_LABELS } = require("../growth/growth.quizzes");

const firstName = (n) => n?.split(" ")[0] || "there";
const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const buildPersonalContext = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const e = new Error("User not found");
    e.statusCode = 404;
    throw e;
  }

  const [moods, journal] = await Promise.all([
    Mood.find({ userId }).sort({ createdAt: -1 }).limit(8).select("moodType createdAt"),
    GrowthJournal.find({ userId }).sort({ createdAt: -1 }).limit(4).select("type content"),
  ]);

  return {
    user,
    name: firstName(user.name),
    moods,
    journal,
    readinessScore: user.readinessScore,
    loveLanguage: user.loveLanguage,
    attachmentStyle: user.attachmentStyle,
    growthStreak: user.growthStreak?.current || 0,
  };
};

const formatPersonalContext = (ctx) => {
  const lines = [];
  lines.push(`Person: ${ctx.name}`);
  if (ctx.user?.bio) lines.push(`Bio: ${ctx.user.bio}`);

  const hobbies = asList(ctx.user?.hobbies);
  if (hobbies.length) lines.push(`Hobbies: ${hobbies.join(", ")}`);

  if (ctx.readinessScore != null) lines.push(`Readiness score: ${ctx.readinessScore}/100`);
  if (ctx.loveLanguage) lines.push(`Love language: ${LOVE_LANGUAGE_LABELS[ctx.loveLanguage] || ctx.loveLanguage}`);
  if (ctx.attachmentStyle) lines.push(`Attachment style: ${ATTACHMENT_LABELS[ctx.attachmentStyle] || ctx.attachmentStyle}`);
  if (ctx.growthStreak) lines.push(`Growth streak: ${ctx.growthStreak} day(s)`);

  const moodNames = ctx.moods?.length ? ctx.moods.map((m) => m.moodType).join(", ") : "none logged";
  lines.push(`Recent moods: ${moodNames}`);

  if (ctx.journal?.length) {
    lines.push(`Recent journaling themes: ${ctx.journal.map((j) => j.content.slice(0, 60)).join(" | ")}`);
  }

  return lines.join("\n");
};

module.exports = { buildPersonalContext, formatPersonalContext, firstName };
