import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { findThread, postMessage, readMessages, roleIn, unreadFor } from "./chat.service.js";

export const chatRouter = Router();
chatRouter.use(auth("customer", "merchant"));

// Polled every ~2 s by the apps (same approach as notifications).
chatRouter.get("/unread", (_req, res) => {
  res.json({ unread: unreadFor(currentUser(res)) });
});

chatRouter.get("/:kind/:id", (req, res) => {
  const t = findThread(req.params.kind as string, req.params.id as string);
  const role = roleIn(t, currentUser(res));
  const after = Number(req.query.after ?? 0) || 0;
  res.json({
    serverNow: Date.now(), you: role, open: t.open, canCall: t.canCall,
    peerName: role === "customer" ? t.merchantName : t.customerName,
    messages: readMessages(t, role, after),
  });
});

chatRouter.post("/:kind/:id", (req, res) => {
  const t = findThread(req.params.kind as string, req.params.id as string);
  const role = roleIn(t, currentUser(res));
  res.status(201).json({ message: postMessage(t, role, req.body?.text) });
});
