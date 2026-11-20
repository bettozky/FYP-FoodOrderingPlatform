import { Router } from "express";
import { HttpError } from "../../lib/http.js";
import { isOpenNow, localDay, localHHMM } from "../../lib/time.js";
import { approvedMerchant, auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import type { Merchant } from "../../store/types.js";
import { publicDish } from "./catalog.routes.js";
import { merchantView } from "./merchants.view.js";
import { activeDeal, dealMinutes, minutesUntil } from "./deals.js";

// Sprint 3 last-hour deals.
//   Merchant: POST /api/merchant/deals/:dishId { percent, minutes | untilClose: true }, DELETE to end it early.
//   Customer: GET /api/deals lists every deal that is on now at an open stall (Home "Last-hour deals" row).

/** Today's closing time for the shop (its per-day hours if it set them). */
function closingTime(m: Merchant, now = new Date()): string {
  const today = m.weeklyHours?.find((h) => h.day === localDay(now));
  return today?.close ?? m.hours.close;
}

export const merchantDealsRouter = Router();
merchantDealsRouter.use(auth("merchant"));

merchantDealsRouter.post("/:dishId", (req, res) => {
  const m = approvedMerchant(res);
  const d = db.dishes.get(req.params.dishId as string);
  if (!d || d.merchantId !== m.id) throw new HttpError(404, "Dish not found");
  if (d.soldOut) throw new HttpError(409, `${d.name} is sold out`);
  const minutes = dealMinutes(req.body, minutesUntil(closingTime(m), localHHMM()));
  if (typeof minutes === "string") throw new HttpError(400, minutes);
  const now = Date.now();
  d.deal = { percent: Number(req.body.percent), startedAt: now, endsAt: now + minutes * 60000 };
  res.json({ dish: d });
});

merchantDealsRouter.delete("/:dishId", (req, res) => {
  const m = approvedMerchant(res);
  const d = db.dishes.get(req.params.dishId as string);
  if (!d || d.merchantId !== m.id) throw new HttpError(404, "Dish not found");
  delete d.deal;
  res.json({ dish: d });
});

export const dealsRouter = Router();

dealsRouter.get("/", (_req, res) => {
  const now = Date.now();
  const deals = [...db.dishes.values()]
    .filter((d) => !d.soldOut && activeDeal(d, now))
    .map((d) => ({ d, m: db.merchants.get(d.merchantId) }))
    .filter(({ m }) => m && m.approval === "approved" && m.storeMode !== "offline" && isOpenNow(m))
    .sort((a, b) => a.d.deal!.endsAt - b.d.deal!.endsAt) // ending soonest first
    .map(({ d, m }) => ({ dish: publicDish(d), merchant: merchantView(m!) }));
  res.json({ serverNow: now, deals });
});
