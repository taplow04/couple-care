const LoveLetter = require("./letter.model");
const { LETTER_TYPES } = require("./letter.model");
const { buildRelationshipContext, formatContext } = require("../ai/ai.context");
const { buildLoveLetterPrompt } = require("../ai/ai.prompts");
const { generateAIResponse } = require("../ai/ai.engine");
const { getPartnerId } = require("../chat/chat.helpers");
const { createNotification } = require("../notifications/notification.service");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Generate (but do NOT persist — the user may regenerate freely before saving).
const generateLetter = async (userId, type) => {
  const letterType = LETTER_TYPES.includes(type) ? type : "romantic";
  const ctx = await buildRelationshipContext(userId);
  const prompt = buildLoveLetterPrompt(letterType, formatContext(ctx));
  // Slightly higher temperature for creative, varied letters.
  const content = await generateAIResponse(prompt, 0.85, 500);
  return { type: letterType, content: content.trim() };
};

const saveLetter = async (userId, { type, content }) => {
  if (!content?.trim()) throw createError("Letter content is required", 400);

  const ctx = await buildRelationshipContext(userId);
  const letter = await LoveLetter.create({
    coupleId: ctx.couple._id,
    authorId: userId,
    type: LETTER_TYPES.includes(type) ? type : "romantic",
    content: content.trim(),
  });

  // Saving a letter feeds the engagement loop (unlocks "Wordsmith").
  await recordActivity(ctx.couple._id, userId, ACTIVITY_TYPES.LOVE_LETTER, {
    letterId: letter._id,
    type: letter.type,
  });

  return letter;
};

const listLetters = async (userId) => {
  const ctx = await buildRelationshipContext(userId);
  return LoveLetter.find({ coupleId: ctx.couple._id })
    .sort({ createdAt: -1 })
    .populate("authorId", "name profilePhoto");
};

const shareLetter = async (userId, letterId) => {
  const ctx = await buildRelationshipContext(userId);
  const letter = await LoveLetter.findOne({
    _id: letterId,
    coupleId: ctx.couple._id,
  });
  if (!letter) throw createError("Letter not found", 404);

  letter.sharedWithPartner = true;
  await letter.save();

  try {
    const partnerId = await getPartnerId(userId);
    if (partnerId) {
      await createNotification({
        userId: partnerId,
        title: "💌 You received a love letter",
        message: `${ctx.authorName} wrote you a ${letter.type} letter. Open it to read 💕`,
        type: "love_letter_received",
        metadata: { letterId: letter._id },
      });
    }
  } catch {
    /* notification failure must not break sharing */
  }

  return letter;
};

const deleteLetter = async (userId, letterId) => {
  const ctx = await buildRelationshipContext(userId);
  const letter = await LoveLetter.findOne({
    _id: letterId,
    coupleId: ctx.couple._id,
  });
  if (!letter) throw createError("Letter not found", 404);
  // Only the author can delete their own letter.
  if (String(letter.authorId) !== String(userId)) {
    throw createError("You can only delete your own letters", 403);
  }
  await letter.deleteOne();
  return true;
};

module.exports = {
  generateLetter,
  saveLetter,
  listLetters,
  shareLetter,
  deleteLetter,
};
