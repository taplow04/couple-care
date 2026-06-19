const asyncHandler = require("../../utils/asyncHandler");

const {
  getItems,
  getStats,
  createItem,
  updateItem,
  setComplete,
  deleteItem,
} = require("./bucket.service");

const list = asyncHandler(async (req, res) => {
  const data = await getItems(req.user._id);
  res.status(200).json({ success: true, data });
});

const stats = asyncHandler(async (req, res) => {
  const data = await getStats(req.user._id);
  res.status(200).json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await createItem(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

const update = asyncHandler(async (req, res) => {
  const data = await updateItem(req.user._id, req.params.id, req.body);
  res.status(200).json({ success: true, data });
});

const complete = asyncHandler(async (req, res) => {
  const data = await setComplete(req.user._id, req.params.id, req.body?.completed);
  res.status(200).json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  await deleteItem(req.user._id, req.params.id);
  res.status(200).json({ success: true, message: "Bucket item deleted" });
});

module.exports = { list, stats, create, update, complete, remove };
