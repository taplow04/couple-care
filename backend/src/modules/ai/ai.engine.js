const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Cap tokens so reports stay short and snappy (the prompts already ask for
// brief bulleted output; this is a hard ceiling).
const generateAIResponse = async (prompt, temperature = 0.6, maxTokens = 500) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error.message);
    throw new Error("Failed to generate AI response. Please try again later.");
  }
};

/**
 * Multi-turn variant for conversational features (AI Coach). Takes a full
 * messages array ([{ role: "system"|"user"|"assistant", content }]) so prior
 * turns provide context. Same model/limits philosophy as generateAIResponse.
 */
const generateChatResponse = async (messages, temperature = 0.7, maxTokens = 600) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error.message);
    throw new Error("Failed to generate AI response. Please try again later.");
  }
};

module.exports = {
  generateAIResponse,
  generateChatResponse,
};
