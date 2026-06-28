/**
 * CCIE feature extraction — THE only DB-touching layer for the engines. Each
 * gather* returns a plain `features` object the pure engine cores consume, so the
 * scoring math stays unit-testable with fixtures (no DB).
 *
 * Phase A gathers the classic Relationship Health inputs (identical to the
 * original service queries). Phase B adds calls/stories/sleep/etc. here.
 */
const Couple = require("../../modules/couples/couple.model");
const Mood = require("../../modules/moods/mood.model");
const Memory = require("../../modules/memories/memory.model");
const Message = require("../../modules/chat/message.model");
const { getDaysTogether } = require("../../modules/couples/couple.helpers");
const { DAY_MS } = require("./normalize");

const gatherHealthFeatures = async (coupleId, now = Date.now()) => {
  const couple = await Couple.findById(coupleId);
  if (!couple) throw new Error("Couple not found");

  const partnerIds = [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);
  const since = new Date(now - 30 * DAY_MS);

  const [moods, memories, messages] = await Promise.all([
    Mood.find({ coupleId, createdAt: { $gte: since } }).select("moodType intensity userId createdAt"),
    Memory.find({ coupleId }).select("memoryType memoryDate createdAt"),
    Message.find({ coupleId, createdAt: { $gte: since } }).select("senderId createdAt"),
  ]);

  const moodsA = moods.filter((m) => String(m.userId) === String(couple.partnerOneId));
  const moodsB = moods.filter((m) => String(m.userId) === String(couple.partnerTwoId));

  return {
    couple,
    moods,
    memories,
    messages,
    moodsA,
    moodsB,
    partnerIds,
    daysTogether: getDaysTogether(couple),
    now,
  };
};

module.exports = { gatherHealthFeatures };
