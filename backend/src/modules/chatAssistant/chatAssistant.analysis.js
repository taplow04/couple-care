/**
 * ConversationAnalysisService — DETERMINISTIC analysis of the couple's recent
 * in-app conversation. No LLM anywhere in this file: same data ⇒ same output
 * (CCIE philosophy). It observes patterns — it never judges people.
 *
 * Signals: sentiment (CCIE lexicon), message tempo, reply delays, silence,
 * message length, both partners' latest logged moods, and the couple Pulse.
 * The result feeds the suggestion engine, the dynamic mode chips, the insight
 * line, and the deterministic fallback suggestions.
 */
const User = require("../users/user.model");
const Message = require("../chat/message.model");
const Mood = require("../moods/mood.model");
const { scoreText } = require("../../intelligence/lib/sentiment");

const HOUR = 60 * 60 * 1000;
const RECENT_LIMIT = 30;

const noRelationship = () => {
  const e = new Error("No active relationship");
  e.statusCode = 400;
  return e;
};

// Word cues for conversation-type detection (lowercase substring match).
const CUES = {
  planning: ["plan", "let's go", "lets go", "trip", "book", "weekend", "tomorrow", "tonight", "saturday", "sunday", "dinner", "movie", "reservation"],
  celebration: ["congrat", "birthday", "anniversary", "proud of you", "you did it", "celebrate", "promotion", "passed", "🎉", "🥳"],
  apology: ["sorry", "apolog", "my fault", "forgive", "didn't mean", "didnt mean"],
  romantic: ["love you", "miss you", "beautiful", "gorgeous", "my love", "cutie", "❤️", "😍", "😘", "🥰"],
  playful: ["haha", "lol", "lmao", "😂", "🤣", "😜", "😏"],
  stress: ["stressed", "exhausted", "tired", "overwhelmed", "anxious", "worried", "so much work", "can't sleep", "cant sleep"],
};

const NEGATIVE_MOODS = new Set(["sad", "stressed", "angry", "anxious"]);

const countCues = (texts, cues) => {
  let n = 0;
  for (const t of texts) {
    const low = t.toLowerCase();
    for (const cue of cues) if (low.includes(cue)) n += 1;
  }
  return n;
};

/**
 * Classify the conversation state from deterministic signals. Priority order
 * matters: silence > tension > care states > flavour states > default.
 */
const classifyState = (sig) => {
  if (sig.messages24h === 0 && sig.silenceHours >= 20) return "quiet";
  if (sig.negativity >= 0.45 && sig.negCount >= 2) return "tense";
  if (sig.cues.apology > 0 && sig.negativity >= 0.25) return "repairing";
  if (sig.partnerMood && NEGATIVE_MOODS.has(sig.partnerMood)) return "support";
  if (sig.cues.stress >= 2) return "support";
  if (sig.cues.celebration >= 1) return "celebration";
  if (sig.cues.romantic >= 2) return "romantic";
  if (sig.cues.playful >= 2) return "playful";
  if (sig.cues.planning >= 2) return "planning";
  if (sig.positivity >= 0.7 && sig.posCount >= 2) return "positive";
  return "neutral";
};

// Hedged one-line insight per state — always naming the in-app basis.
const INSIGHT_FOR_STATE = {
  quiet: "It's been quiet in here for a while — a small message can restart the flow.",
  tense: "Recent messages carry some tension. Slowing down and listening usually helps.",
  repairing: "It looks like you two are working through something — that effort matters.",
  support: "Your partner may appreciate extra care right now.",
  celebration: "There's something to celebrate in your recent messages 🎉",
  romantic: "Your conversation has been warm and affectionate lately 💗",
  playful: "The mood in here has been light and playful 😄",
  planning: "You two seem to be planning something together.",
  positive: "Today's conversation has been positive and connected.",
  neutral: "A warm message keeps the connection going.",
};

/**
 * Analyze the caller's couple conversation. Returns a plain, serializable
 * snapshot; throws only when the user has no active couple.
 */
const analyzeConversation = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) throw noRelationship();
  const coupleId = user.currentCoupleId;

  const now = Date.now();
  const messages = await Message.find({ coupleId })
    .sort({ createdAt: -1 })
    .limit(RECENT_LIMIT)
    .select("senderId text type createdAt");
  const ordered = messages.slice().reverse(); // oldest first

  const mine = [];
  const theirs = [];
  const texts = [];
  let partnerId = null;
  for (const m of ordered) {
    const isMine = String(m.senderId) === String(userId);
    if (!isMine) partnerId = m.senderId;
    (isMine ? mine : theirs).push(m);
    if (m.type === "text" && m.text) texts.push(m.text);
  }

  // Sentiment over recent text messages.
  let pos = 0;
  let neg = 0;
  for (const t of texts) {
    const s = scoreText(t);
    pos += s.pos;
    neg += s.neg;
  }
  const total = pos + neg;

  // Tempo / silence.
  const last = ordered[ordered.length - 1] || null;
  const lastAt = last ? new Date(last.createdAt).getTime() : null;
  const silenceHours = lastAt ? Math.floor((now - lastAt) / HOUR) : null;
  const messages24h = ordered.filter(
    (m) => now - new Date(m.createdAt).getTime() < 24 * HOUR
  ).length;

  // Average reply delay between alternating senders (minutes, capped).
  let delays = [];
  for (let i = 1; i < ordered.length; i++) {
    if (String(ordered[i].senderId) !== String(ordered[i - 1].senderId)) {
      const gap = new Date(ordered[i].createdAt) - new Date(ordered[i - 1].createdAt);
      if (gap > 0 && gap < 12 * HOUR) delays.push(gap / 60000);
    }
  }
  const avgReplyMins = delays.length
    ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    : null;

  // Short-reply pattern (very short recent texts on either side).
  const recentTexts = texts.slice(-8);
  const shortReplies = recentTexts.filter((t) => t.trim().length <= 8).length;

  const avgLen = (list) => {
    const t = list.filter((m) => m.type === "text" && m.text);
    if (!t.length) return null;
    return Math.round(t.reduce((a, m) => a + m.text.length, 0) / t.length);
  };

  // Both partners' latest logged moods (last 48h; partner's only if not private).
  const [myMoodDoc, partnerMoodDoc] = await Promise.all([
    Mood.findOne({ userId, createdAt: { $gt: new Date(now - 48 * HOUR) } })
      .sort({ createdAt: -1 })
      .select("moodType"),
    partnerId
      ? Mood.findOne({
          userId: partnerId,
          visibility: { $ne: "private" },
          createdAt: { $gt: new Date(now - 48 * HOUR) },
        })
          .sort({ createdAt: -1 })
          .select("moodType")
      : null,
  ]);

  // Couple Pulse — best-effort, never blocks the assistant.
  let pulseScore = null;
  try {
    const { getPulse } = require("../../intelligence");
    const pulse = await getPulse(coupleId);
    pulseScore = pulse?.score ?? null;
  } catch {
    /* pulse optional */
  }

  const signals = {
    messages24h,
    silenceHours,
    avgReplyMins,
    shortReplies,
    myAvgLen: avgLen(mine),
    partnerAvgLen: avgLen(theirs),
    positivity: total ? pos / total : 0.5,
    negativity: total ? neg / total : 0,
    posCount: pos,
    negCount: neg,
    lastSenderIsMe: last ? String(last.senderId) === String(userId) : null,
    partnerMood: partnerMoodDoc?.moodType || null,
    myMood: myMoodDoc?.moodType || null,
    cues: Object.fromEntries(
      Object.entries(CUES).map(([k, v]) => [k, countCues(texts.slice(-14), v)])
    ),
  };

  const state = classifyState(signals);

  return {
    coupleId,
    partnerId,
    state,
    signals,
    pulseScore,
    insight: INSIGHT_FOR_STATE[state] || INSIGHT_FOR_STATE.neutral,
    // The transparency contract: every surface shows this basis line.
    basis: "Based only on your recent CoupleCare messages, mood logs and activity.",
    // Compact transcript for LLM prompts (last 12 exchanges, text only).
    transcript: ordered
      .slice(-12)
      .map((m) => {
        const who = String(m.senderId) === String(userId) ? "Me" : "Partner";
        const body =
          m.type === "text" ? m.text : `[${m.type === "audio" ? "voice note" : m.type}]`;
        return `${who}: ${body}`;
      })
      .join("\n"),
  };
};

module.exports = { analyzeConversation, NEGATIVE_MOODS };
