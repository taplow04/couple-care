const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const generateAIResponse = async (prompt, temperature = 0.7) => {
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
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error.message);
    throw new Error("Failed to generate AI response. Please try again later.");
  }
};

module.exports = {
  generateAIResponse,
};
