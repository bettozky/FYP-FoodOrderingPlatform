import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { approvedMerchant, auth } from "../../middleware/auth.js";
import type { ChatMessage } from "./ai-assistant.service.js";
import { getMerchantContext } from "./ai-merchant.data.js";
import { generateMerchantReply } from "./ai-merchant.service.js";

// Merchant assistant routes, mounted at /api/ai/merchant (see ai-assistant.routes.ts).
export const aiMerchantRouter = Router();

// Only signed-in merchants.
aiMerchantRouter.use(auth("merchant"));

// POST /api/ai/merchant/chat  { message, history? }
aiMerchantRouter.post("/chat", async (req, res) => {
  const body = req.body ?? {};

  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new HttpError(400, "Please enter a message.");
  }

  const message = body.message.trim();

  if (message.length > 2000) {
    throw new HttpError(400, "Please keep your message under 2,000 characters.");
  }

  // Same history limits as the customer assistant: last 20 messages, each cut to 4,000 characters.
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
        .map((item: ChatMessage) => ({ from: item.from, text: item.text.slice(0, 4000) }))
    : [];

  // The stall comes from the login token (never from the request), and it must be approved.
  const merchant = approvedMerchant(res);
  const context = getMerchantContext(merchant);

  res.json(await generateMerchantReply({ message, history, context }));
});