import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";

export default function DashboardPage() {
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => {
    api<{ merchants: unknown[] }>("/admin/merchants?status=pending")
      .then((r) => setPending(r.merchants.length))
      .catch(() => setPending(null));
  }, []);
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Platform overview (FR-6.6). Orders, revenue and disputes are placeholders until those APIs are connected.</p>
      <div className="stats">
        <div className="card stat"><span className="muted">Orders today</span><b>0</b></div>
        <div className="card stat"><span className="muted">Revenue today</span><b>RM 0</b></div>
        <Link to="/merchants" className="card stat" style={{ color: "inherit", textDecoration: "none" }}>
          <span className="muted">Merchants waiting approval</span><b>{pending ?? "—"}</b>
        </Link>
        <div className="card stat"><span className="muted">Open disputes</span><b>0</b></div>
      </div>
    </div>
  );
}
