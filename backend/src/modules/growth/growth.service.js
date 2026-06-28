/**
 * Growth service — business logic for the self-growth track (Stage 1 Preparing
 * + Stage 3 Healing). Owns journal/reflection/gratitude, the deterministic daily
 * challenge, the self-knowledge quizzes, and the daily content (quote, prompts).
 * All solo / user-scoped. Feeds the personal engagement loop.
 */
const User = require("../users/user.model");
const Mood = require("../moods/mood.model");
const { GrowthJournal, GrowthChallenge } = require("./growth.model");
const {
  recordGrowthActivity,
  buildGrowthSummary,
  dayKey,
} = require("./growth.engagement");
const {
  GROWTH_ACTIVITY,
  DAILY_CHALLENGES,
  REFLECTION_PROMPTS,
  GRATITUDE_PROMPTS,
  QUOTES,
  pickForDay,
} = require("./growth.constants");
const {
  READINESS_QUESTIONS,
  scoreReadiness,
  LOVE_LANGUAGE_QUESTIONS,
  LOVE_LANGUAGE_LABELS,
  scoreLoveLanguage,
  ATTACHMENT_QUESTIONS,
  ATTACHMENT_LABELS,
  scoreAttachment,
} = require("./growth.quizzes");

const err = (message, statusCode = 400) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

// Which stage is this solo user in (preparing vs healing)? Used to tag entries.
const soloStage = async (userId) => {
  const { resolveStage } = require("../users/stage.helper");
  const user = await User.findById(userId).select("currentCoupleId");
  const { stage } = await resolveStage(user);
  return stage === "healing" ? "healing" : "preparing";
};

// ── Daily content (deterministic per day) ──
const getDailyContent = (day = dayKey()) => ({
  quote: pickForDay(QUOTES, day, 0),
  reflectionPrompt: pickForDay(REFLECTION_PROMPTS, day, 1),
  gratitudePrompt: pickForDay(GRATITUDE_PROMPTS, day, 2),
});

// ── Summary (for the growth hub + dashboards) ──
const getGrowthSummary = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw err("User not found", 404);
  const summary = buildGrowthSummary(user);

  const day = dayKey();
  const [recentJournal, todayChallenge, reflectionToday, gratitudeToday] =
    await Promise.all([
      GrowthJournal.find({ userId }).sort({ createdAt: -1 }).limit(5),
      GrowthChallenge.findOne({ userId, day }),
      GrowthJournal.exists({ userId, type: "reflection", day }),
      GrowthJournal.exists({ userId, type: "gratitude", day }),
    ]);

  return {
    ...summary,
    daily: getDailyContent(day),
    recentJournal,
    todayChallenge,
    reflectionDoneToday: !!reflectionToday,
    gratitudeDoneToday: !!gratitudeToday,
  };
};

// ── Journal / reflection / gratitude ──
const listJournal = async (userId, type) => {
  const q = { userId };
  if (type) q.type = type;
  return GrowthJournal.find(q).sort({ createdAt: -1 }).limit(100);
};

const getTodayEntry = async (userId, type, day = dayKey()) =>
  GrowthJournal.findOne({ userId, type, day }).sort({ createdAt: -1 });

const addJournal = async (userId, { type = "journal", content, mood, prompt }) => {
  if (!content || !content.trim()) throw err("Write something first", 400);
  const day = dayKey();
  const stage = await soloStage(userId);

  // Reflection + gratitude are daily-prompted: one per day (upsert-like).
  if (type === "reflection" || type === "gratitude") {
    const existing = await GrowthJournal.findOne({ userId, type, day });
    if (existing) {
      existing.content = content.trim();
      if (mood) existing.mood = mood;
      if (prompt) existing.prompt = prompt;
      await existing.save();
      // Editing today's entry: no new XP, but keep the streak alive.
      await recordGrowthActivity(userId, GROWTH_ACTIVITY[type.toUpperCase()], {
        awardXp: false,
      });
      return existing;
    }
  }

  // XP is once per type per day — decide BEFORE the write (the engine no longer
  // self-dedupes). reflection/gratitude reaching here are the first today;
  // free-form journal awards only if none existed earlier today.
  let awardXp = true;
  if (type === "journal") {
    awardXp = !(await GrowthJournal.exists({ userId, type: "journal", day }));
  }

  const entry = await GrowthJournal.create({
    userId,
    type,
    day,
    stage,
    content: content.trim(),
    mood: mood || null,
    prompt: prompt || "",
  });

  const activityType =
    type === "reflection"
      ? GROWTH_ACTIVITY.REFLECTION
      : type === "gratitude"
        ? GROWTH_ACTIVITY.GRATITUDE
        : GROWTH_ACTIVITY.JOURNAL;
  await recordGrowthActivity(userId, activityType, { entryId: entry._id, awardXp });

  return entry;
};

const deleteJournal = async (userId, id) => {
  const entry = await GrowthJournal.findOne({ _id: id, userId });
  if (!entry) throw err("Entry not found", 404);
  await entry.deleteOne();
  return true;
};

// ── Daily Challenge (deterministic pick, one per day) ──
const getTodayChallenge = async (userId) => {
  const day = dayKey();
  let challenge = await GrowthChallenge.findOne({ userId, day });
  if (challenge) return challenge;

  const pick = pickForDay(DAILY_CHALLENGES, day, 3);
  try {
    challenge = await GrowthChallenge.create({
      userId,
      day,
      key: pick.key,
      title: pick.title,
      category: pick.category,
    });
  } catch (e) {
    // Unique race — fetch the winner.
    if (e.code === 11000) {
      challenge = await GrowthChallenge.findOne({ userId, day });
    } else {
      throw e;
    }
  }
  return challenge;
};

const completeChallenge = async (userId) => {
  const challenge = await getTodayChallenge(userId);
  if (challenge.completed) return challenge;
  challenge.completed = true;
  challenge.completedAt = new Date();
  await challenge.save();
  await recordGrowthActivity(userId, GROWTH_ACTIVITY.CHALLENGE, {
    key: challenge.key,
  });
  return challenge;
};

// ── Quizzes ──
const getQuizzes = () => ({
  readiness: READINESS_QUESTIONS,
  loveLanguage: LOVE_LANGUAGE_QUESTIONS,
  attachment: ATTACHMENT_QUESTIONS,
});

const submitReadiness = async (userId, answers) => {
  const score = scoreReadiness(answers || {});
  const user = await User.findByIdAndUpdate(
    userId,
    { readinessScore: score },
    { new: true },
  );
  await recordGrowthActivity(userId, GROWTH_ACTIVITY.QUIZ, { quiz: "readiness" });
  return { readinessScore: score, summary: buildGrowthSummary(user) };
};

const submitLoveLanguage = async (userId, answers) => {
  const value = scoreLoveLanguage(answers || {});
  if (!value) throw err("Answer at least one question", 400);
  const user = await User.findByIdAndUpdate(
    userId,
    { loveLanguage: value },
    { new: true },
  );
  await recordGrowthActivity(userId, GROWTH_ACTIVITY.QUIZ, { quiz: "love_language" });
  return { loveLanguage: value, label: LOVE_LANGUAGE_LABELS[value], summary: buildGrowthSummary(user) };
};

const submitAttachment = async (userId, answers) => {
  const value = scoreAttachment(answers || {});
  if (!value) throw err("Answer at least one question", 400);
  const user = await User.findByIdAndUpdate(
    userId,
    { attachmentStyle: value },
    { new: true },
  );
  await recordGrowthActivity(userId, GROWTH_ACTIVITY.QUIZ, { quiz: "attachment" });
  return { attachmentStyle: value, label: ATTACHMENT_LABELS[value], summary: buildGrowthSummary(user) };
};

// ── Solo mood summary (reuses the Mood collection) ──
const getMoodSummary = async (userId) => {
  const moods = await Mood.find({ userId }).sort({ createdAt: -1 }).limit(30);
  const counts = {};
  let intensitySum = 0;
  moods.forEach((m) => {
    counts[m.moodType] = (counts[m.moodType] || 0) + 1;
    intensitySum += m.intensity || 0;
  });
  const dominant =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return {
    total: moods.length,
    dominant,
    counts,
    averageIntensity: moods.length ? Math.round((intensitySum / moods.length) * 10) / 10 : 0,
    recent: moods.slice(0, 5),
  };
};

module.exports = {
  getDailyContent,
  getGrowthSummary,
  listJournal,
  getTodayEntry,
  addJournal,
  deleteJournal,
  getTodayChallenge,
  completeChallenge,
  getQuizzes,
  submitReadiness,
  submitLoveLanguage,
  submitAttachment,
  getMoodSummary,
};
