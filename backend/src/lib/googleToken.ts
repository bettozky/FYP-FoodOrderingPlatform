// Checks a Google "ID token" (the signed proof that someone signed in with Google) without any extra package:
// signature against Google's published keys, who it was issued for (our client IDs), who issued it, and that it has not expired.
import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "./http.js";

export interface GoogleProfile { sub: string; email: string; name: string; picture?: string }

let keys: { at: number; byId: Map<string, JsonWebKey> } | null = null;

async function loadKeys(force = false) {
  if (!force && keys && Date.now() - keys.at < 3600_000) return keys.byId;
  const r = await fetch(env.googleCertsUrl, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`certs ${r.status}`);
  const body = (await r.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
  const byId = new Map<string, JsonWebKey>();
  for (const k of body.keys ?? []) if (k.kid) byId.set(k.kid, k);
  keys = { at: Date.now(), byId };
  return byId;
}

const b64 = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export async function verifyGoogleIdToken(idToken: unknown): Promise<GoogleProfile> {
  if (!env.googleClientIds.length) throw new HttpError(503, "Google sign-in is not set up on this server yet.");
  const bad = () => new HttpError(401, "Google sign-in could not be verified. Please try again.");
  if (typeof idToken !== "string" || idToken.split(".").length !== 3 || idToken.length > 4000) throw bad();
  const [h, p, sig] = idToken.split(".") as [string, string, string];
  let header: any, claims: any;
  try { header = JSON.parse(b64(h).toString()); claims = JSON.parse(b64(p).toString()); } catch { throw bad(); }
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw bad();

  let jwk: JsonWebKey | undefined;
  try {
    jwk = (await loadKeys()).get(header.kid) ?? (await loadKeys(true)).get(header.kid);
  } catch { throw new HttpError(502, "Could not reach Google to check your sign-in. Please try again."); }
  if (!jwk) throw bad();
  let valid = false;
  try { valid = verify("RSA-SHA256", Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: "jwk" }), b64(sig)); } catch { valid = false; }
  if (!valid) throw bad();

  const now = Math.floor(Date.now() / 1000);
  if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)) throw bad();
  if (!env.googleClientIds.includes(claims.aud)) throw bad();
  if (typeof claims.exp !== "number" || claims.exp < now - 30) throw new HttpError(401, "That Google sign-in has expired. Please try again.");
  if (typeof claims.sub !== "string" || !claims.sub) throw bad();
  if (typeof claims.email !== "string" || !(claims.email_verified === true || claims.email_verified === "true"))
    throw new HttpError(403, "Your Google email is not verified, so it cannot be used to sign in.");
  const email = claims.email.toLowerCase();
  return { sub: claims.sub, email, name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : email.split("@")[0]!, picture: typeof claims.picture === "string" ? claims.picture : undefined };
}
