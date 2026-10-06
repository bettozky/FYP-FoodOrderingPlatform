import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "ScootMeal backend is running",
  });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const response = await openai.responses.create({
      model: "gpt-6-luna",

      instructions: `
You are ScootMeal AI, the customer assistant for a food ordering application in Malaysia.

Your role is to help customers:
- discover food
- get food recommendations
- answer basic menu questions
- help with order-related questions
- understand how to use ScootMeal

Language rules:
- Respond in English when the user writes in English.
- Respond in Bahasa Malaysia when the user writes in Malay.
- Respond in Mandarin Chinese when the user writes in Chinese.
- Understand mixed Malaysian language usage when possible.

Important rules:
- Do not invent real restaurants, menu prices, order status, or availability.
- If real ScootMeal data is required, explain that live data integration is not connected yet.
- Do not claim that a food is allergy-safe unless verified information is available.
- Keep responses helpful and fairly concise.

Formatting rules:
- Return plain text only.
- Do not use Markdown.
- Do not use **bold** formatting.
- Do not use asterisks.
- Do not use headings or Markdown bullet points.
      `,

      input: `
Conversation history:
${history
  ?.map(
    (msg) =>
      `${msg.from === "user" ? "Customer" : "Assistant"}: ${msg.text}`
  )
  .join("\n") || "No previous conversation."}

Latest customer message:
${message}

ScootMeal prototype data:
${context ? JSON.stringify(context) : "No ScootMeal data was provided."}

Use the conversation history to understand follow-up messages such as:
"yes", "no", "the first one", "cheaper", "something else", or "add that".

Use the ScootMeal prototype data above when it contains information relevant to the customer's request.
`,
    });

    res.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error("OpenAI error:", error);

    res.status(500).json({
      error: "Failed to generate AI response",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ScootMeal backend running on port ${PORT}`);
});