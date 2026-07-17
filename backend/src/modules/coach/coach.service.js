const CoachConversation = require("./coach.model");
const User = require("../users/user.model");
const { buildRelationshipContext, formatContext } = require("../ai/ai.context");
const {
  buildPersonalContext,
  formatPersonalContext,
} = require("../ai/ai.context.personal");
const {
  buildCoachReplyPrompt,
  buildPrepCoachPrompt,
  buildRecoveryCoachPrompt,
} = require("../ai/ai.prompts");
const { generateChatResponse } = require("../ai/ai.engine");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");
const { recordGrowthActivity } = require("../growth/growth.engagement");
const { GROWTH_ACTIVITY } = require("../growth/growth.constants");
const { resolveStage } = require("../users/stage.helper");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// How many prior turns to feed the model (keeps token use bounded).
const HISTORY_WINDOW = 12;

/**
 * Compact intelligence snapshot appended to the coach system prompt so advice
 * tracks the user's actual behavioural picture (maturity in growing/preparing,
 * healing progress in healing). Best-effort — the coach must never fail
 * because scoring did. Lazy require avoids a coach↔intelligence load cycle.
 * The line explicitly tells the model these are estimates, never facts.
 */
/**
 * Compact interest line appended to the coach system prompt so suggestions
 * (dates, gifts, conversation starters) match what the user actually engages
 * with INSIDE CoupleCare. Best-effort; lazy require avoids a load cycle.
 */
const interestContextLine = async (userId) => {
  try {
    const line = await require("../interests/interest.service").interestContextLine(userId);
    return line ? `\n\n${line} Use these to personalise suggestions naturally — never recite the list.` : "";
  } catch {
    return "";
  }
};

const intelligenceContextLine = async (userId, stage) => {
  try {
    const intelligence = require("../../intelligence");
    if (stage === "healing") {
      const h = await intelligence.getHealing(userId);
      return `\n\nBehavioural snapshot (deterministic estimate, ${h.confidence}% confidence — treat as a hint, never state as fact or quote numbers unprompted): recovery-activity engagement ${h.score}/100, trend ${h.trend?.direction || "stable"}. Gentle focus areas: ${(h.factors?.focusAreas || []).map((f) => f.label).join(", ") || "none observed"}.`;
    }
    const m = await intelligence.getMaturity(userId);
    return `\n\nBehavioural snapshot (deterministic estimate, ${m.confidence}% confidence — treat as a hint, never state as fact or quote numbers unprompted): relationship-maturity ${m.score}/100, trend ${m.trend?.direction || "stable"}. Observed strengths: ${(m.factors?.strengths || []).map((f) => f.label).join(", ") || "none yet"}. Growth areas: ${(m.factors?.growthAreas || []).map((f) => f.label).join(", ") || "none observed"}.`;
  } catch {
    return "";
  }
};

/**
 * Resolve the coach persona for a user based on their lifecycle stage. The coach
 * is stage-aware:
 *   growing   → couple Relationship Coach (couple context) — unchanged behaviour
 *   preparing → Relationship Preparation Coach (personal context)
 *   healing   → Recovery Coach (personal context)
 * Returns { coupleId, buildSystemPrompt(), recordEngagement() }.
 */
const resolveCoachPersona = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  const { stage } = await resolveStage(user);

  if (stage === "growing" && user?.currentCoupleId) {
    return {
      coupleId: user.currentCoupleId,
      stage,
      buildSystemPrompt: async () => {
        const ctx = await buildRelationshipContext(userId);
        return (
          buildCoachReplyPrompt(formatContext(ctx)) +
          (await intelligenceContextLine(userId, stage)) +
          (await interestContextLine(userId))
        );
      },
      recordEngagement: () =>
        recordActivity(user.currentCoupleId, userId, ACTIVITY_TYPES.COACH, {}),
    };
  }

  // Solo stages share the personal context; only the system prompt differs.
  const buildSolo = stage === "healing" ? buildRecoveryCoachPrompt : buildPrepCoachPrompt;
  return {
    coupleId: null,
    stage,
    buildSystemPrompt: async () => {
      const ctx = await buildPersonalContext(userId);
      return (
        buildSolo(formatPersonalContext(ctx)) +
        (await intelligenceContextLine(userId, stage)) +
        (await interestContextLine(userId))
      );
    },
    recordEngagement: () => recordGrowthActivity(userId, GROWTH_ACTIVITY.COACH, {}),
  };
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
  const persona = await resolveCoachPersona(userId);
  return CoachConversation.create({ coupleId: persona.coupleId, userId, messages: [] });
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

  const persona = await resolveCoachPersona(userId);

  let convo;
  if (conversationId) {
    convo = await CoachConversation.findOne({ _id: conversationId, userId });
    if (!convo) throw createError("Conversation not found", 404);
  } else {
    convo = await CoachConversation.create({
      coupleId: persona.coupleId,
      userId,
      messages: [],
    });
  }

  // Build the stage-appropriate system prompt (couple / preparation / recovery).
  const systemPrompt = await persona.buildSystemPrompt();

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

  // Talking with the coach counts toward engagement (couple XP when growing,
  // personal XP when preparing / healing).
  await persona.recordEngagement();

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
