import { Router } from "express";
import { env } from "../../config/env.js";
import { money } from "../../lib/http.js";
import { approvedMerchant, auth } from "../../middleware/auth.js";
import { db } from "../../store/db.js";

/** Merchant dashboard numbers: today's stats and the Daily / Weekly / Monthly sales report. */
export const analyticsRouter = Router();
analyticsRouter.use(auth("merchant"));

analyticsRouter.get("/stats", (req, res) => {
  const m = approvedMerchant(res);
  const period = String(req.query.period ?? "today");
  const now = new Date();
  const start = period === "all" ? 0
    : period === "week" ? Date.now() - 7 * 86400000
    : new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const orders = [...db.orders.values()].filter((o) => o.merchantId === m.id && o.createdAt >= start && ["preparing", "completed"].includes(o.status));
  const sold = new Map<string, { name: string; qty: number }>();
  let revenue = 0;
  for (const o of orders) {
    for (const i of o.items) {
      if (["out_of_stock", "cancelled"].includes(i.status)) continue;
      revenue += i.price * i.qty;
      const e = sold.get(i.dishId) ?? { name: i.name, qty: 0 };
      e.qty += i.qty;
      sold.set(i.dishId, e);
    }
  }
  res.json({
    period, orders: orders.length, revenue: money(revenue), avgPrepMinutes: m.prepMinutes,
    bestSellers: [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
  });
});

// FR-5.12: sales analytics for the Daily / Weekly / Monthly report screen.
analyticsRouter.get("/analytics", (req, res) => {
  const m = approvedMerchant(res);
  const period = (["daily", "weekly", "monthly"].includes(String(req.query.period)) ? String(req.query.period) : "daily") as "daily" | "weekly" | "monthly";
  const DAY = 86400000;
  const span = period === "daily" ? DAY : period === "weekly" ? 7 * DAY : 30 * DAY;
  const now = Date.now();
  const mine = [...db.orders.values()].filter((o) => o.merchantId === m.id && ["preparing", "completed"].includes(o.status));
  const inRange = (o: { createdAt: number }, from: number, to: number) => o.createdAt >= from && o.createdAt < to;
  const cur = mine.filter((o) => inRange(o, now - span, now + 1));
  const prev = mine.filter((o) => inRange(o, now - 2 * span, now - span));

  const kept = (o: (typeof mine)[number]) => o.items.filter((i) => !["out_of_stock", "cancelled"].includes(i.status));
  const sum = (orders: typeof mine, f: (i: (typeof mine)[number]["items"][number]) => number) => orders.reduce((s, o) => s + kept(o).reduce((a, i) => a + f(i), 0), 0);
  const revenue = money(sum(cur, (i) => i.price * i.qty));
  const prevRevenue = sum(prev, (i) => i.price * i.qty);
  const cost = money(sum(cur, (i) => (db.dishes.get(i.dishId)?.cost ?? 0) * i.qty) + cur.reduce((s, o) => s + o.discount, 0));
  const profit = money(revenue - cost);

  const orderHas = (o: (typeof mine)[number], modes: string[]) => kept(o).some((i) => modes.includes(i.mode));

  // chart buckets
  const bars: { label: string; value: number }[] = [];
  if (period === "daily") {
    for (const h of [10, 12, 14, 16, 18, 20]) bars.push({ label: `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`, value: 0 });
    for (const o of cur) {
      const hr = Number(new Intl.DateTimeFormat("en-GB", { timeZone: env.timeZone, hour: "2-digit", hour12: false }).format(o.createdAt)) % 24;
      const idx = Math.min(Math.max(Math.floor((hr - 10) / 2), 0), 5);
      bars[idx]!.value += sum([o], (i) => i.price * i.qty);
    }
  } else if (period === "weekly") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let d = 6; d >= 0; d--) bars.push({ label: names[new Date(now - d * DAY).getDay()]!, value: 0 });
    for (const o of cur) bars[6 - Math.min(Math.floor((now - o.createdAt) / DAY), 6)]!.value += sum([o], (i) => i.price * i.qty);
  } else {
    const names = ["Wk1", "Wk2", "Wk3", "Wk4"];
    for (const n of names) bars.push({ label: n, value: 0 });
    for (const o of cur) bars[3 - Math.min(Math.floor((now - o.createdAt) / (7.5 * DAY)), 3)]!.value += sum([o], (i) => i.price * i.qty);
  }
  const max = Math.max(...bars.map((b) => b.value), 1);
  const chartBars = bars.map((b) => ({ label: b.label, value: Math.round(b.value), heightPct: `${Math.max(Math.round((b.value / max) * 100), b.value > 0 ? 8 : 2)}%` }));

  const tally = (orders: typeof mine) => {
    const map = new Map<string, { id: string; name: string; category: string; soldQty: number; revenue: number }>();
    for (const o of orders) for (const i of kept(o)) {
      const e = map.get(i.dishId) ?? { id: i.dishId, name: i.name, category: db.dishes.get(i.dishId)?.category ?? "", soldQty: 0, revenue: 0 };
      e.soldQty += i.qty; e.revenue = money(e.revenue + i.price * i.qty);
      map.set(i.dishId, e);
    }
    return map;
  };
  const curT = tally(cur), prevT = tally(prev);
  const bestSellers = [...curT.values()].sort((a, b) => b.soldQty - a.soldQty).slice(0, 5).map((b) => {
    const last = prevT.get(b.id)?.soldQty ?? 0;
    return { ...b, lastMonthQty: last, growthPct: last ? Math.round(((b.soldQty - last) / last) * 1000) / 10 : 0 };
  });

  res.json({
    period, revenue, cost, profit,
    profitMargin: revenue ? `${((profit / revenue) * 100).toFixed(1)}%` : "0.0%",
    revenueGrowthPct: prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null,
    trafficOrders: cur.length,
    dineInTraffic: cur.filter((o) => orderHas(o, ["dine_in", "takeaway"])).length,
    deliveryTraffic: cur.filter((o) => orderHas(o, ["delivery"])).length,
    avgOrderValue: cur.length ? money(revenue / cur.length) : 0,
    chartBars, bestSellers,
  });
});
