import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { db } from "../../store/db.js";

export const notificationsRouter = Router();

// Polled by the apps every couple of seconds (stand-in for push / WebSocket).
notificationsRouter.get("/", auth(), (_req, res) => {
  const u = currentUser(res);
  const list = [...db.notifications.values()]
    .filter((n) => n.userId === u.id && !n.ackedAt)
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({ serverNow: Date.now(), notifications: list });
});

notificationsRouter.post("/:id/ack", auth(), (req, res) => {
  const u = currentUser(res);
  const n = db.notifications.get(req.params.id as string);
  if (n && n.userId === u.id) n.ackedAt = Date.now();
  res.json({ ok: true });
});
