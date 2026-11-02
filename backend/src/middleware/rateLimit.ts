import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http.js";

/** Tiny in-memory rate limiter: at most `max` requests per minute per client address and route group. */
export function rateLimit(max: number, name = "api") {
  const hits = new Map<string, { n: number; reset: number }>();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, 60_000).unref();
  return (req: Request, _res: Response, next: NextFunction) => {
    if (max <= 0) return next();
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + 60_000 }); return next(); }
    if (++h.n > max) throw new HttpError(429, "Too many requests. Please wait a minute and try again.");
    next();
  };
}
