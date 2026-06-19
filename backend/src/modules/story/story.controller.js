const asyncHandler = require("../../utils/asyncHandler");

const {
  getChapters,
  addChapter,
  updateChapter,
  deleteChapter,
} = require("./story.service");

const list = asyncHandler(async (req, res) => {
  const data = await getChapters(req.user._id);
  res.status(200).json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await addChapter(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

const update = asyncHandler(async (req, res) => {
  const data = await updateChapter(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  await deleteChapter(req.user._id, req.params.id);
  res.status(200).json({ success: true, message: "Chapter deleted" });
});

module.exports = { list, create, update, remove };
