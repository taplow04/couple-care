import api from "../api/axios";

// Instant deterministic payload: insight, dynamic chips, suggestions, repair.
export const getAssistantContext = async () => {
  const response = await api.get("/chat-assistant/context");
  return response.data;
};

// AI suggestions for a mode (draft-aware). Falls back server-side.
export const getAssistantSuggestions = async ({ mode, draft } = {}) => {
  const response = await api.post("/chat-assistant/suggestions", { mode, draft });
  return response.data;
};

// Rephrase the current draft in a tone (calmer/warmer/clearer/…).
export const rephraseDraft = async ({ draft, tone } = {}) => {
  const response = await api.post("/chat-assistant/rephrase", { draft, tone });
  return response.data;
};

// Deterministic, advisory-only tone check of a draft. Never blocks sending.
export const checkDraft = async (draft) => {
  const response = await api.post("/chat-assistant/draft-check", { draft });
  return response.data;
};
