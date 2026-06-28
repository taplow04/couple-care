/**
 * Lifecycle service — read API for Stage 3 (Healing): the permanent Relationship
 * Summary, the CoupleCare Journey (COUNT only — never past-partner identities),
 * and the PRIVATE Growth Report (owner-only).
 */
const Couple = require("../couples/couple.model");
const { GrowthReport } = require("./lifecycle.model");
const { computeRelationshipSummary } = require("./lifecycle.summary.service");
const { generateGrowthReport } = require("./lifecycle.ai");

const err = (message, statusCode = 400) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

// The user's most-recently ended relationship (the one Healing mode is about).
const findEndedCouple = async (userId) =>
  Couple.findOne({
    relationshipStatus: "broken_up",
    $or: [{ partnerOneId: userId }, { partnerTwoId: userId }],
  }).sort({ endedAt: -1, updatedAt: -1 });

/**
 * Owner's view of their permanent Relationship Summary. Lazily computes the
 * snapshot if it's somehow missing (e.g. unmatch happened before this feature).
 */
const getSummary = async (userId) => {
  const couple = await findEndedCouple(userId);
  if (!couple) throw err("No past relationship", 404);

  if (!couple.summaryFinalized) {
    await computeRelationshipSummary(couple._id);
    const fresh = await Couple.findById(couple._id);
    return {
      summary: fresh.summary,
      reflection: fresh.aiReflection,
      endedAt: fresh.endedAt,
      coverUrl: fresh.relationshipPhoto || fresh.coverPhoto || "",
    };
  }

  return {
    summary: couple.summary,
    reflection: couple.aiReflection,
    endedAt: couple.endedAt,
    coverUrl: couple.relationshipPhoto || couple.coverPhoto || "",
  };
};

/**
 * CoupleCare Journey — COUNT ONLY. Never exposes past-partner identities, chats,
 * or media. `current` indicates whether the user is presently in a couple.
 */
const getJourney = async (userId) => {
  const [previous, current] = await Promise.all([
    Couple.countDocuments({
      relationshipStatus: "broken_up",
      $or: [{ partnerOneId: userId }, { partnerTwoId: userId }],
    }),
    Couple.countDocuments({
      relationshipStatus: { $ne: "broken_up" },
      $or: [{ partnerOneId: userId }, { partnerTwoId: userId }],
    }),
  ]);
  return {
    previousJourneys: previous,
    currentJourney: current > 0,
    totalJourneys: previous + current,
  };
};

// ── Growth Report (PRIVATE — owner only, never shared) ──
const REPORT_QUESTIONS = [
  "What did you learn about yourself in this relationship?",
  "What would you do differently next time?",
  "What qualities matter most to you in a partner?",
  "What boundaries are important to you going forward?",
];

const getReportQuestions = () => REPORT_QUESTIONS;

const createGrowthReport = async (userId, answers = []) => {
  const clean = (Array.isArray(answers) ? answers : [])
    .filter((a) => a && a.answer && String(a.answer).trim())
    .map((a) => ({ question: String(a.question || ""), answer: String(a.answer).trim() }));
  if (clean.length === 0) throw err("Answer at least one question", 400);

  const ended = await findEndedCouple(userId);
  const report = await GrowthReport.create({
    userId,
    coupleId: ended?._id || null,
    answers: clean,
    aiReport: { text: "", status: "pending" },
  });

  // Generate synchronously (user is waiting on the result) — best-effort.
  const text = await generateGrowthReport(clean);
  report.aiReport = { text, status: "ready" };
  await report.save();

  return report;
};

const getLatestGrowthReport = async (userId) =>
  GrowthReport.findOne({ userId }).sort({ createdAt: -1 });

module.exports = {
  getSummary,
  getJourney,
  getReportQuestions,
  createGrowthReport,
  getLatestGrowthReport,
};
