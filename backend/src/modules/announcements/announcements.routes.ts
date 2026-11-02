import { Router } from "express";
import { HttpError, int, str } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { approvedMerchant, auth, optionalUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Announcement } from "../../store/types.js";

/** Notices for customers: from the ScootMeal admin (everyone) or from one shop. Shown on the customer app's Announcements page. */

const DAY = 86400000;
const live = (a: Announcement) => !a.expiresAt || a.expiresAt > Date.now();
const view = (a: Announcement) => ({ id: a.id, authorType: a.authorType, merchantId: a.merchantId, merchantName: a.merchantName, title: a.title, body: a.body, pinned: Boolean(a.pinned), createdAt: a.createdAt, expiresAt: a.expiresAt });
const order = (a: Announcement, b: Announcement) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.createdAt - a.createdAt;

function fields(b: Record<string, any>, old?: Announcement) {
  const out: Partial<Announcement> = {};
  if (b.title !== undefined || !old) out.title = str(b.title, "Title", { max: 80 });
  if (b.body !== undefined || !old) out.body = str(b.body, "Message", { max: 600 });
  if (b.pinned !== undefined) out.pinned = Boolean(b.pinned);
  // expiresInDays: 1-90, or null / 0 = never
  if (b.expiresInDays !== undefined) out.expiresAt = b.expiresInDays ? Date.now() + int(b.expiresInDays, "Days", 1, 90) * DAY : undefined;
  return out;
}

// ---- customers (and anyone) ----
export const announcementsRouter = Router();
announcementsRouter.get("/", optionalUser, (req, res) => {
  const shop = String(req.query.merchantId ?? "");
  const list = [...db.announcements.values()]
    .filter(live)
    .filter((a) => (a.authorType === "admin" ? !shop : !a.merchantId || (db.merchants.get(a.merchantId)?.approval === "approved" && (!shop || a.merchantId === shop))))
    .sort(order).slice(0, 50);
  res.json({ announcements: list.map(view) });
});

// ---- a shop's own announcements ----
export const merchantAnnouncementsRouter = Router();
merchantAnnouncementsRouter.use(auth("merchant"));
const own = (res: any, id: string) => {
  const m = approvedMerchant(res);
  const a = db.announcements.get(id);
  if (!a || a.merchantId !== m.id) throw new HttpError(404, "Announcement not found");
  return a;
};
merchantAnnouncementsRouter.get("/", (_req, res) => {
  const m = approvedMerchant(res);
  res.json({ announcements: [...db.announcements.values()].filter((a) => a.merchantId === m.id).sort(order).map((a) => ({ ...view(a), expired: !live(a) })) });
});
merchantAnnouncementsRouter.post("/", (req, res) => {
  const m = approvedMerchant(res);
  if ([...db.announcements.values()].filter((a) => a.merchantId === m.id && live(a)).length >= 10) throw new HttpError(400, "You have 10 live announcements. Delete an old one first.");
  const a: Announcement = { id: uid("an"), authorType: "merchant", merchantId: m.id, merchantName: m.name, title: "", body: "", createdAt: Date.now(), ...fields(req.body ?? {}) };
  db.announcements.set(a.id, a);
  res.status(201).json({ announcement: view(a) });
});
merchantAnnouncementsRouter.patch("/:id", (req, res) => {
  const a = own(res, req.params.id as string);
  Object.assign(a, fields(req.body ?? {}, a));
  res.json({ announcement: view(a) });
});
merchantAnnouncementsRouter.delete("/:id", (req, res) => {
  db.announcements.delete(own(res, req.params.id as string).id);
  res.json({ ok: true });
});

// ---- admin announcements (for every customer) ----
export const adminAnnouncementsRouter = Router(); // GET list, PATCH, DELETE of the board entries; POST falls through to adminRouter
adminAnnouncementsRouter.use(auth("admin"));
adminAnnouncementsRouter.get("/", (_req, res) =>
  res.json({ announcements: [...db.announcements.values()].sort(order).map((a) => ({ ...view(a), expired: !live(a) })) }));
// POST /api/admin/announcements (send to customers / shops) lives in admin.routes.ts; for customers it also adds a board entry.
adminAnnouncementsRouter.patch("/:id", (req, res) => {
  const a = db.announcements.get(req.params.id as string);
  if (!a) throw new HttpError(404, "Announcement not found");
  Object.assign(a, fields(req.body ?? {}, a));
  res.json({ announcement: view(a) });
});
adminAnnouncementsRouter.delete("/:id", (req, res) => {
  if (!db.announcements.delete(req.params.id as string)) throw new HttpError(404, "Announcement not found");
  res.json({ ok: true });
});

/** Called by the admin "send announcement" action so the notice also appears on the customers' Announcements page. */
export function postAdminNotice(title: string, body: string, opts: { pinned?: boolean; expiresInDays?: number } = {}): Announcement {
  const a: Announcement = { id: uid("an"), authorType: "admin", title, body, createdAt: Date.now(), ...fields({ pinned: opts.pinned, expiresInDays: opts.expiresInDays }, { id: "", authorType: "admin", title, body, createdAt: 0 }) };
  db.announcements.set(a.id, a);
  return a;
}
