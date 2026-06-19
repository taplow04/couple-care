const SleepLog = require("./sleep.model");
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const { buildSleepAnalysisPrompt } = require("../ai/ai.prompts");
const { generateAIResponse } = require("../ai/ai.engine");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

const getContext = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId name");
  if (!user?.currentCoupleId) throw createError("No active relationship", 400);
  const couple = await Couple.findById(user.currentCoupleId).select(
    "partnerOneId partnerTwoId",
  );
  const partnerId =
    String(couple.partnerOneId) === String(userId)
      ? couple.partnerTwoId
      : couple.partnerOneId;
  return { coupleId: user.currentCoupleId, partnerId, name: user.name };
};

const computeHours = (sleepAt, wakeAt) => {
  let h = (new Date(wakeAt) - new Date(sleepAt)) / 3600000;
  if (h < 0) h += 24; // overnight when only clock times were provided
  return Math.round(h * 10) / 10;
};

const logSleep = async (userId, data) => {
  const { sleepAt, wakeAt, quality, note } = data;
  if (!sleepAt || !wakeAt) throw createError("Sleep and wake times are required", 400);

  const { coupleId } = await getContext(userId);
  const hours = computeHours(sleepAt, wakeAt);

  const log = await SleepLog.create({
    userId,
    coupleId,
    sleepAt: new Date(sleepAt),
    wakeAt: new Date(wakeAt),
    hours,
    quality: quality || 3,
    note: note || "",
    day: dayKey(sleepAt),
  });

  await recordActivity(coupleId, userId, ACTIVITY_TYPES.SLEEP, { hours });

  return log;
};

const getMySleep = async (userId) => {
  return SleepLog.find({ userId }).sort({ sleepAt: -1 }).limit(30);
};

const getPartnerSleep = async (userId) => {
  const { partnerId } = await getContext(userId);
  if (!partnerId) return [];
  return SleepLog.find({ userId: partnerId }).sort({ sleepAt: -1 }).limit(14);
};

const deleteSleep = async (userId, id) => {
  const log = await SleepLog.findOne({ _id: id, userId });
  if (!log) throw createError("Sleep log not found", 404);
  await log.deleteOne();
  return true;
};

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const round1 = (n) => Math.round(n * 10) / 10;
const bedtimeHour = (d) => {
  const dt = new Date(d);
  // Hours past noon, so a 23:00 and 01:00 bedtime compare sensibly.
  return (dt.getHours() + 24 - 12) % 24;
};

// Partner-sync %: how close the two partners' bedtimes are on shared nights.
const syncPercent = (mine, partnerLogs) => {
  const pByDay = {};
  partnerLogs.forEach((l) => (pByDay[l.day] = l));
  const diffs = [];
  mine.forEach((l) => {
    const p = pByDay[l.day];
    if (p) diffs.push(Math.abs(bedtimeHour(l.sleepAt) - bedtimeHour(p.sleepAt)));
  });
  if (diffs.length === 0) return null;
  return Math.max(0, Math.round(100 - avg(diffs) * 18));
};

const getAnalysis = async (userId) => {
  const { partnerId, name } = await getContext(userId);
  const since = new Date(Date.now() - 14 * 86400000);

  const [mine, partnerLogs] = await Promise.all([
    SleepLog.find({ userId, sleepAt: { $gte: since } }).sort({ sleepAt: -1 }),
    partnerId
      ? SleepLog.find({ userId: partnerId, sleepAt: { $gte: since } }).sort({ sleepAt: -1 })
      : [],
  ]);

  const last7 = (logs) => logs.filter((l) => new Date(l.sleepAt) >= new Date(Date.now() - 7 * 86400000));

  const stats = {
    avgHours: round1(avg(mine.map((l) => l.hours))),
    avgQuality: round1(avg(mine.map((l) => l.quality))),
    nightsLogged7d: new Set(last7(mine).map((l) => l.day)).size,
    syncPercent: syncPercent(mine, partnerLogs),
    partnerAvgHours: partnerLogs.length ? round1(avg(partnerLogs.map((l) => l.hours))) : null,
  };

  let analysis = null;
  if (mine.length > 0) {
    const fmt = (logs) =>
      logs
        .slice(0, 10)
        .map(
          (l) =>
            `  ${l.day}: ${l.hours}h, quality ${l.quality}/5, bed ${new Date(l.sleepAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
        )
        .join("\n");
    const sleepText = `Author (${name?.split(" ")[0] || "User"}) recent sleep:\n${fmt(mine)}\n\nPartner recent sleep:\n${partnerLogs.length ? fmt(partnerLogs) : "  no data"}`;
    try {
      analysis = await generateAIResponse(buildSleepAnalysisPrompt(sleepText));
    } catch {
      analysis = null;
    }
  }

  return { stats, analysis, recent: mine.slice(0, 7) };
};

module.exports = {
  logSleep,
  getMySleep,
  getPartnerSleep,
  deleteSleep,
  getAnalysis,
};
