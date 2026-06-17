const asyncHandler = require("../../utils/asyncHandler");

const {
  sendMessage,
  getMessages,
  markSeen,
  deleteMessage,
  getUnreadCount,
  markAllSeen,
} = require("./chat.service");

const send = asyncHandler(async (req, res) => {
  const message = await sendMessage(req.user._id, req.body.text);

  res.status(201).json({
    success: true,
    data: message,
  });
});

const getAll = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;

  const limit = Number(req.query.limit) || 50;

  const messages = await getMessages(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data: messages,
  });
});

const seen = asyncHandler(async (req, res) => {
  const message = await markSeen(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    data: message,
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await deleteMessage(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await getUnreadCount(req.user._id);
  res.status(200).json({ success: true, data: { count } });
});

const seenAll = asyncHandler(async (req, res) => {
  const result = await markAllSeen(req.user._id);
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  send,
  getAll,
  seen,
  remove,
  unreadCount,
  seenAll,
};
