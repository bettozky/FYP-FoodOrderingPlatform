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

const REQUEST_TIMEOUT_MS = 20_000;

export async function api<T = any>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  // A request that never answers (weak Wi-Fi) must not hang forever: it would leave buttons spinning and stop polling.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  let data: any;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    data = await res.json().catch(() => ({}));
  } catch {
    throw new ApiError(0, `Cannot reach the ScootMeal server at ${API_URL}. Check the backend is running and your phone is on the same Wi-Fi as the PC.`);
  } finally {
    clearTimeout(timer);
  }
  if (data && typeof data === "object" && "serverNow" in data) syncClock((data as any).serverNow);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, (data as any)?.error ?? "Something went wrong");
  }
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
