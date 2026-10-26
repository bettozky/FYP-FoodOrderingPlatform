import { api } from "../../shared/api";
import { StatusLine, useLoad } from "../../shared/useLoad";

type Stats = { ordersToday: number; revenueToday: number; merchantsPending: number; merchantsApproved: number; ordersWaiting: number };

// FR-6.6: platform overview, read from the backend.
export default function DashboardPage() {
  const { data, error, loading, reload } = useLoad(() => api<Stats>("/admin/stats"));
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Platform overview, live from the backend.</p>
      <StatusLine loading={loading} error={error} onRetry={reload} />
      {data ? (
        <div className="stats">
          <div className="card stat"><span className="muted">Orders today</span><b>{data.ordersToday}</b></div>
          <div className="card stat"><span className="muted">Revenue today</span><b>RM {data.revenueToday.toFixed(2)}</b></div>
          <div className="card stat"><span className="muted">Orders waiting (merchant or payment)</span><b>{data.ordersWaiting}</b></div>
          <div className="card stat"><span className="muted">Merchants waiting approval</span><b>{data.merchantsPending}</b></div>
          <div className="card stat"><span className="muted">Approved merchants</span><b>{data.merchantsApproved}</b></div>
        </div>
      ) : null}
    </div>
  );
}
