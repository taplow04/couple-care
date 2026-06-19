const asyncHandler = require("../../utils/asyncHandler");

const {
  generateLetter,
  saveLetter,
  listLetters,
  shareLetter,
  deleteLetter,
} = require("./letter.service");

const generate = asyncHandler(async (req, res) => {
  const data = await generateLetter(req.user._id, req.body?.type);
  res.status(200).json({ success: true, data });
});

const save = asyncHandler(async (req, res) => {
  const data = await saveLetter(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

const list = asyncHandler(async (req, res) => {
  const data = await listLetters(req.user._id);
  res.status(200).json({ success: true, data });
});

const share = asyncHandler(async (req, res) => {
  const data = await shareLetter(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  await deleteLetter(req.user._id, req.params.id);
  res.status(200).json({ success: true, message: "Letter deleted" });
});

module.exports = { generate, save, list, share, remove };
