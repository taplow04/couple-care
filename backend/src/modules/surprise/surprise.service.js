const SurpriseBox = require("./surprise.model");
const { REWARD_TYPES } = require("./surprise.model");
const { buildRelationshipContext, formatContext } = require("../ai/ai.context");
const { buildSurprisePrompt } = require("../ai/ai.prompts");
const { generateAIResponse } = require("../ai/ai.engine");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const dayKey = () => new Date().toISOString().slice(0, 10);
const pickReward = () => REWARD_TYPES[Math.floor(Math.random() * REWARD_TYPES.length)];

// Today's box state for the user (opened or not).
const getToday = async (userId) => {
  const day = dayKey();
  const box = await SurpriseBox.findOne({ userId, day });
  return box
    ? { opened: true, rewardType: box.rewardType, content: box.content, day }
    : { opened: false, day };
};

/**
 * Open today's surprise. Idempotent per day: if already opened, returns the
 * existing reward instead of generating a new one. Feeds the engagement loop.
 */
const openToday = async (userId) => {
  const day = dayKey();

  const existing = await SurpriseBox.findOne({ userId, day });
  if (existing) {
    return {
      opened: true,
      alreadyOpened: true,
      rewardType: existing.rewardType,
      content: existing.content,
      day,
    };
  }

  const rewardType = pickReward();
  const ctx = await buildRelationshipContext(userId);
  const prompt = buildSurprisePrompt(rewardType, formatContext(ctx));
  const content = (await generateAIResponse(prompt, 0.95, 220)).trim();

  let box;
  try {
    box = await SurpriseBox.create({
      coupleId: ctx.couple._id,
      userId,
      day,
      rewardType,
      content,
    });
  } catch (e) {
    // Unique-index race — another request opened it first; return that one.
    if (e.code === 11000) {
      const again = await SurpriseBox.findOne({ userId, day });
      if (again) {
        return {
          opened: true,
          alreadyOpened: true,
          rewardType: again.rewardType,
          content: again.content,
          day,
        };
      }
    }
    throw e;
  }

  await recordActivity(ctx.couple._id, userId, ACTIVITY_TYPES.SURPRISE_OPEN, {
    rewardType,
  });

  return { opened: true, alreadyOpened: false, rewardType: box.rewardType, content: box.content, day };
};

module.exports = { getToday, openToday };
