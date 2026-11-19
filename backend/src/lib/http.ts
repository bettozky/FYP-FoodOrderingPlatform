import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
    // Broken JSON or a body over 1 MB is the sender's mistake (4xx), not a server crash; nothing is logged.
  const type = (err as { type?: unknown })?.type;
  if (type === "entity.parse.failed") return res.status(400).json({ error: "The request body is not valid JSON" });
  if (type === "entity.too.large") return res.status(413).json({ error: "The request is too large" });
  if (typeof type === "string" && type.startsWith("entity.") || type === "encoding.unsupported" || type === "charset.unsupported") {
    return res.status(400).json({ error: "The request could not be read" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}

export function str(v: unknown, field: string, opts: { max?: number; optional?: boolean } = {}): string {
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return "";
    throw new HttpError(400, `${field} is required`);
  }
  if (typeof v !== "string") throw new HttpError(400, `${field} must be text`);
  const t = v.trim();
  if (!t && !opts.optional) throw new HttpError(400, `${field} is required`);
  if (t.length > (opts.max ?? 500)) throw new HttpError(400, `${field} is too long`);
  return t;
}

export function int(v: unknown, field: string, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${field} must be a whole number from ${min} to ${max}`);
  return n;
}

export const money = (n: number) => Math.round(n * 100) / 100;
