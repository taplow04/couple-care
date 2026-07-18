const asyncHandler = require("../../utils/asyncHandler");
const service = require("./chatAssistant.service");

// GET /chat-assistant/context — instant deterministic payload (no LLM).
const context = asyncHandler(async (req, res) => {
  const data = await service.getContext(req.user._id);
  res.json({ success: true, data });
});

// POST /chat-assistant/suggestions — { mode?, draft? } → AI suggestions.
const suggestions = asyncHandler(async (req, res) => {
  const data = await service.getSuggestions(req.user._id, {
    mode: req.body?.mode,
    draft: req.body?.draft,
  });
  res.json({ success: true, data });
});

// POST /chat-assistant/rephrase — { draft, tone? } → up to 3 rewrites.
const rephrase = asyncHandler(async (req, res) => {
  const data = await service.rephrase(req.user._id, {
    draft: req.body?.draft,
    tone: req.body?.tone,
  });
  res.json({ success: true, data });
});

// POST /chat-assistant/draft-check — { draft } → advisory tone notes.
const draftCheck = asyncHandler(async (req, res) => {
  const data = await service.checkDraft(req.user._id, { draft: req.body?.draft });
  res.json({ success: true, data });
});

module.exports = { context, suggestions, rephrase, draftCheck };
