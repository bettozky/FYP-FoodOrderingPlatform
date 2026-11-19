import { Router } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http.js";
import { approvedMerchant, auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";
import { addDays, prepForecast, weekdayOf } from "./forecast.js";

// Sprint 3 prep forecast: GET /api/merchant/forecast?day=tomorrow | 0..6 (0 = Sunday, the next one coming)
export const forecastRouter = Router();
forecastRouter.use(auth("merchant"));

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: env.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: env.timeZone, hour: "2-digit", hour12: false });
const dateOf = (ts: number) => dateFmt.format(ts); // 2026-11-19
const hourOf = (ts: number) => Number(hourFmt.format(ts)) % 24;

forecastRouter.get("/forecast", (req, res) => {
  const m = approvedMerchant(res);
  const today = dateOf(Date.now());
  const day = String(req.query.day ?? "tomorrow");
  let target = addDays(today, 1);
  if (day !== "tomorrow") {
    const want = Number(day);
    if (!Number.isInteger(want) || want < 0 || want > 6) throw new HttpError(400, "day must be tomorrow or 0 (Sunday) to 6 (Saturday)");
    target = addDays(today, 1);
    while (weekdayOf(target) !== want) target = addDays(target, 1);
  }
  res.json({ forecast: prepForecast({ orders: db.orders.values(), merchantId: m.id, target, today, dateOf, hourOf }) });
});
