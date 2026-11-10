// Speech-to-text for the AI assistant's microphone button.
// The app records a short voice message and uploads it; OpenAI turns it into text here on the server,
// so the API key never leaves the backend. The text goes back to the app, where the customer can check it
// before sending it to /api/ai/chat like a typed message.
import OpenAI, { toFile } from "openai";

import { env } from "../../config/env.js";

// Created on first use so the backend still starts without an OPENAI_API_KEY.
let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set in backend/.env");
  }

  // Transcribing takes longer than a short chat reply, so this client gets a longer timeout.
  return (client ??= new OpenAI({
    apiKey: env.openaiApiKey,
    timeout: 30_000,
    maxRetries: 0,
  }));
}

/**
 * Works out the audio format from the file's first bytes, not from the label the app sent
 * (phones and browsers label recordings inconsistently). Returns the file extension OpenAI
 * expects, or undefined if this is not a format OpenAI accepts.
 */
export function audioExt(buffer: Buffer): "webm" | "m4a" | "wav" | "mp3" | undefined {
  if (buffer.length < 12) return undefined;

  // WebM / Matroska: Chrome, Edge and Firefox recordings.
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "webm";

  // MP4 / M4A ("ftyp" box at byte 4): iPhone, Android (expo-audio) and Safari recordings.
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") return "m4a";

  // WAV.
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WAVE") return "wav";

  // MP3, with or without an ID3 tag.
  if (buffer.subarray(0, 3).toString("latin1") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return "mp3";

  return undefined;
}

/**
 * Dish and shop names as transcription hints, so "nasi lemak" or "char kuey teow" come back spelled
 * the way they are on the menu. Keywords must not contain <, > or line breaks, or OpenAI rejects the request.
 */
export function speechKeywords(names: string[], max = 50): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const raw of ["ScootMeal", ...names]) {
    const name = raw.replace(/[<>\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    const key = name.toLowerCase();

    if (!name || seen.has(key)) continue;

    seen.add(key);
    keywords.push(name);

    if (keywords.length >= max) break;
  }

  return keywords;
}

/** Turns a recorded voice message into text. Returns "" when no speech was heard. */
export async function transcribeAudio(input: {
  audio: Buffer;
  ext: string;
  keywords: string[];
}): Promise<string> {
  const file = await toFile(input.audio, `voice.${input.ext}`);

  const transcription = await getClient().audio.transcriptions.create({
    model: env.sttModel,
    file,
    // Hints only. The customer may speak English, Malay, Mandarin or a mix, so the language is detected
    // automatically unless STT_LANGUAGES narrows it down.
    keywords: input.keywords.length ? input.keywords : undefined,
    languages: env.sttLanguages.length ? env.sttLanguages : undefined,
  });

  return (transcription.text ?? "").trim();
}