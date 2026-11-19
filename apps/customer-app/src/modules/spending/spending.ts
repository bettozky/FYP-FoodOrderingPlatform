// Sprint 3 "spending tracker and weekly budget": the numbers, worked out from the customer's own orders.
// No React here, so the backend test runner can check it.

type OrderLike = {
  merchantName: string; total: number; refunded: number; status: string; createdAt: number; paidAt?: number; acceptedAt?: number;
};

const DAY = 24 * 60 * 60 * 1000;

/** What an order really cost: paid (or cooking / done, for cash) minus any refund. Unpaid or cancelled-before-paying is 0. */
export function spentOn(o: OrderLike): number {
  const counted = !!o.paidAt || o.status === "preparing" || o.status === "completed";
  return counted ? Math.max(0, Math.round((o.total - (o.refunded ?? 0)) * 100) / 100) : 0;
}

/** Midnight on the Monday of the week that `ts` falls in (local time). */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

const round = (n: number) => Math.round(n * 100) / 100;
const when = (o: OrderLike) => o.paidAt ?? o.acceptedAt ?? o.createdAt;

export type Spending = {
  thisWeek: number;
  thisMonth: number;
  /** Oldest first; the last one is this week. */
  weeks: { start: number; label: string; total: number }[];
  /** Monday to Sunday of this week. */
  days: { label: string; total: number; isToday: boolean }[];
  topStalls: { name: string; total: number; count: number }[];
  orderCount: number;
  average: number;
};

export function spendingSummary(orders: OrderLike[], now = Date.now(), weeksBack = 8): Spending {
  const paid = orders.map((o) => ({ o, amount: spentOn(o), at: when(o) })).filter((x) => x.amount > 0 && x.at <= now);
  const thisWeekStart = weekStart(now);
  const m = new Date(now);
  const monthStart = new Date(m.getFullYear(), m.getMonth(), 1).getTime();

  const weeks = Array.from({ length: weeksBack }, (_, i) => {
    const start = weekStart(thisWeekStart - (weeksBack - 1 - i) * 7 * DAY + DAY); // +1 day keeps clear of clock changes
    const end = start + 7 * DAY;
    const d = new Date(start);
    return { start, label: i === weeksBack - 1 ? "This wk" : `${d.getDate()}/${d.getMonth() + 1}`, total: round(paid.filter((x) => x.at >= start && x.at < end).reduce((s, x) => s + x.amount, 0)) };
  });

  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayIndex = (new Date(now).getDay() + 6) % 7;
  const days = names.map((label, i) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() + i);
    const s = start.getTime();
    const e = new Date(s); e.setDate(e.getDate() + 1);
    return { label, isToday: i === todayIndex, total: round(paid.filter((x) => x.at >= s && x.at < e.getTime()).reduce((t, x) => t + x.amount, 0)) };
  });

  const byStall = new Map<string, { name: string; total: number; count: number }>();
  for (const x of paid.filter((x) => x.at >= monthStart)) {
    const g = byStall.get(x.o.merchantName) ?? { name: x.o.merchantName, total: 0, count: 0 };
    g.total = round(g.total + x.amount);
    g.count++;
    byStall.set(x.o.merchantName, g);
  }

  const month = paid.filter((x) => x.at >= monthStart);
  return {
    thisWeek: round(paid.filter((x) => x.at >= thisWeekStart).reduce((s, x) => s + x.amount, 0)),
    thisMonth: round(month.reduce((s, x) => s + x.amount, 0)),
    weeks,
    days,
    topStalls: [...byStall.values()].sort((a, b) => b.total - a.total).slice(0, 3),
    orderCount: month.length,
    average: month.length ? round(month.reduce((s, x) => s + x.amount, 0) / month.length) : 0,
  };
}

export type BudgetState = { level: "none" | "ok" | "near" | "over"; left: number; percent: number };

/** Where this week stands against the budget, optionally after adding an order of `adding`. "near" = 80% or more. */
export function budgetState(spentThisWeek: number, budget: number | null | undefined, adding = 0): BudgetState {
  if (!budget || budget <= 0) return { level: "none", left: 0, percent: 0 };
  const after = round(spentThisWeek + adding);
  const percent = Math.round((after / budget) * 100);
  return { level: after > budget ? "over" : percent >= 80 ? "near" : "ok", left: round(budget - after), percent };
}
