import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http.js";
import { db } from "../store/db.js";
import type { Merchant, Role, User } from "../store/types.js";

/** Role-based access control (NFR-5). Reads "Authorization: Bearer <token>". */
export function auth(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const expires = db.tokenExpiry.get(token);
    if (token && expires !== undefined && expires < Date.now()) { db.tokens.delete(token); db.tokenExpiry.delete(token); }
    const userId = db.tokens.get(token);
    const user = userId ? db.users.get(userId) : undefined;
    if (!user) throw new HttpError(401, "Please log in");
    if (user.suspended) throw new HttpError(403, "Your account has been suspended. Please contact the ScootMeal admin.");
    if (roles.length && !roles.includes(user.role)) throw new HttpError(403, "You do not have access to this");
    res.locals.user = user;
    next();
  };
}

/** Like auth(), but anonymous visitors are allowed: res.locals.user is set only when a valid token was sent. */
export function optionalUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const exp = db.tokenExpiry.get(token);
  const user = token && (exp === undefined || exp >= Date.now()) ? db.users.get(db.tokens.get(token) ?? "") : undefined;
  if (user && !user.suspended) res.locals.user = user;
  next();
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
