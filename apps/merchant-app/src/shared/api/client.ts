// Tiny fetch wrapper for the ScootMeal backend. Every call sends the login token.
import { API_URL } from "../config";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let token: string | null = null;
let clockOffset = 0; // server time minus device time (NFR-2: countdowns run on server time)

export const setToken = (t: string | null) => {
  token = t;
};

export function syncClock(serverNow: unknown) {
  if (typeof serverNow === "number") clockOffset = serverNow - Date.now();
}
/** Current time according to the server. */
export const serverTime = () => Date.now() + clockOffset;

let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function api<T = any>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the ScootMeal server. Make sure the backend is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (data && typeof data === "object" && "serverNow" in data) syncClock((data as any).serverNow);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, (data as any)?.error ?? "Something went wrong");
  }
  return data as T;
}

/** Sends one file as multipart/form-data in the "file" field (e.g. a dish photo). */
export async function apiUpload<T = any>(
  path: string,
  file: { uri: string; name: string; mimeType: string; file?: unknown },
  fields: Record<string, string> = {}
): Promise<T> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  // Web gives a real File; on phones React Native accepts { uri, name, type }.
  form.append("file", (file.file ?? { uri: file.uri, name: file.name, type: file.mimeType }) as any);
  let res: Response;
  try {
    // No Content-Type header: fetch adds the multipart boundary itself.
    res = await fetch(`${API_URL}/api${path}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  } catch {
    throw new ApiError(0, "Cannot reach the ScootMeal server. Make sure the backend is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, (data as any)?.error ?? "Upload failed");
  }
  return data as T;
}

export const errorText =(e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
