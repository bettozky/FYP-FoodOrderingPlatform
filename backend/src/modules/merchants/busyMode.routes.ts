import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { approvedMerchant, auth } from "../../middleware/auth.js";
import { DEFAULT_BUSY_MODE, badBusyMode } from "./busyMode.js";
import { merchantView } from "./merchants.view.js";

// Sprint 3 busy mode: GET / PUT /api/merchant/busy-mode  { on, limitMinutes, action: "warn" | "pause" }
export const busyModeRouter = Router();
busyModeRouter.use(auth("merchant"));

busyModeRouter.get("/", (_req, res) => {
  const m = approvedMerchant(res);
  const v = merchantView(m);
  res.json({ busyMode: m.busyMode ?? DEFAULT_BUSY_MODE, waitMinutes: v.waitMinutes, queue: v.queue, ordersPaused: v.ordersPaused, longWaitWarning: v.longWaitWarning });
});

busyModeRouter.put("/", (req, res) => {
  const m = approvedMerchant(res);
  const b = req.body ?? {};
  const bad = badBusyMode(b);
  if (bad) throw new HttpError(400, bad);
  m.busyMode = { on: b.on, limitMinutes: b.limitMinutes, action: b.action };
  const v = merchantView(m);
  res.json({ busyMode: m.busyMode, waitMinutes: v.waitMinutes, queue: v.queue, ordersPaused: v.ordersPaused, longWaitWarning: v.longWaitWarning });
});
