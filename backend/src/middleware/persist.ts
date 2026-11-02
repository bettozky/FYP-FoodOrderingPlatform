import type { NextFunction, Request, Response } from "express";
import { flushSoon, usingDatabase } from "../store/persistence/index.js";

/** After any request that can change data (anything but GET), save the changes to the database within a moment. */
export function saveAfterWrites(req: Request, res: Response, next: NextFunction) {
  if (usingDatabase && req.method !== "GET" && req.method !== "OPTIONS" && req.method !== "HEAD") res.on("finish", () => flushSoon());
  next();
}
