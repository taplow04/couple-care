const asyncHandler = require("../../utils/asyncHandler");

const {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  sendMessage,
} = require("./coach.service");

const list = asyncHandler(async (req, res) => {
  const data = await listConversations(req.user._id);
  res.status(200).json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await createConversation(req.user._id);
  res.status(201).json({ success: true, data });
});

const getOne = asyncHandler(async (req, res) => {
  const data = await getConversation(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  await deleteConversation(req.user._id, req.params.id);
  res.status(200).json({ success: true, message: "Conversation deleted" });
});

const message = asyncHandler(async (req, res) => {
  // `:id` may be "new" (or omitted) to start a fresh conversation.
  const id = req.params.id && req.params.id !== "new" ? req.params.id : null;
  const data = await sendMessage(req.user._id, id, req.body?.text);
  res.status(200).json({ success: true, data });
});

module.exports = { list, create, getOne, remove, message };
