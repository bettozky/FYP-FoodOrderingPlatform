import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/merchants", label: "Merchants" },
  { to: "/users", label: "Users" },
  { to: "/orders", label: "Orders" },
  { to: "/disputes", label: "Disputes" },
  { to: "/moderation", label: "Moderation" },
  { to: "/analytics", label: "Analytics" },
];

export default function Layout() {
  const { name, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2>ScootMeal Admin</h2>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>{name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
