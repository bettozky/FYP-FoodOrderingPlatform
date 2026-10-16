import OpenAI from "openai";
import { env } from "../../config/env.js";

export type ChatMessage = { from: "user" | "bot"; text: string };

// Created on first use so the rest of the backend still starts without an OPENAI_API_KEY.
let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!env.openaiApiKey) throw new Error("OPENAI_API_KEY is not set in backend/.env");
  return (client ??= new OpenAI({ apiKey: env.openaiApiKey }));
}

const INSTRUCTIONS = `
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
`;

export async function generateReply(params: {
  message: string;
  history?: ChatMessage[];
  context?: unknown;
}): Promise<string> {
  const { message, history, context } = params;

  const historyText =
    history?.map((msg) => `${msg.from === "user" ? "Customer" : "Assistant"}: ${msg.text}`).join("\n") ||
    "No previous conversation.";

  const input = `
Conversation history:
${historyText}

Latest customer message:
${message}

ScootMeal prototype data:
${context ? JSON.stringify(context) : "No ScootMeal data was provided."}

Use the conversation history to understand follow-up messages such as:
"yes", "no", "the first one", "cheaper", "something else", or "add that".

Use the ScootMeal prototype data above when it contains information relevant to the customer's request.
`;

  const response = await getClient().responses.create({
    model: env.aiModel,
    instructions: INSTRUCTIONS,
    input,
  });

  return response.output_text;
}
