import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { getAssistantContext } from "./ai-assistant.data.js";
import {
  generateReply,
  type ChatMessage,
} from "./ai-assistant.service.js";

export const aiAssistantRouter = Router();

// Only signed-in customers can use this route.
aiAssistantRouter.use(auth("customer"));

// POST /api/ai/chat
aiAssistantRouter.post("/chat", async (req, res) => {
  try {
    const body = req.body ?? {};

    if (
      typeof body.message !== "string" ||
      !body.message.trim()
    ) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    const message = body.message.trim();

    if (message.length > 2000) {
      return res.status(400).json({
        error: "Please keep your message under 2,000 characters.",
      });
    }

    // Validate and limit conversation history from the app.
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (item: unknown): item is ChatMessage =>
              typeof item === "object" &&
              item !== null &&
              "from" in item &&
              (item.from === "user" || item.from === "bot") &&
              "text" in item &&
              typeof item.text === "string"
          )
          .slice(-20)
          .map((item: ChatMessage) => ({
            from: item.from,
            text: item.text.slice(0, 4000),
          }))
      : [];

    // Identity comes from the verified login token.
    // Ignore any customerId or context supplied by the app.
    const user = currentUser(res);
    const context = getAssistantContext(user.id);

    const reply = await generateReply({
      message,
      history,
      context,
    });

    return res.json({ reply });
  } catch {
    console.warn("[AI Assistant] Chat request failed.");

    return res.status(500).json({
      error: "The assistant is temporarily unavailable. Please try again.",
    });
  }
});