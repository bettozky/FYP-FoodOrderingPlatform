// Sprint 3 "prep forecast": how many of each dish a stall will probably sell on a given day, from what it sold on
// the same weekday in the last few weeks (more recent weeks count more). No database or clock here, so it is easy
// to test (tests/forecast.test.ts); forecast.routes.ts passes in the orders and the local dates.

type ItemLike = { dishId: string; name: string; qty: number; status: string };
type OrderLike = { merchantId: string; status: string; createdAt: number; items: ItemLike[] };

export type DishForecast = {
  dishId: string;
  name: string;
  expected: number; // portions to prep
  low: number; // fewest sold on one of those days
  high: number; // most sold on one of those days
  history: number[]; // sold on each past day, oldest first (same order as `dates`)
  trend: "up" | "down" | "flat"; // the latest day against the ones before it
};

export type Forecast = {
  date: string; // the day forecast, YYYY-MM-DD
  weekday: number; // 0 = Sunday
  dates: string[]; // the past same-weekday dates used, oldest first
  expectedOrders: number;
  rushHour: number | null; // busiest hour of those days (13 = 13:00-14:00)
  dishes: DishForecast[];
};

const DAY = 86400000;
const NOT_SOLD = ["cancelled", "out_of_stock"];

/** YYYY-MM-DD plus or minus whole days (calendar maths in UTC, so no time-zone surprises). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** The last `weeks` dates before `today` that fall on `weekday`, oldest first. */
export function pastSameWeekdays(today: string, weekday: number, weeks: number): string[] {
  let d = addDays(today, -1);
  while (weekdayOf(d) !== weekday) d = addDays(d, -1);
  return Array.from({ length: weeks }, (_, i) => addDays(d, -7 * (weeks - 1 - i)));
}

export function prepForecast(opts: {
  orders: Iterable<OrderLike>;
  merchantId: string;
  target: string; // YYYY-MM-DD to forecast
  today: string; // YYYY-MM-DD, local
  dateOf: (ts: number) => string; // local date of a timestamp
  hourOf: (ts: number) => number; // local hour of a timestamp
  weeks?: number;
}): Forecast {
  const weekday = weekdayOf(opts.target);
  const mine = [...opts.orders].filter((o) => o.merchantId === opts.merchantId && (o.status === "completed" || o.status === "preparing"));
  // Leave out days before the stall's first order, so a new stall is not dragged down by empty weeks.
  const first = mine.reduce<string | null>((f, o) => { const d = opts.dateOf(o.createdAt); return !f || d < f ? d : f; }, null);
  const dates = pastSameWeekdays(opts.today, weekday, opts.weeks ?? 4).filter((d) => first !== null && d >= first);
  const index = new Map(dates.map((d, i) => [d, i]));

  const byDish = new Map<string, { name: string; perDay: number[] }>();
  const ordersPerDay = dates.map(() => 0);
  const hours = new Map<number, number>();
  for (const o of mine) {
    const i = index.get(opts.dateOf(o.createdAt));
    if (i === undefined) continue;
    ordersPerDay[i]!++;
    hours.set(opts.hourOf(o.createdAt), (hours.get(opts.hourOf(o.createdAt)) ?? 0) + 1);
    for (const it of o.items) {
      if (NOT_SOLD.includes(it.status)) continue;
      const g = byDish.get(it.dishId) ?? { name: it.name, perDay: dates.map(() => 0) };
      g.perDay[i]! += it.qty;
      byDish.set(it.dishId, g);
    }
  }

  // Weighted average: the latest week counts most (weights 1, 2, 3, 4 from oldest to newest).
  const weighted = (xs: number[]) => {
    const w = xs.map((_, i) => i + 1);
    const total = w.reduce((s, x) => s + x, 0);
    return total ? xs.reduce((s, x, i) => s + x * w[i]!, 0) / total : 0;
  };
  const trendOf = (xs: number[]): DishForecast["trend"] => {
    if (xs.length < 2) return "flat";
    const last = xs[xs.length - 1]!;
    const before = xs.slice(0, -1).reduce((s, x) => s + x, 0) / (xs.length - 1);
    return last > before * 1.2 ? "up" : last < before * 0.8 ? "down" : "flat";
  };

  const dishes = [...byDish.entries()]
    .map(([dishId, g]) => ({
      dishId, name: g.name, expected: Math.round(weighted(g.perDay)), low: Math.min(...g.perDay), high: Math.max(...g.perDay), history: g.perDay, trend: trendOf(g.perDay),
    }))
    .sort((a, b) => b.expected - a.expected || b.high - a.high || a.name.localeCompare(b.name));
  const rush = [...hours.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return { date: opts.target, weekday, dates, expectedOrders: Math.round(weighted(ordersPerDay)), rushHour: rush ? rush[0] : null, dishes };
}
