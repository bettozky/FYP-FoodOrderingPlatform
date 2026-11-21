// Tiny fetch wrapper for the ScootMeal backend. Every call sends the login token.
import { API_URL } from "../config";
import i18n from "i18next";

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
const UPLOAD_TIMEOUT_MS = 90_000; // photos and documents over Wi-Fi take longer

export async function api<T = any>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  // A request that never answers (weak Wi-Fi) must not hang forever: it would leave buttons spinning and stop polling.
  const controller = new AbortController();
  // A FormData body is a file upload (see shared/util/files.ts): no JSON headers, longer timeout.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const timer = setTimeout(() => controller.abort(), isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  let res: Response;
  let data: any;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
    data = await res.json().catch(() => ({}));
  } catch {
    throw new ApiError(0, i18n.t("errors.noServer", { url: API_URL }));
  } finally {
    clearTimeout(timer);
  }
  if (data && typeof data === "object" && "serverNow" in data) syncClock((data as any).serverNow);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, (data as any)?.error ?? i18n.t("errors.generic"));
  }
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : i18n.t("errors.generic"));
