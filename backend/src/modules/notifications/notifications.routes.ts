import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";

export const notificationsRouter = Router();

// Polled by the apps every couple of seconds (stand-in for push / WebSocket).
// ?all=true also returns notifications already dismissed (history).
notificationsRouter.get("/", auth(), (req, res) => {
  const u = currentUser(res);
  const all = req.query.all === "true";
  const list = [...db.notifications.values()]
    .filter((n) => n.userId === u.id && (all || !n.ackedAt))
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({ serverNow: Date.now(), notifications: list });
});

notificationsRouter.post("/:id/ack", auth(), (req, res) => {
  const u = currentUser(res);
  const n = db.notifications.get(req.params.id as string);
  if (n && n.userId === u.id) n.ackedAt = Date.now();
  res.json({ ok: true });
});

notificationsRouter.get("/unread-count", auth(), (_req, res) => {
  const u = currentUser(res);
  res.json({ count: [...db.notifications.values()].filter((n) => n.userId === u.id && !n.ackedAt).length });
});

notificationsRouter.post("/ack-all", auth(), (_req, res) => {
  const u = currentUser(res);
  const now = Date.now();
  for (const n of db.notifications.values()) if (n.userId === u.id && !n.ackedAt) n.ackedAt = now;
  res.json({ ok: true });
});
