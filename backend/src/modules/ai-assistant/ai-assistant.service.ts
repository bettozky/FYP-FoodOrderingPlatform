import OpenAI from "openai";
import { env } from "../../config/env.js";

export type ChatMessage = { from: "user" | "bot"; text: string };

// Created on first use so the rest of the backend still starts without an OPENAI_API_KEY.
let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set in backend/.env");
  }

  // 10-second timeout for OpenAI API requests, no retries on failure.
  return (client ??= new OpenAI({
    apiKey: env.openaiApiKey,
    timeout: 10_000,
    maxRetries: 0,
  }));
}

// The instructions for the AI assistant
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

function getFallbackReply(message: string): string {
  const text = message.toLowerCase().trim();

  // Randomly select an introduction to indicate that the AI is temporarily unavailable.
  const introductions = [
    "Sorry, I'm temporarily unavailable.",
    "I'm having trouble connecting right now.",
    "Sorry, I can't provide an AI response right now.",
  ];

  const intro =
    introductions[Math.floor(Math.random() * introductions.length)];

  let answer: string;

  // Basic fallback answers for common questions, in English, Malay, and Chinese.
  if (
    /opening hours|business hours|what time|open today|closing time|waktu operasi|waktu buka|pukul berapa|营业时间|几点开|几点关/.test(text)
  ) {
    answer =
      "Opening hours vary by restaurant. I can't confirm them right now, so please check with the restaurant.";
  } else if (
    /pay|payment|bayar|pembayaran|付款|支付/.test(text)
  ) {
    answer =
      "Once the restaurant confirms your order, open the order and follow the payment instructions.";
  } else if (
    /where.*order|order status|track.*order|status pesanan|pesanan.*mana|订单状态|订单.*哪|追踪订单/.test(text)
  ) {
    answer =
      "You can check your order in the app's Orders section. I can't confirm its current status right now.";
  } else if (
    /how.*order|place.*order|how.*cart|add.*cart|cara.*pesan|cara.*order|cara.*tempah|怎么下单|如何下单|怎么点餐|购物车/.test(text)
  ) {
    answer =
      "Browse the menu, select a dish, add it to your cart, then review your order before submitting it.";
  } else {
    answer =
      "You can still browse the menu and manage your orders in the app. For quick help, ask about opening hours, how to order, or how to pay.";
  }

  return `${intro}\n\n${answer}\n\nPlease try chatting again shortly.`;
}

export async function generateReply(params: {
  message: string;
  history?: ChatMessage[];
  context?: unknown;
}): Promise<string> {
  const { message, history, context } = params;

  const historyText =
    history
      ?.map(
        (msg) =>
          `${msg.from === "user" ? "Customer" : "Assistant"}: ${msg.text}`
      )
      .join("\n") || "No previous conversation.";

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

  try {
    const response = await getClient().responses.create({
      model: env.aiModel,
      instructions: INSTRUCTIONS,
      input,
    });

    const reply = response.output_text?.trim();

    if (!reply) {
      throw new Error("Empty AI response");
    }

    return reply;
  } catch {
    console.warn("[AI Assistant] Using fallback reply.");

    return getFallbackReply(message);
  }
}