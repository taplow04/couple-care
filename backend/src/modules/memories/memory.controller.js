const asyncHandler = require("../../utils/asyncHandler");

const {
  createMemory,
  getMemories,
  getMemoryById,
  deleteMemory,
  updateMemory,
  getTimeline,
  getUpcomingEvents,
  getMemoryStats,
} = require("./memory.service");

const create = asyncHandler(async (req, res) => {
  const memory = await createMemory(req.user._id, req.body);

  res.status(201).json({
    success: true,
    data: memory,
  });
});

const getAll = asyncHandler(async (req, res) => {
  const memories = await getMemories(req.user._id);

  res.status(200).json({
    success: true,
    data: memories,
  });
});

const getOne = asyncHandler(async (req, res) => {
  const memory = await getMemoryById(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    data: memory,
  });
});

const remove = asyncHandler(async (req, res) => {
  await deleteMemory(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    message: "Memory deleted",
  });
});

const update = asyncHandler(async (req, res) => {
  const memory = await updateMemory(req.user._id, req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: memory,
  });
});
const timeline = asyncHandler(async (req, res) => {
  const data = await getTimeline(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});
const upcoming = asyncHandler(async (req, res) => {
  const data = await getUpcomingEvents(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

const stats = asyncHandler(async (req, res) => {
  const data = await getMemoryStats(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  create,
  getAll,
  getOne,
  remove,
  update,
  timeline,
  upcoming,
  stats,
};
