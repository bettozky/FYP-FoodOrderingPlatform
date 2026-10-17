import { Router } from "express";
import { auth, currentUser } from "../../middleware/auth.js";
import { acceptCall, addSignal, callView, currentCall, declineCall, endCall, expireCalls, getCall, startCall } from "./calls.service.js";

export const callsRouter = Router();
callsRouter.use(auth("customer", "merchant"));

// Polled every ~1.5 s: is someone calling me, or is my call still connected?
callsRouter.get("/current", (req, res) => {
  const u = currentUser(res);
  const c = currentCall(u);
  const after = Number(req.query.after ?? 0) || 0;
  res.json({ serverNow: Date.now(), call: c ? callView(c, u, after) : null });
});

callsRouter.post("/", (req, res) => {
  const u = currentUser(res);
  const c = startCall(u, String(req.body?.kind ?? ""), String(req.body?.id ?? ""));
  res.status(201).json({ call: callView(c, u) });
});

// Final state of a call I was in (so the screen can show "Call ended" / "Missed").
callsRouter.get("/:id", (req, res) => {
  const u = currentUser(res);
  expireCalls();
  const c = getCall(u, req.params.id as string);
  res.json({ call: callView(c, u, Number(req.query.after ?? 0) || 0) });
});

callsRouter.post("/:id/accept", (req, res) => { const u = currentUser(res); res.json({ call: callView(acceptCall(u, req.params.id as string), u) }); });
callsRouter.post("/:id/decline", (req, res) => { const u = currentUser(res); res.json({ call: callView(declineCall(u, req.params.id as string), u) }); });
callsRouter.post("/:id/end", (req, res) => { const u = currentUser(res); res.json({ call: callView(endCall(u, req.params.id as string), u) }); });
callsRouter.post("/:id/signal", (req, res) => {
  addSignal(currentUser(res), req.params.id as string, req.body?.type, req.body?.data);
  res.json({ ok: true });
});

