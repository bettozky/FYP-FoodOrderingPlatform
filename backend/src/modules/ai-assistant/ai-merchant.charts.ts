// Sales charts for the merchant assistant. The AI only CHOOSES which chart fits the question;
// the numbers are always calculated here from the stall's own orders (same rules as the dashboard),
// so a chart can never show made-up figures.
import { money } from "../../lib/http.js";
import { db } from "../../store/db.js";
import type { Order } from "../../store/types.js";

export const CHART_KINDS = ["today_by_hour", "last_7_days", "best_sellers_7_days"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export type ChartCard = {
  type: "chart";
  kind: ChartKind;
  title: string;
  unit: "RM" | "sold"; // what the numbers are
  layout: "columns" | "rows"; // columns for time, rows for dish rankings
  bars: { label: string; value: number }[];
  total: number;
};

const DAY = 86400000;
const OPEN_HOURS = [8, 10, 12, 14, 16, 18, 20]; // 2-hour buckets: 8-10am ... 8-10pm
const NOT_SOLD = new Set(["out_of_stock", "cancelled"]);

// Days and hours use the server's clock, the same as the dashboard's "today" (GET /api/merchant/stats),
// so the chart and the dashboard always agree.
const dateOf = (ts: number) => new Date(ts).toDateString(); // "Fri Nov 20 2026"
const hourOf = (ts: number) => new Date(ts).getHours();
const dayName = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { weekday: "short" }); // "Fri"

/** Orders that count as sales: being prepared or completed (same as the dashboard). */
function soldOrders(merchantId: string, since: number): Order[] {
  return [...db.orders.values()].filter(
    (o) => o.merchantId === merchantId && o.createdAt >= since && (o.status === "preparing" || o.status === "completed")
  );
}

/** Money taken for one order, leaving out out-of-stock and cancelled items. */
function orderSales(o: Order): number {
  return o.items.filter((i) => !NOT_SOLD.has(i.status)).reduce((sum, i) => sum + i.price * i.qty, 0);
}

function hourLabel(h: number): string {
  return `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`;
}

/** Builds one chart from the stall's orders. */
export function buildChart(merchantId: string, kind: ChartKind, now = Date.now()): ChartCard {
  if (kind === "today_by_hour") {
    const today = dateOf(now);
    const bars = OPEN_HOURS.map((h) => ({ label: hourLabel(h), value: 0 }));
    for (const o of soldOrders(merchantId, now - 2 * DAY)) {
      if (dateOf(o.createdAt) !== today) continue;
      const h = hourOf(o.createdAt);
      // Put the order in its 2-hour bucket; before 8am counts in the first, after 10pm in the last.
      const i = Math.min(OPEN_HOURS.length - 1, Math.max(0, Math.floor((h - OPEN_HOURS[0]) / 2)));
      bars[i].value += orderSales(o);
    }
    const rounded = bars.map((b) => ({ ...b, value: money(b.value) }));
    return {
      type: "chart",
      kind,
      title: "Sales today",
      unit: "RM",
      layout: "columns",
      bars: rounded,
      total: money(rounded.reduce((s, b) => s + b.value, 0)),
    };
  }

  if (kind === "last_7_days") {
    // The last 7 days including today, oldest first.
    const days = Array.from({ length: 7 }, (_, k) => now - (6 - k) * DAY);
    const index = new Map(days.map((ts, k) => [dateOf(ts), k]));
    const bars = days.map((ts, k) => ({ label: k === 6 ? "Today" : dayName(ts), value: 0 }));
    for (const o of soldOrders(merchantId, now - 8 * DAY)) {
      const k = index.get(dateOf(o.createdAt));
      if (k !== undefined) bars[k].value += orderSales(o);
    }
    const rounded = bars.map((b) => ({ ...b, value: money(b.value) }));
    return {
      type: "chart",
      kind,
      title: "Sales, last 7 days",
      unit: "RM",
      layout: "columns",
      bars: rounded,
      total: money(rounded.reduce((s, b) => s + b.value, 0)),
    };
  }

  // best_sellers_7_days: top 5 dishes by number sold.
  const sold = new Map<string, { label: string; value: number }>();
  for (const o of soldOrders(merchantId, now - 7 * DAY)) {
    for (const i of o.items) {
      if (NOT_SOLD.has(i.status)) continue;
      const e = sold.get(i.dishId) ?? { label: i.name, value: 0 };
      e.value += i.qty;
      sold.set(i.dishId, e);
    }
  }
  const bars = [...sold.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  return {
    type: "chart",
    kind,
    title: "Best sellers, last 7 days",
    unit: "sold",
    layout: "rows",
    bars,
    total: bars.reduce((s, b) => s + b.value, 0),
  };
}

/** All three charts' numbers, compact, for the AI to read (so its words match the chart). */
export function chartsForContext(merchantId: string, now = Date.now()) {
  const pick = (c: ChartCard) => ({ unit: c.unit, total: c.total, bars: c.bars });
  return {
    today_by_hour: pick(buildChart(merchantId, "today_by_hour", now)),
    last_7_days: pick(buildChart(merchantId, "last_7_days", now)),
    best_sellers_7_days: pick(buildChart(merchantId, "best_sellers_7_days", now)),
  };
}