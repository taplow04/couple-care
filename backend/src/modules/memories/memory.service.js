const Memory = require("./memory.model");

const User = require("../users/user.model");
const { recomputeAndBroadcast } = require("../couples/health.service");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const getActiveCoupleId = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");

  if (!user) {
    throw createError("User not found", 404);
  }

  if (!user.currentCoupleId) {
    throw createError("No active relationship", 400);
  }

  return user.currentCoupleId;
};

const createMemory = async (userId, data) => {
  const coupleId = await getActiveCoupleId(userId);

  const memory = await Memory.create({
    ...data,

    createdBy: userId,

    coupleId,
  });

  // Memories feed the couple health score — recompute + push live to both.
  await recomputeAndBroadcast(coupleId, "memory");

  // Feed the shared engagement loop (streak / XP / achievements). Never blocks.
  await recordActivity(coupleId, userId, ACTIVITY_TYPES.MEMORY, {
    title: memory.title,
    memoryType: memory.memoryType,
  });

  return memory;
};

const getMemories = async (userId) => {
  const coupleId = await getActiveCoupleId(userId);

  return await Memory.find({
    coupleId,
  }).sort({
    memoryDate: -1,
  });
};

const getMemoryById = async (userId, memoryId) => {
  const coupleId = await getActiveCoupleId(userId);

  const memory = await Memory.findOne({
    _id: memoryId,

    coupleId,
  });

  if (!memory) {
    throw createError("Memory not found", 404);
  }

  return memory;
};

const deleteMemory = async (userId, memoryId) => {
  const coupleId = await getActiveCoupleId(userId);

  const memory = await Memory.findOne({
    _id: memoryId,

    coupleId,
  });

  if (!memory) {
    throw createError("Memory not found", 404);
  }

  await memory.deleteOne();

  await recomputeAndBroadcast(coupleId, "memory");

  return true;
};
const updateMemory = async (userId, memoryId, data) => {
  const coupleId = await getActiveCoupleId(userId);

  const memory = await Memory.findOne({
    _id: memoryId,
    coupleId,
  });

  if (!memory) {
    throw createError("Memory not found", 404);
  }

  const allowedFields = [
    "title",
    "description",
    "memoryType",
    "memoryDate",
    "photos",
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      memory[field] = data[field];
    }
  });

  await memory.save();

  return memory;
};
const getTimeline = async (userId) => {
  const coupleId = await getActiveCoupleId(userId);

  const memories = await Memory.find({
    coupleId,
  }).sort({
    memoryDate: -1,
  });

  const timeline = {};

  memories.forEach((memory) => {
    const year = new Date(memory.memoryDate).getFullYear();

    if (!timeline[year]) {
      timeline[year] = [];
    }

    timeline[year].push(memory);
  });

  return timeline;
};

const getUpcomingEvents = async (userId) => {
  const coupleId = await getActiveCoupleId(userId);

  const memories = await Memory.find({
    coupleId,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];

  memories.forEach((memory) => {
    const eventDate = new Date(memory.memoryDate);

    const nextOccurrence = new Date(
      today.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
    );

    if (nextOccurrence < today) {
      nextOccurrence.setFullYear(today.getFullYear() + 1);
    }

    const diffDays = Math.ceil(
      (nextOccurrence - today) / (1000 * 60 * 60 * 24),
    );

    upcoming.push({
      _id: memory._id,

      title: memory.title,

      memoryType: memory.memoryType,

      daysRemaining: diffDays,

      memoryDate: memory.memoryDate,
    });
  });

  upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return upcoming.slice(0, 10);
};
const getMemoryStats = async (userId) => {
  const coupleId = await getActiveCoupleId(userId);

  const stats = {
    totalMemories: 0,

    date: 0,
    trip: 0,
    birthday: 0,
    anniversary: 0,
    proposal: 0,
    gift: 0,
    milestone: 0,
    other: 0,
  };

  const grouped = await Memory.aggregate([
    {
      $match: {
        coupleId,
      },
    },
    {
      $group: {
        _id: "$memoryType",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  grouped.forEach((memoryType) => {
    stats[memoryType._id] = memoryType.count;
    stats.totalMemories += memoryType.count;
  });

  return stats;
};

module.exports = {
  createMemory,

  getMemories,

  getMemoryById,

  updateMemory,

  deleteMemory,

  getTimeline,

  getUpcomingEvents,

  getMemoryStats,
};
