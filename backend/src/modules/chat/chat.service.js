const Message = require("./message.model");

const { getCoupleByUser } = require("./chat.helpers");

const sendMessage = async (userId, text) => {
  if (!text?.trim()) {
    throw new Error("Message cannot be empty");
  }

  const couple = await getCoupleByUser(userId);

  const message = await Message.create({
    coupleId: couple._id,

    senderId: userId,

    text,
  });

  return message;
};

const getMessages = async (userId, page = 1, limit = 50) => {
  const couple = await getCoupleByUser(userId);

  const skip = (page - 1) * limit;

  return await Message.find({
    coupleId: couple._id,
  })
    .populate("senderId", "name profilePhoto")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit);
};

const deleteMessage = async (userId, messageId) => {
  const couple = await getCoupleByUser(userId);

  const message = await Message.findOne({
    _id: messageId,
    coupleId: couple._id,
  });

  if (!message) throw new Error("Message not found");
  if (String(message.senderId) !== String(userId)) throw new Error("Not authorized to delete this message");

  await Message.deleteOne({ _id: messageId });

  return { messageId: String(messageId), coupleId: String(couple._id) };
};

// Unread = messages in this couple sent by the PARTNER that the user hasn't
// seen yet. Derived from the existing Message.seen flag.
const getUnreadCount = async (userId) => {
  const couple = await getCoupleByUser(userId);

  return await Message.countDocuments({
    coupleId: couple._id,
    senderId: { $ne: userId },
    seen: false,
  });
};

// Mark every unseen partner message as seen (called when the user opens chat),
// so the server-side unread count resets — not just the client badge.
const markAllSeen = async (userId) => {
  const couple = await getCoupleByUser(userId);

  await Message.updateMany(
    { coupleId: couple._id, senderId: { $ne: userId }, seen: false },
    { seen: true },
  );

  return { coupleId: String(couple._id) };
};

const markSeen = async (userId, messageId) => {
  const couple = await getCoupleByUser(userId);

  const message = await Message.findOne({
    _id: messageId,
    coupleId: couple._id,
  });

  if (!message) {
    throw new Error("Message not found or unauthorized");
  }

  message.seen = true;

  await message.save();

  return message;
};

module.exports = {
  sendMessage,
  getMessages,
  markSeen,
  deleteMessage,
  getUnreadCount,
  markAllSeen,
};
