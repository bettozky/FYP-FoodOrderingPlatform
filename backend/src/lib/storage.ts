// File storage for photos and documents.
//   - With SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: Supabase Storage (public buckets for photos, a private bucket
//     for certificates; the admin gets a link that works for one hour).
//   - Without them: files are kept on this computer in backend/public/uploads (photos, served at /media/uploads/...)
//     and backend/private-uploads (certificates, never served). Good for development.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env, usingSupabaseStorage } from "../config/env.js";
import { HttpError } from "./http.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const LOCAL_PUBLIC_DIR = `${ROOT}public/uploads`;
const LOCAL_PRIVATE_DIR = `${ROOT}private-uploads`;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const readyBuckets = new Set<string>();

function headers(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${env.supabaseServiceKey}`, apikey: env.supabaseServiceKey!, ...extra };
}

/** Creates the bucket the first time it is used (does nothing if it already exists). */
async function ensureBucket(bucket: string, isPublic: boolean) {
  if (readyBuckets.has(bucket)) return;
  const r = await fetch(`${env.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: bucket, name: bucket, public: isPublic, file_size_limit: env.maxUploadMb * 1024 * 1024,
      allowed_mime_types: isPublic ? IMAGE_TYPES : [...IMAGE_TYPES, "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    }),
  });
  const body = await r.text();
  if (!r.ok && !/already exists|Duplicate/i.test(body)) throw new Error(`Supabase: could not create bucket ${bucket}: ${r.status} ${body}`);
  readyBuckets.add(bucket);
}

export interface StoredFile {
  bucket: string;
  path: string;
  /** Link to open the file. Always set for public files; private files get one from signedUrl(). */
  url?: string;
}

/** Saves a file. `isPublic` photos get a permanent URL; documents are private. */
export async function saveFile(bucket: string, path: string, data: Buffer, contentType: string, isPublic: boolean): Promise<StoredFile> {
  if (!usingSupabaseStorage) {
    const file = `${isPublic ? LOCAL_PUBLIC_DIR : LOCAL_PRIVATE_DIR}/${bucket}/${path}`;
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    const rel = `/media/uploads/${bucket}/${path}`;
    return { bucket, path, url: isPublic ? (env.publicUrl ? env.publicUrl + rel : rel) : undefined };
  }
  // The publishable (public) key cannot create buckets or upload; it needs the secret / service_role key.
  if (env.supabaseServiceKey!.startsWith("sb_publishable_")) {
    throw new HttpError(503, "SUPABASE_SERVICE_ROLE_KEY in backend/.env is the publishable key. Use the secret key (sb_secret_...) from Supabase -> Project Settings -> API Keys.");
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
  return { bucket, path, url: isPublic ? `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}` : undefined };
}

/** A link to a private file that works for `expiresIn` seconds, or null if it cannot be made (e.g. local storage). */
export async function signedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  if (!usingSupabaseStorage) return null;
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

/** Deletes an uploaded file in the background; failures are logged, not thrown. Only our own files are touched. */
export function removeByUrl(url: string | undefined) {
  if (!url) return;
  const supa = usingSupabaseStorage ? `${env.supabaseUrl}/storage/v1/object/public/` : "";
  if (supa && url.startsWith(supa)) {
    const [bucket, ...rest] = url.slice(supa.length).split("/");
    removeObject(bucket!, rest.join("/"));
    return;
  }
  const i = url.indexOf("/media/uploads/");
  if (i >= 0 && !url.includes("..")) void rm(`${LOCAL_PUBLIC_DIR}/${url.slice(i + "/media/uploads/".length)}`, { force: true }).catch(() => {});
}

export function removeObject(bucket: string, path: string) {
  if (!usingSupabaseStorage) {
    if (!path.includes("..")) void rm(`${LOCAL_PRIVATE_DIR}/${bucket}/${path}`, { force: true }).catch(() => {});
    return;
  }
  fetch(`${env.supabaseUrl}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: [path] }),
  })
    .then(async (r) => { if (!r.ok) console.error(`Supabase: could not delete ${bucket}/${path}: ${r.status} ${await r.text()}`); })
    .catch((e) => console.error(`Supabase: could not delete ${bucket}/${path}:`, e.message));
}

/** Reads a private file from this computer (only used when Supabase Storage is not set up). */
export async function readLocalPrivate(bucket: string, path: string): Promise<Buffer | null> {
  if (usingSupabaseStorage || path.includes("..")) return null;
  try { return await readFile(`${LOCAL_PRIVATE_DIR}/${bucket}/${path}`); } catch { return null; }
}
