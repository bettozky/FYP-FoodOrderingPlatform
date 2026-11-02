import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import { api } from "../shared/api";

type Alerts = { merchantsPending: number; atRisk: number; flaggedReviews: number };

// Grouped navigation. The small red numbers are things waiting for an admin (refreshed every 30 seconds).
const groups: { title: string; links: { to: string; label: string; alert?: keyof Alerts }[] }[] = [
  { title: "Overview", links: [{ to: "/", label: "Dashboard" }] },
  {
    title: "Operations",
    links: [
      { to: "/orders", label: "Orders" },
      { to: "/reservations", label: "Reservations" },
      { to: "/merchants", label: "Merchants", alert: "merchantsPending" },
    ],
  },
  {
    title: "Quality",
    links: [
      { to: "/watchlist", label: "Shop watchlist", alert: "atRisk" },
      { to: "/reviews", label: "Review moderation", alert: "flaggedReviews" },
    ],
  },
  { title: "People", links: [{ to: "/users", label: "Users" }] },
  {
    title: "Growth",
    links: [
      { to: "/vouchers", label: "Vouchers" },
      { to: "/announcements", label: "Announcements" },
    ],
  },
  { title: "System", links: [{ to: "/activity", label: "Activity log" }] },
];

export default function Layout() {
  const { name, logout } = useAuth();
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  useEffect(() => {
    const load = () => api<{ alerts: Alerts }>("/admin/overview").then((r) => setAlerts(r.alerts)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <h2>ScootMeal Admin</h2>
        <nav aria-label="Main">
          {groups.map((g) => (
            <div key={g.title} className="nav-group">
              <span className="nav-title">{g.title}</span>
              {g.links.map((l) => {
                const n = l.alert && alerts ? alerts[l.alert] : 0;
                return (
                  <NavLink key={l.to} to={l.to} end={l.to === "/"}>
                    {l.label}
                    {n > 0 ? <span className="pill" aria-label={`${n} waiting`}>{n}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>{name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="content" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
