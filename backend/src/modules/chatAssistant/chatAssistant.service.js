/**
 * Chat Assistant — SuggestionEngine + DraftAnalyzer + Rephrase.
 *
 * Layering (CCIE philosophy):
 *  - chatAssistant.analysis.js  → deterministic observation (no LLM)
 *  - this file                  → turns observations into help:
 *      · getContext():   insight + dynamic mode chips + deterministic
 *                        suggestions + repair ideas (NO LLM — instant)
 *      · getSuggestions(): Groq-generated, context-aware suggestions with the
 *                        deterministic bank as a guaranteed fallback
 *      · rephrase():     Groq rewrite of the user's draft (intent preserved)
 *      · checkDraft():   deterministic tone feedback — advisory only, never
 *                        blocks sending
 *
 * No new collections: everything is derived on demand from data the couple
 * already created (messages, moods, pulse). Nothing here is stored, so nothing
 * can go stale or leak — recompute is cheap and the transparency line always
 * names the basis.
 */
const User = require("../users/user.model");
const { generateAIResponse } = require("../ai/ai.engine");
const {
  buildChatSuggestionPrompt,
  buildRephrasePrompt,
} = require("../ai/ai.prompts");
const { analyzeConversation } = require("./chatAssistant.analysis");
const { scoreText } = require("../../intelligence/lib/sentiment");

const SUGGESTION_COUNT = 5;

// ── Smart AI modes ──────────────────────────────────────────────────────────
const MODES = {
  calm: { emoji: "💙", label: "Calm Reply", intent: "a calm, de-escalating reply that acknowledges the other person and lowers tension" },
  resolve: { emoji: "🤝", label: "Resolve", intent: "a constructive message that looks for common ground and invites solving this together" },
  apologize: { emoji: "❤️", label: "Apologize", intent: "a sincere, specific apology grounded in this conversation (no generic 'sorry')" },
  comfort: { emoji: "🫂", label: "Comfort", intent: "a gentle, supportive message comforting a partner who seems stressed or down" },
  appreciate: { emoji: "😊", label: "Appreciate", intent: "a genuine appreciation or gratitude message about something from this conversation" },
  romantic: { emoji: "🌹", label: "Romantic", intent: "an affectionate, romantic message" },
  flirty: { emoji: "😏", label: "Flirty", intent: "a playful, flirty message (tasteful, light)" },
  lighten: { emoji: "😂", label: "Lighten Mood", intent: "a light, funny message to make the mood easier" },
  celebrate: { emoji: "🎉", label: "Celebrate", intent: "an enthusiastic celebration message for the good news in this conversation" },
  continue: { emoji: "💬", label: "Continue", intent: "a natural next message that keeps this conversation flowing" },
  starter: { emoji: "✨", label: "Starter", intent: "a meaningful conversation starter (dreams, plans, fun or deep questions)" },
  coach: { emoji: "🧭", label: "Coach Tip", intent: "a healthier-communication phrasing the user could send to express themselves clearly and kindly" },
};

// Which chips to surface first, per detected conversation state.
const CHIPS_FOR_STATE = {
  quiet: ["starter", "continue", "romantic", "lighten"],
  tense: ["calm", "resolve", "apologize", "coach"],
  repairing: ["apologize", "resolve", "appreciate", "calm"],
  support: ["comfort", "appreciate", "calm", "romantic"],
  celebration: ["celebrate", "appreciate", "romantic", "lighten"],
  romantic: ["romantic", "flirty", "appreciate", "continue"],
  playful: ["lighten", "flirty", "continue", "romantic"],
  planning: ["continue", "celebrate", "appreciate", "starter"],
  positive: ["continue", "appreciate", "romantic", "lighten"],
  neutral: ["continue", "starter", "appreciate", "romantic"],
};

// ── Deterministic suggestion bank (fallback + instant context payload) ──────
// Keyed by state; rotated by day so the same chips never feel frozen.
const BANK = {
  quiet: [
    "Hey you — I was just thinking about us. How's your day going? 💭",
    "I miss our conversations. Tell me something good from today?",
    "Random thought: what's something you're looking forward to this month?",
    "Checking in on you 🤍 How are you feeling today?",
    "Let's plan something small for this week — what sounds fun?",
  ],
  tense: [
    "I think we misunderstood each other. Can we start over?",
    "I don't want us to argue — I care more about us than about being right.",
    "I hear you. Help me understand what hurt the most?",
    "Can we slow down? I want to actually listen to you.",
    "What can I do right now to make this better?",
  ],
  repairing: [
    "Thank you for talking this through with me.",
    "I appreciate you telling me how you feel.",
    "I never wanted to hurt you — I'm glad we're working on this.",
    "Let's solve this together, like we always do.",
    "I'm proud of us for talking instead of shutting down.",
  ],
  support: [
    "I'm here for you, whatever you need 🤍",
    "That sounds heavy. Want to talk about it or be distracted from it?",
    "You don't have to carry this alone — I've got you.",
    "Is there anything I can take off your plate today?",
    "I believe in you. One step at a time.",
  ],
  celebration: [
    "I'm SO proud of you!! 🎉",
    "This deserves a proper celebration — pick a day!",
    "You worked so hard for this. Enjoy every second of it.",
    "Telling everyone about my amazing partner today 😌",
    "This calls for your favourite dinner — on me.",
  ],
  romantic: [
    "I love you more than I say out loud 🤍",
    "Being yours is my favourite thing.",
    "Can't stop thinking about you today.",
    "You + me + no plans = perfect evening?",
    "Just wanted you to know you make me really happy.",
  ],
  playful: [
    "Okay but who's the funny one in this relationship? (it's me) 😌",
    "Drop your most controversial food opinion. Now.",
    "Rate today out of 10, and what would've made it 11?",
    "I have a surprise. It's me. I'm the surprise 😏",
    "Two truths and a lie — go!",
  ],
  planning: [
    "Okay let's lock it in — when works for you?",
    "I'm excited about this already 😄",
    "Want me to handle the booking?",
    "Adding this to our list — it's happening.",
    "What else should we squeeze into that day?",
  ],
  positive: [
    "Talking to you is the best part of my day.",
    "What's been the highlight of your day so far?",
    "We're pretty good at this whole thing, aren't we 😊",
    "Tell me more — I'm all ears.",
    "You always know how to make me smile.",
  ],
  neutral: [
    "How's your day treating you? ❤️",
    "Thinking of you — what's on your mind today?",
    "What's one small thing that made you smile today?",
    "Us. Weekend. Something fun. Ideas?",
    "Tell me the best part of your day — I want details.",
  ],
};

// Relationship Repair ideas — surfaced when the conversation has gone quiet.
const REPAIR_IDEAS = [
  { emoji: "💬", title: "Question of the day", text: "Ask: “What's one thing you wish we did more often?”" },
  { emoji: "📸", title: "Memory reminder", text: "Open your Journey and send them a favourite memory." },
  { emoji: "🌹", title: "Small kindness", text: "Send one sentence about something you appreciate about them." },
  { emoji: "📅", title: "Micro-date", text: "Suggest a 30-minute walk or coffee together this week." },
  { emoji: "🎁", title: "Tiny surprise", text: "Plan one small unexpected gesture for tomorrow." },
];

// Deterministic day-based rotation so fallback chips vary day to day.
const dayOffset = () => {
  const day = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
};

const rotated = (list) => {
  const off = dayOffset() % list.length;
  return [...list.slice(off), ...list.slice(0, off)];
};

const chipsFor = (state) =>
  (CHIPS_FOR_STATE[state] || CHIPS_FOR_STATE.neutral).map((key) => ({
    key,
    emoji: MODES[key].emoji,
    label: MODES[key].label,
  }));

// Compact relationship line for the LLM prompt (no heavy context build).
const contextLine = async (analysis) => {
  let partnerName = "their partner";
  try {
    if (analysis.partnerId) {
      const p = await User.findById(analysis.partnerId).select("name");
      partnerName = p?.name?.split(" ")[0] || partnerName;
    }
  } catch {
    /* name optional */
  }
  const s = analysis.signals;
  const bits = [
    `Partner's first name: ${partnerName}.`,
    `Conversation state (deterministic in-app analysis): ${analysis.state}.`,
    s.partnerMood ? `Partner's latest logged mood: ${s.partnerMood}.` : null,
    s.myMood ? `User's latest logged mood: ${s.myMood}.` : null,
    analysis.pulseScore != null ? `Relationship Pulse: ${analysis.pulseScore}/100.` : null,
    s.silenceHours != null ? `Hours since last message: ${s.silenceHours}.` : null,
  ];
  return bits.filter(Boolean).join(" ");
};

// Parse LLM line output → clean suggestion strings.
const parseLines = (raw, max) =>
  String(raw || "")
    .split("\n")
    .map((l) => l.replace(/^[\s\-–•*\d.)"']+/, "").replace(/["']+$/, "").trim())
    .filter((l) => l.length >= 2 && l.length <= 200)
    .slice(0, max);

// ── Public API ──────────────────────────────────────────────────────────────

/** Instant, deterministic context payload (no LLM): insight + chips + bank. */
const getContext = async (userId) => {
  const analysis = await analyzeConversation(userId);
  const { transcript, partnerId, coupleId, ...publicAnalysis } = analysis;
  return {
    ...publicAnalysis,
    chips: chipsFor(analysis.state),
    suggestions: rotated(BANK[analysis.state] || BANK.neutral).slice(0, SUGGESTION_COUNT),
    repair: analysis.state === "quiet" ? REPAIR_IDEAS : null,
    modes: Object.entries(MODES).map(([key, m]) => ({ key, emoji: m.emoji, label: m.label })),
  };
};

/** LLM suggestions for a mode (or the detected state), draft-aware. */
const getSuggestions = async (userId, { mode, draft } = {}) => {
  const analysis = await analyzeConversation(userId);
  const chosen = MODES[mode] || null;
  const intent = chosen
    ? chosen.intent
    : MODES[(CHIPS_FOR_STATE[analysis.state] || ["continue"])[0]].intent;

  const fallback = rotated(BANK[analysis.state] || BANK.neutral).slice(0, SUGGESTION_COUNT);

  try {
    const prompt = buildChatSuggestionPrompt({
      intent,
      contextText: await contextLine(analysis),
      conversationText: analysis.transcript,
      draft: draft ? String(draft).slice(0, 500) : "",
      count: SUGGESTION_COUNT,
    });
    const raw = await generateAIResponse(prompt, 0.85, 320);
    const suggestions = parseLines(raw, SUGGESTION_COUNT);
    if (suggestions.length >= 2) {
      return { suggestions, source: "ai", state: analysis.state, basis: analysis.basis };
    }
    return { suggestions: fallback, source: "fallback", state: analysis.state, basis: analysis.basis };
  } catch {
    return { suggestions: fallback, source: "fallback", state: analysis.state, basis: analysis.basis };
  }
};

/** Rewrite the user's draft in a requested tone — intent preserved. */
const rephrase = async (userId, { draft, tone } = {}) => {
  const text = String(draft || "").trim();
  if (!text) {
    const e = new Error("Nothing to rephrase yet — write a few words first.");
    e.statusCode = 400;
    throw e;
  }
  const analysis = await analyzeConversation(userId);
  const safeTone = ["calmer", "warmer", "clearer", "more supportive", "more playful"].includes(tone)
    ? tone
    : "warmer";
  const prompt = buildRephrasePrompt({
    draft: text.slice(0, 500),
    tone: safeTone,
    conversationText: analysis.transcript,
  });
  const raw = await generateAIResponse(prompt, 0.7, 260);
  const options = parseLines(raw, 3);
  if (!options.length) {
    const e = new Error("Couldn't rephrase right now. Please try again.");
    e.statusCode = 502;
    throw e;
  }
  return { options, tone: safeTone, basis: analysis.basis };
};

/**
 * DraftAnalyzer — deterministic, instant, advisory-only tone feedback.
 * Never blocks sending; notes are observations, never verdicts about people.
 */
const checkDraft = async (userId, { draft } = {}) => {
  const text = String(draft || "").trim();
  if (!text) return { tone: "neutral", notes: [] };

  const { pos, neg } = scoreText(text);
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const capsRatio = letters.length >= 6
    ? letters.replace(/[^A-Z]/g, "").length / letters.length
    : 0;
  const harshOpeners = ["you always", "you never", "whatever", "forget it", "i'm done", "im done"];
  const hasHarshPhrase = harshOpeners.some((p) => text.toLowerCase().includes(p));

  const notes = [];
  let tone = "neutral";

  if (pos > neg && pos > 0) {
    tone = "supportive";
    notes.push("This message reads warm and supportive. 💛");
  }
  if (neg > pos && neg >= 2) {
    tone = "may sound harsh";
    notes.push("This might land harder than you intend — a softer opening could help.");
  }
  if (capsRatio > 0.6) {
    tone = "may sound harsh";
    notes.push("ALL CAPS can read as shouting in text.");
  }
  if (hasHarshPhrase) {
    tone = "may sound harsh";
    notes.push("Absolute phrases (“always / never”) often escalate — describing this one moment tends to work better.");
  }

  // Context nuance: a very short reply inside a tense conversation can read cold.
  try {
    const analysis = await analyzeConversation(userId);
    if ((analysis.state === "tense" || analysis.state === "repairing") && text.length <= 8) {
      notes.push("A very short reply during a hard conversation can feel distant — a few more words may help.");
      if (tone === "neutral") tone = "may be misread";
    }
  } catch {
    /* context optional */
  }

  return { tone, notes: notes.slice(0, 3) };
};

module.exports = { getContext, getSuggestions, rephrase, checkDraft, MODES };
