import { Router } from "express";
import { generateReply, type ChatMessage } from "./ai-assistant.service.js";

export const aiAssistantRouter = Router();

// POST /api/ai/chat
aiAssistantRouter.post("/chat", async (req, res) => {
  try {
    const { message, history, context } = req.body as {
      message?: string;
      history?: ChatMessage[];
      context?: unknown;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const reply = await generateReply({ message, history, context });
    res.json({ reply });
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});
