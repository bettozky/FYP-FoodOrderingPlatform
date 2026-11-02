import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import { BarChart, RankList, SplitBar } from "../../shared/charts";
import { Stars, rm } from "../../shared/ui";
import { StatusLine, useLoad } from "../../shared/useLoad";

type Overview = {
  kpis: {
    ordersToday: number; revenueToday: number; revenue30: number; orders30: number; avgOrderValue: number; completionRate: number;
    platformRating: number | null; reviewCount: number; customers: number; merchantsApproved: number; refunded30: number;
  };
  alerts: { merchantsPending: number; atRisk: number; flaggedReviews: number; cashOutstanding: number; cashOutstandingOrders: number; ordersWaiting: number };
  daily: { date: string; orders: number; revenue: number }[];
  hours: { hour: number; orders: number }[];
  byStatus: Record<string, number>;
  payments: { method: "card" | "fpx" | "cash"; orders: number; amount: number }[];
  modes: Record<string, number>;
  topMerchants: { id: string; name: string; orders: number; revenue: number; rating: number }[];
  topDishes: { name: string; shop: string; qty: number }[];
};

const methodLabel = { card: "Card", fpx: "FPX", cash: "Cash at stall" } as const;
const methodTone = { card: "t1", fpx: "t2", cash: "t3" } as const;
const statusLabel: Record<string, string> = {
  completed: "Completed", preparing: "Preparing", awaiting_merchant: "Waiting for shop", awaiting_payment: "Waiting for payment",
  rejected: "Declined", expired: "No reply / unpaid", cancelled: "Cancelled",
};
const statusTone: Record<string, string> = { completed: "t1", preparing: "t2", awaiting_merchant: "t4", awaiting_payment: "t4", rejected: "t5", expired: "t5", cancelled: "t6" };

// FR-6.6: platform overview. Every number is computed from the live backend data and refreshes by itself.
export default function DashboardPage() {
  const { data, error, loading, reload } = useLoad(() => api<Overview>("/admin/overview"));
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  useEffect(() => {
    const t = setInterval(reload, 20000);
    return () => clearInterval(t);
  }, [reload]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Platform overview, live from the backend. Refreshes every 20 seconds.</p>
        </div>
        <button className="btn small" onClick={reload}>Refresh now</button>
      </div>
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {data ? <Body d={data} metric={metric} setMetric={setMetric} /> : null}
    </div>
  );
}

function Body({ d, metric, setMetric }: { d: Overview; metric: "revenue" | "orders"; setMetric: (m: "revenue" | "orders") => void }) {
  const k = d.kpis, a = d.alerts;
  const attention = [
    a.merchantsPending > 0 && { to: "/merchants", tone: "warn", text: `${a.merchantsPending} shop${a.merchantsPending > 1 ? "s" : ""} waiting for approval`, cta: "Review" },
    a.atRisk > 0 && { to: "/watchlist", tone: "bad", text: `${a.atRisk} shop${a.atRisk > 1 ? "s" : ""} on the watchlist (low rating or missed orders)`, cta: "Open watchlist" },
    a.flaggedReviews > 0 && { to: "/reviews", tone: "bad", text: `${a.flaggedReviews} flagged review${a.flaggedReviews > 1 ? "s" : ""} waiting for moderation`, cta: "Moderate" },
    a.cashOutstandingOrders > 0 && { to: "/orders", tone: "warn", text: `${rm(a.cashOutstanding)} of cash still to be collected at stalls (${a.cashOutstandingOrders} order${a.cashOutstandingOrders > 1 ? "s" : ""})`, cta: "View orders" },
  ].filter(Boolean) as { to: string; tone: string; text: string; cta: string }[];

  const total = d.payments.reduce((s, p) => s + p.orders, 0);
  const dayLabel = (iso: string) => iso.slice(8) + "/" + iso.slice(5, 7);
  const series = d.daily.map((x) => ({ label: dayLabel(x.date), value: metric === "revenue" ? x.revenue : x.orders }));
  const sum14 = d.daily.reduce((s, x) => s + (metric === "revenue" ? x.revenue : x.orders), 0);
  const peak = d.hours.reduce((m, h) => (h.orders > m.orders ? h : m), d.hours[0]!);
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;

  return (
    <>
      <section aria-labelledby="needs-attention">
        <h2 id="needs-attention" className="section">Needs your attention</h2>
        {attention.length === 0 ? (
          <div className="card ok-card">All clear. No pending approvals, flagged reviews or watchlist shops.</div>
        ) : (
          <ul className="attention">
            {attention.map((x) => (
              <li key={x.to + x.text} className={x.tone}>
                <span>{x.text}</span>
                <Link className="btn small" to={x.to}>{x.cta}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="stats">
        <div className="card stat"><span className="muted">Orders today</span><b>{k.ordersToday}</b><span className="muted small">{a.ordersWaiting} waiting right now</span></div>
        <div className="card stat"><span className="muted">Revenue today</span><b>{rm(k.revenueToday)}</b></div>
        <div className="card stat"><span className="muted">Revenue, last 30 days</span><b>{rm(k.revenue30)}</b><span className="muted small">{k.orders30} orders · avg {rm(k.avgOrderValue)}</span></div>
        <div className="card stat"><span className="muted">Orders completed</span><b>{k.completionRate}%</b><span className="muted small">of requests, last 30 days</span></div>
        <div className="card stat"><span className="muted">Platform rating</span><b>{k.platformRating ?? "-"}{k.platformRating ? <> <Stars value={k.platformRating} /></> : null}</b><span className="muted small">{k.reviewCount} visible reviews</span></div>
        <div className="card stat"><span className="muted">Customers · shops</span><b>{k.customers} · {k.merchantsApproved}</b><span className="muted small">refunded {rm(k.refunded30)} (30 days)</span></div>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="trend">
          <div className="card-head">
            <h2 id="trend" className="section">Last 14 days</h2>
            <div className="filters" role="group" aria-label="Chart metric">
              <button className={`chip ${metric === "revenue" ? "on" : ""}`} aria-pressed={metric === "revenue"} onClick={() => setMetric("revenue")}>Revenue</button>
              <button className={`chip ${metric === "orders" ? "on" : ""}`} aria-pressed={metric === "orders"} onClick={() => setMetric("orders")}>Orders</button>
            </div>
          </div>
          <p className="muted">{metric === "revenue" ? `${rm(sum14)} paid in 14 days` : `${sum14} orders in 14 days`}</p>
          <BarChart data={series} format={(n) => (metric === "revenue" ? `RM${n}` : String(n))} summary={`${metric} per day for the last 14 days, total ${sum14}`} />
        </section>

        <section className="card" aria-labelledby="hours">
          <h2 id="hours" className="section">Busiest hours</h2>
          <p className="muted">{peak.orders > 0 ? `Peak is around ${hourLabel(peak.hour)} (${peak.orders} orders in 30 days)` : "No orders yet"}</p>
          <BarChart data={d.hours.filter((h) => h.hour >= 7 && h.hour <= 22).map((h) => ({ label: hourLabel(h.hour), value: h.orders }))} summary="Orders by hour of the day, last 30 days" />
        </section>
      </div>

      <div className="grid-3">
        <section className="card" aria-labelledby="pay">
          <h2 id="pay" className="section">How customers pay</h2>
          <SplitBar parts={d.payments.map((p) => ({ label: methodLabel[p.method], value: p.orders, tone: methodTone[p.method], note: `${p.orders} of ${total} · ${rm(p.amount)}` }))} />
        </section>
        <section className="card" aria-labelledby="stat">
          <h2 id="stat" className="section">Order outcomes (30 days)</h2>
          <SplitBar parts={Object.entries(d.byStatus).sort((x, y) => y[1] - x[1]).map(([s, n]) => ({ label: statusLabel[s] ?? s, value: n, tone: statusTone[s] ?? "t6", note: String(n) }))} />
        </section>
        <section className="card" aria-labelledby="modes">
          <h2 id="modes" className="section">Dine-in, takeaway, delivery</h2>
          <SplitBar parts={[
            { label: "Dine-in", value: d.modes.dine_in ?? 0, tone: "t1" },
            { label: "Takeaway", value: d.modes.takeaway ?? 0, tone: "t2" },
            { label: "Delivery", value: d.modes.delivery ?? 0, tone: "t3" },
          ]} />
          <p className="muted small">An order with mixed items counts in each mode it uses.</p>
        </section>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="top-shops">
          <h2 id="top-shops" className="section">Top shops by revenue (30 days)</h2>
          <RankList rows={d.topMerchants.map((m) => ({ label: m.name, sub: `${m.orders} orders · ${m.rating.toFixed(1)}★`, value: m.revenue }))} format={rm} />
        </section>
        <section className="card" aria-labelledby="top-dishes">
          <h2 id="top-dishes" className="section">Most ordered dishes (30 days)</h2>
          <RankList rows={d.topDishes.map((x) => ({ label: x.name, sub: x.shop, value: x.qty }))} format={(n) => `${n} sold`} />
        </section>
      </div>
    </>
  );
}
