// Short-lived links to private files (CVs, certificates), so a phone can open them without sending a login header.
//   GET /api/files/<token>  - the token says which file and until when; it is signed with a secret kept on the server.
// With Supabase Storage the link redirects to a Supabase signed URL; locally the server sends the file itself.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env.js";

const SECRET = process.env.FILE_LINK_SECRET || randomBytes(32).toString("hex"); // random per start-up is fine: links last an hour

export interface FileRef { bucket: string; path: string; name: string; mimeType: string }

const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("base64url");

export function fileToken(ref: FileRef, ttlSeconds = 3600): string {
  const body = Buffer.from(JSON.stringify({ ...ref, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readFileToken(token: string): FileRef | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  try {
    const { exp, ...ref } = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof exp === "number" && exp > Date.now() ? (ref as FileRef) : null;
  } catch { return null; }
}

/** Absolute link the apps can open. */
export function fileLink(req: Request, ref: FileRef): string {
  const origin = env.publicUrl ?? `${req.protocol}://${req.get("host")}`;
  return `${origin}/api/files/${fileToken(ref)}`;
}
