const KEY = "cc_ai_history";
const MAX = 50;

export const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
};

export const addToHistory = ({ type, title, content, emoji = "✨" }) => {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    content,
    emoji,
    savedAt: new Date().toISOString(),
  };
  const updated = [item, ...loadHistory()].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return item;
};

export const removeFromHistory = (id) => {
  const updated = loadHistory().filter((i) => i.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
};

export const clearHistory = () => localStorage.removeItem(KEY);
