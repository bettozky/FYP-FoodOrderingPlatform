import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http.js";
import { db } from "../store/db.js";
import type { Merchant, Role, User } from "../store/types.js";

/** Role-based access control (NFR-5). Reads "Authorization: Bearer <token>". */
export function auth(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const userId = db.tokens.get(token);
    const user = userId ? db.users.get(userId) : undefined;
    if (!user) throw new HttpError(401, "Please log in");
    if (roles.length && !roles.includes(user.role)) throw new HttpError(403, "You do not have access to this");
    res.locals.user = user;
    next();
  };
}

export const currentUser = (res: Response) => res.locals.user as User;

/** The signed-in merchant's business. Must be approved by an admin first (FR-5.1). */
export function approvedMerchant(res: Response): Merchant {
  const u = currentUser(res);
  const m = u.merchantId ? db.merchants.get(u.merchantId) : undefined;
  if (!m) throw new HttpError(404, "No business profile");
  if (m.approval !== "approved") throw new HttpError(403, `Your business is ${m.approval}. An admin must approve it first.`);
  return m;
}
