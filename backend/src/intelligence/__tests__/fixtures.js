/**
 * Deterministic fixtures for CCIE engine tests. A FIXED `NOW` makes every
 * time-relative computation reproducible (engines take `now` explicitly).
 */
const NOW = Date.parse("2026-06-28T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const A = "aaaaaaaaaaaaaaaaaaaaaaaa"; // 24-hex stand-ins for ObjectIds
const B = "bbbbbbbbbbbbbbbbbbbbbbbb";

const ago = (days) => new Date(NOW - days * DAY);

const mood = (userId, moodType, intensity, days) => ({
  userId,
  moodType,
  intensity,
  createdAt: ago(days),
});

const msg = (senderId, days, text = "hello there") => ({
  senderId,
  text,
  createdAt: ago(days),
});

const memory = (days, memoryType = "date") => ({
  memoryType,
  memoryDate: ago(days),
  createdAt: ago(days),
});

// A healthy, reciprocal couple with varied recent activity.
const healthyCouple = () => {
  const moods = [
    mood(A, "happy", 7, 1), mood(B, "loved", 8, 1),
    mood(A, "excited", 6, 3), mood(B, "happy", 7, 4),
    mood(A, "happy", 6, 6), mood(B, "loved", 8, 8),
  ];
  const messages = [];
  for (let d = 0; d < 14; d++) {
    messages.push(msg(A, d, "thinking of you love"));
    messages.push(msg(B, d, "miss you so much"));
  }
  const memories = [memory(2, "date"), memory(10, "trip"), memory(20, "milestone")];
  return {
    moods,
    messages,
    memories,
    moodsA: moods.filter((m) => m.userId === A),
    moodsB: moods.filter((m) => m.userId === B),
    partnerIds: [A, B],
    daysTogether: 400,
    now: NOW,
  };
};

// An inactive couple — no recent data at all.
const inactiveCouple = () => ({
  moods: [],
  messages: [],
  memories: [],
  moodsA: [],
  moodsB: [],
  partnerIds: [A, B],
  daysTogether: 400,
  now: NOW,
});

// A brand-new couple (< 30 days).
const newCouple = () => ({
  ...inactiveCouple(),
  moods: [mood(A, "excited", 8, 1), mood(B, "happy", 7, 1)],
  messages: [msg(A, 1), msg(B, 1)],
  memories: [],
  moodsA: [mood(A, "excited", 8, 1)],
  moodsB: [mood(B, "happy", 7, 1)],
  daysTogether: 5,
  now: NOW,
});

// One partner spamming identical messages in a single day.
const spamBurst = () => {
  const messages = [];
  for (let i = 0; i < 80; i++) {
    messages.push({ senderId: A, text: "hi", createdAt: new Date(NOW - i * 1000) });
  }
  return messages;
};

module.exports = { NOW, DAY, A, B, ago, mood, msg, memory, healthyCouple, inactiveCouple, newCouple, spamBurst };
