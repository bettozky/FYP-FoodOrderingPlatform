// Supabase Storage, via its REST API (https://supabase.com/docs/reference/api - storage).
// Photos (dishes, shop logo / cover) go to PUBLIC buckets and the public URL is saved.
// Documents (SSM / halal certificates) go to a PRIVATE bucket: only the path is saved, and the
// admin gets a short-lived signed link to open them.
import { env } from "../config/env.js";
import { HttpError } from "./http.js";

const configured = () => Boolean(env.supabaseUrl && env.supabaseServiceKey);

function headers(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${env.supabaseServiceKey}`, apikey: env.supabaseServiceKey!, ...extra };
}

export const publicUrl = (bucket: string, path: string) => `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const readyBuckets = new Set<string>();

/** Creates the bucket the first time it is used (does nothing if it already exists). */
async function ensureBucket(bucket: string, isPublic: boolean) {
  if (readyBuckets.has(bucket)) return;
  const r = await fetch(`${env.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: bucket, name: bucket, public: isPublic, file_size_limit: 2 * 1024 * 1024,
      allowed_mime_types: isPublic ? IMAGE_TYPES : [...IMAGE_TYPES, "application/pdf"],
    }),
  });
  const body = await r.text();
  if (!r.ok && !/already exists|Duplicate/i.test(body)) throw new Error(`Supabase: could not create bucket ${bucket}: ${r.status} ${body}`);
  readyBuckets.add(bucket);
}

/** Uploads (or replaces) a file. Returns nothing; use publicUrl() or signedUrl() to link to it. */
export async function upload(bucket: string, path: string, data: Buffer, contentType: string, isPublic: boolean) {
  if (!configured()) throw new HttpError(503, "File upload is not set up on the server (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env).");
  // The publishable (public) key cannot create buckets or upload; it needs the secret / service_role key.
  if (env.supabaseServiceKey!.startsWith("sb_publishable_")) {
    throw new HttpError(503, "SUPABASE_SERVICE_ROLE_KEY in backend/.env is the publishable key. Use the secret key (sb_secret_...) from Supabase → Project Settings → API Keys.");
  }
  await ensureBucket(bucket, isPublic);
  const r = await fetch(`${env.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": contentType, "x-upsert": "true", "cache-control": "31536000" }),
    body: new Uint8Array(data),
  });
  if (!r.ok) {
    console.error(`Supabase: upload of ${bucket}/${path} failed: ${r.status} ${await r.text()}`);
    throw new HttpError(502, "Could not upload the file. Please try again.");
  }
}

/** Uploads to a public bucket and returns the public URL. */
export async function uploadPublic(bucket: string, path: string, data: Buffer, contentType: string): Promise<string> {
  await upload(bucket, path, data, contentType, true);
  return publicUrl(bucket, path);
}

/** A link to a private file that works for `expiresIn` seconds, or null if it cannot be made. */
export async function signedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  if (!configured()) return null;
  try {
    const r = await fetch(`${env.supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn }),
    });
    if (!r.ok) {
      console.error(`Supabase: could not sign ${bucket}/${path}: ${r.status} ${await r.text()}`);
      return null;
    }
    const { signedURL } = (await r.json()) as { signedURL: string };
    return `${env.supabaseUrl}/storage/v1${signedURL}`;
  } catch (e) {
    console.error(`Supabase: could not sign ${bucket}/${path}:`, (e as Error).message);
    return null;
  }
}

/** Deletes a file in the background; failures are logged, not thrown. */
export function removeObject(bucket: string, path: string) {
  if (!configured()) return;
  fetch(`${env.supabaseUrl}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: [path] }),
  })
    .then(async (r) => { if (!r.ok) console.error(`Supabase: could not delete ${bucket}/${path}: ${r.status} ${await r.text()}`); })
    .catch((e) => console.error(`Supabase: could not delete ${bucket}/${path}:`, e.message));
}

/** Deletes a file by its public URL. Only files in our own project are touched. */
export function removeByPublicUrl(url: string | undefined) {
  if (!url || !configured()) return;
  const prefix = `${env.supabaseUrl}/storage/v1/object/public/`;
  if (!url.startsWith(prefix)) return;
  const [bucket, ...rest] = url.slice(prefix.length).split("/");
  removeObject(bucket!, rest.join("/"));
}
