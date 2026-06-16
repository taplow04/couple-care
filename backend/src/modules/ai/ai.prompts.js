// Shared output contract: short, mobile-friendly, 3 bulleted sections.
// Every text report uses this so the UI can render it consistently and users
// get scannable insight instead of walls of text.
const CONCISE_FORMAT = `
Format your ENTIRE response EXACTLY like this, and output nothing else:

Strengths
• short point
• short point

Opportunities
• short point
• short point

Suggestions
• short point
• short point

Rules:
- Maximum 5 bullets per section; aim for 3.
- Each bullet is ONE short line (max ~12 words): warm, specific, practical.
- Begin every bullet with "• ".
- Use ONLY the three section titles above (no other headings).
- No introduction, no conclusion, no markdown bold/italics, no emojis.
`;

const buildWeeklySummaryPrompt = ({
  moods,
  memories,
  histories,
  relationshipStatus,
  daysTogether,
}) => {
  return `
You are an expert relationship coach reviewing a couple's week.

Relationship status: ${relationshipStatus}
Days together: ${daysTogether}

Mood entries (most recent first):
${JSON.stringify(moods, null, 2)}

Relationship histories:
${JSON.stringify(histories, null, 2)}

Shared memories:
${JSON.stringify(memories, null, 2)}

Write a supportive weekly snapshot for this couple.
${CONCISE_FORMAT}`;
};

const buildMoodAnalysisPrompt = ({ moods }) => {
  return `
You are an emotional wellness coach analyzing a person's recent moods.

Mood entries (most recent first):
${JSON.stringify(moods, null, 2)}

Identify emotional strengths, stress/risk areas, and what could help.
Map them to the sections: Strengths = positive emotional patterns,
Opportunities = stressors or things to watch, Suggestions = practical next steps.
${CONCISE_FORMAT}`;
};

const buildMemoryRecapPrompt = ({ memories }) => {
  return `
You are a warm relationship storyteller summarizing a couple's journey.

Shared memories (most recent first):
${JSON.stringify(memories, null, 2)}

Reflect on their journey so far. Map to the sections: Strengths = what their
memories reveal they do well, Opportunities = experiences worth adding,
Suggestions = ideas for new memories to make together.
${CONCISE_FORMAT}`;
};

const buildRelationshipInsightsPrompt = ({
  moods,
  memories,
  histories,
  healthScore,
}) => {
  return `
Act as an expert relationship coach.

Relationship health score (0-100): ${healthScore}

Mood data:
${JSON.stringify(moods, null, 2)}

Memory data:
${JSON.stringify(memories, null, 2)}

History data:
${JSON.stringify(histories, null, 2)}

Give clear, actionable relationship insight.
${CONCISE_FORMAT}`;
};

module.exports = {
  buildWeeklySummaryPrompt,
  buildMoodAnalysisPrompt,
  buildMemoryRecapPrompt,
  buildRelationshipInsightsPrompt,
};
