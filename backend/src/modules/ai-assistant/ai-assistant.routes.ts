import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { getAssistantContext } from "./ai-assistant.data.js";
import {
  generateReply,
  type ChatMessage,
} from "./ai-assistant.service.js";

export const aiAssistantRouter = Router();

// Only signed-in customers can access these routes.
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
    // Ignore customerId or context supplied by the app.
    const user = currentUser(res);
    const context = getAssistantContext(user.id);

    // Returns reply text and matching dish recommendations.
    const result = await generateReply({
      message,
      history,
      context,
    });

    return res.json(result);
  } catch {
    console.warn("[AI Assistant] Chat request failed.");

    return res.status(500).json({
      error:
        "The assistant is temporarily unavailable. Please try again.",
    });
  }
});

// GET /api/ai/dishes/:id
// Check current availability and price before adding to the cart.
aiAssistantRouter.get("/dishes/:id", (req, res) => {
  const user = currentUser(res);
  const context = getAssistantContext(user.id);

  const dish = context.dishes.find(
    (dish) => dish.id === req.params.id
  );

  const merchant = dish
    ? context.merchants.find(
        (merchant) => merchant.id === dish.merchantId
      )
    : undefined;

  if (!dish || !merchant) {
    return res.status(404).json({
      error: "This dish is no longer available.",
    });
  }

  if (dish.soldOut || !merchant.openNow) {
    return res.status(409).json({
      error: "This dish is not available to order right now.",
    });
  }

  return res.json({
    dish,
    merchant,
  });
});