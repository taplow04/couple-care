const CoachConversation = require("./coach.model");
const User = require("../users/user.model");
const { buildRelationshipContext, formatContext } = require("../ai/ai.context");
const { buildCoachReplyPrompt } = require("../ai/ai.prompts");
const { generateChatResponse } = require("../ai/ai.engine");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// How many prior turns to feed the model (keeps token use bounded).
const HISTORY_WINDOW = 12;

const getCoupleId = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) throw createError("No active relationship", 400);
  return user.currentCoupleId;
};

const listConversations = async (userId) => {
  const convos = await CoachConversation.find({ userId })
    .sort({ updatedAt: -1 })
    .select("title messages updatedAt");
  // Return a light summary (title + last message preview), not full transcripts.
  return convos.map((c) => {
    const last = c.messages[c.messages.length - 1];
    return {
      _id: c._id,
      title: c.title,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
      preview: last ? last.content.slice(0, 90) : "",
    };
  });
};

const createConversation = async (userId) => {
  const coupleId = await getCoupleId(userId);
  return CoachConversation.create({ coupleId, userId, messages: [] });
};

const getConversation = async (userId, id) => {
  const convo = await CoachConversation.findOne({ _id: id, userId });
  if (!convo) throw createError("Conversation not found", 404);
  return convo;
};

const deleteConversation = async (userId, id) => {
  const convo = await CoachConversation.findOne({ _id: id, userId });
  if (!convo) throw createError("Conversation not found", 404);
  await convo.deleteOne();
  return true;
};

// Derive a short title from the first user message.
const titleFromText = (text) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
};

/**
 * Append a user message, generate a contextual coach reply, persist both, and
 * return the assistant message. Feeds the engagement loop (COACH activity).
 */
const sendMessage = async (userId, conversationId, text) => {
  if (!text?.trim()) throw createError("Message cannot be empty", 400);

  const coupleId = await getCoupleId(userId);

  let convo;
  if (conversationId) {
    convo = await CoachConversation.findOne({ _id: conversationId, userId });
    if (!convo) throw createError("Conversation not found", 404);
  } else {
    convo = await CoachConversation.create({ coupleId, userId, messages: [] });
  }

  // Build the system prompt from the live relationship context.
  const ctx = await buildRelationshipContext(userId);
  const systemPrompt = buildCoachReplyPrompt(formatContext(ctx));

  const history = convo.messages
    .slice(-HISTORY_WINDOW)
    .map((m) => ({ role: m.role, content: m.content }));

  const aiMessages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: text.trim() },
  ];

  const reply = await generateChatResponse(aiMessages, 0.7, 600);

  // Persist both turns.
  convo.messages.push({ role: "user", content: text.trim() });
  convo.messages.push({ role: "assistant", content: reply.trim() });
  if (convo.title === "New conversation") convo.title = titleFromText(text);
  await convo.save();

  // Talking with the coach counts toward engagement (unlocks "Growth Seekers").
  await recordActivity(coupleId, userId, ACTIVITY_TYPES.COACH, {
    conversationId: convo._id,
  });

  return {
    conversationId: convo._id,
    title: convo.title,
    reply: reply.trim(),
  };
};

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  sendMessage,
};
