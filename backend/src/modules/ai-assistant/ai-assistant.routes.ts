import { Router, type RequestHandler } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http.js";
import { auth, currentUser } from "../../middleware/auth.js";
import { getAssistantContext } from "./ai-assistant.data.js";
import {
  generateReply,
  type ChatMessage,
} from "./ai-assistant.service.js";
import {
  audioExt,
  speechKeywords,
  transcribeAudio,
} from "./ai-assistant.speech.js";

export const aiAssistantRouter = Router();

// Only signed-in customers can access these routes.
aiAssistantRouter.use(auth("customer"));

// One voice recording in the "audio" field, kept in memory (it is never saved).
const singleAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.sttMaxMb * 1024 * 1024, files: 1 },
}).single("audio");

const readAudio: RequestHandler = (req, res, next) =>
  singleAudio(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(
        new HttpError(
          400,
          err.code === "LIMIT_FILE_SIZE"
            ? "That voice message is too long. Please keep it under a minute."
            : 'Send one recording in the "audio" field.'
        )
      );
    }
    next(err);
  });

// POST /api/ai/transcribe  (multipart/form-data, field "audio")
// Turns a voice message into text. The app puts the text in the message box so the
// customer can check it before sending it to /api/ai/chat.
aiAssistantRouter.post("/transcribe", readAudio, async (req, res) => {
  const file = req.file;

  if (!file || file.size === 0) {
    throw new HttpError(400, "No recording was received. Please try again.");
  }

  const ext = audioExt(file.buffer);

  if (!ext) {
    throw new HttpError(400, "This recording format is not supported.");
  }

  // Menu names help the model spell local dishes correctly.
  const user = currentUser(res);
  const context = getAssistantContext(user.id);
  const keywords = speechKeywords([
    ...context.dishes.map((dish) => dish.name),
    ...context.merchants.map((merchant) => merchant.name),
  ]);

  let text: string;

  try {
    text = await transcribeAudio({ audio: file.buffer, ext, keywords });
    } catch (err) {
    console.warn("[AI Assistant] Transcription failed:", err instanceof Error ? err.message : err);
    throw new HttpError(
      503,
      "Voice input is unavailable right now. Please type your message instead."
    );
  }

  if (!text) {
    throw new HttpError(422, "I couldn't hear anything. Please try again.");
  }

  return res.json({ text: text.slice(0, 2000) });
});

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