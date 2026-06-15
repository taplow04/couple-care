const buildWeeklySummaryPrompt = ({
  moods,
  memories,
  histories,
  relationshipStatus,
  daysTogether,
}) => {
  return `
You are an expert relationship coach.

Relationship Status:
${relationshipStatus}

Days Together:
${daysTogether}

Mood Entries:
${JSON.stringify(moods, null, 2)}

Relationship Histories:
${JSON.stringify(histories, null, 2)}

Shared Memories:
${JSON.stringify(memories, null, 2)}

Generate:

1. Weekly Summary
2. Positive Observations
3. Potential Concerns
4. Suggestions For Improvement

Keep the response supportive and practical.
`;
};

const buildMoodAnalysisPrompt = ({ moods }) => {
  return `
You are an emotional wellness coach.

Analyze these mood entries:

${JSON.stringify(moods, null, 2)}

Provide:

1. Mood Patterns
2. Positive Signs
3. Stress Indicators
4. Recommendations
`;
};

const buildMemoryRecapPrompt = ({ memories }) => {
  return `
You are a relationship storyteller.

Analyze these memories:

${JSON.stringify(memories, null, 2)}

Create:

1. Relationship Journey Summary
2. Key Milestones
3. Memorable Moments
`;
};

const buildRelationshipInsightsPrompt = ({
  moods,
  memories,
  histories,
  healthScore,
}) => {
  return `
Act as an expert relationship coach.

Relationship Health Score:
${healthScore}

Mood Data:
${JSON.stringify(moods, null, 2)}

Memory Data:
${JSON.stringify(memories, null, 2)}

History Data:
${JSON.stringify(histories, null, 2)}

Provide:

1. Strengths
2. Weaknesses
3. Communication Advice
4. Growth Suggestions
`;
};

module.exports = {
  buildWeeklySummaryPrompt,
  buildMoodAnalysisPrompt,
  buildMemoryRecapPrompt,
  buildRelationshipInsightsPrompt,
};
