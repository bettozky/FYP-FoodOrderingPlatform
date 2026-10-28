// Talks to the backend (backend/src/modules/*). Set VITE_API_URL in apps/web-admin/.env to change the server.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || "http://localhost:3001";

const TOKEN_KEY = "scootmeal-admin-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // private window: the admin just logs in again next time
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_URL}. Is the backend running?`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || data.message || `Request failed (${res.status})`);
  return data as T;
}
