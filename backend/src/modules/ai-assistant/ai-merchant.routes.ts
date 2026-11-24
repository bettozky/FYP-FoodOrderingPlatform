import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { approvedMerchant, auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { ChatMessage } from "./ai-assistant.service.js";
import { readAudio, speechKeywords, transcribeUpload } from "./ai-assistant.speech.js";
import { answerAction } from "./ai-merchant.actions.js";
import { getMerchantContext } from "./ai-merchant.data.js";
import { generateMerchantReply, speakMoney } from "./ai-merchant.service.js";

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

  res.json(await generateMerchantReply({ message, history, context, merchant }));
});

// POST /api/ai/merchant/actions/:id  { answer: "yes" | "no" }
// The merchant's answer to a proposed change (sold out, busy mode, deal). Only "yes" changes anything.
// Each proposal works once, for 2 minutes, and only for the merchant it was made for.
aiMerchantRouter.post("/actions/:id", (req, res) => {
  const answer = req.body?.answer;
  if (answer !== "yes" && answer !== "no") throw new HttpError(400, 'answer must be "yes" or "no"');

  const merchant = approvedMerchant(res);
  const result = answerAction(merchant, String(req.params.id), answer === "yes");
  if (result.status === "expired") throw new HttpError(410, result.reply);

  res.json({ ...result, spoken: speakMoney(result.reply, result.language) });
});

// POST /api/ai/merchant/transcribe  (multipart/form-data, field "audio")
// Turns the merchant's voice message into text. The stall's own dish names are spelling hints,
// so "char kuey teow" comes back the way it is written on their menu.
aiMerchantRouter.post("/transcribe", readAudio, async (req, res) => {
  const merchant = approvedMerchant(res);
  const dishNames = [...db.dishes.values()].filter((d) => d.merchantId === merchant.id).map((d) => d.name);
  const keywords = speechKeywords([merchant.name, ...dishNames]);

  res.json({ text: await transcribeUpload(req.file, keywords) });
});