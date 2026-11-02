import { useState } from "react";
import { api } from "../../shared/api";
import { Chips, Notice, downloadCsv, rm } from "../../shared/ui";
import { StatusLine, useQuery } from "../../shared/useLoad";

type U = {
  id: string; name: string; email: string; phone: string | null; role: "customer" | "merchant"; suspended: boolean; shop: string | null;
  orders: number; cancelled: number; spent: number; reviews: number; flaggedReviews: number;
};

// People on the platform. Suspending someone logs them out at once and blocks sign-in until you restore them.
export default function CustomersPage() {
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" }>({ text: "", tone: "ok" });
  const { data, error, loading, reload } = useQuery<{ users: U[] }>(`/admin/users?role=${role}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  const users = data?.users ?? [];

  async function toggle(u: U) {
    if (!u.suspended && !window.confirm(`Suspend ${u.name}? They will be logged out and cannot sign in until restored.`)) return;
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", body: { suspended: !u.suspended } });
      setNotice({ text: `${u.name} was ${u.suspended ? "restored" : "suspended"}.`, tone: "ok" });
      reload();
    } catch (e) {
      setNotice({ text: (e as Error).message, tone: "bad" });
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">Customers and shop owners. Spending counts paid orders after refunds.</p>
        </div>
        <button
          className="btn small ghost"
          disabled={users.length === 0}
          onClick={() => downloadCsv(`${role}s.csv`, ["Name", "Email", "Phone", "Orders", "Cancelled or missed", "Spent (RM)", "Reviews", "Suspended"], users.map((u) => [u.name, u.email, u.phone, u.orders, u.cancelled, u.spent.toFixed(2), u.reviews, u.suspended ? "yes" : "no"]))}
        >
          Export CSV
        </button>
      </div>
      <Chips label="User type" value={role} onChange={setRole} options={[{ key: "customer", label: "Customers" }, { key: "merchant", label: "Shop owners" }]} />
      <div className="toolbar">
        <label className="sr-only" htmlFor="user-q">Search users</label>
        <input id="user-q" type="search" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Notice {...notice} />
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {!loading && !error && users.length === 0 ? <div className="card">No users match.</div> : null}
      {users.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th><th scope="col">Contact</th>
                {role === "customer" ? <><th scope="col">Orders</th><th scope="col">Spent</th><th scope="col">Reviews</th></> : <th scope="col">Shop</th>}
                <th scope="col">Status</th><th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name">{u.name}</td>
                  <td data-label="Contact">{u.email}<br /><span className="muted">{u.phone ?? "-"}</span></td>
                  {role === "customer" ? (
                    <>
                      <td data-label="Orders">{u.orders}{u.cancelled > 0 ? <><br /><span className="muted">{u.cancelled} cancelled or missed</span></> : null}</td>
                      <td data-label="Spent">{rm(u.spent)}</td>
                      <td data-label="Reviews">{u.reviews}{u.flaggedReviews > 0 ? <><br /><span className="muted">{u.flaggedReviews} flagged or hidden</span></> : null}</td>
                    </>
                  ) : (
                    <td data-label="Shop">{u.shop ?? "-"}</td>
                  )}
                  <td data-label="Status"><span className={`badge ${u.suspended ? "suspended" : "approved"}`}>{u.suspended ? "Suspended" : "Active"}</span></td>
                  <td data-label="Action">
                    <button className={`btn small ${u.suspended ? "" : "danger"}`} aria-label={`${u.suspended ? "Restore" : "Suspend"} ${u.name}`} onClick={() => toggle(u)}>
                      {u.suspended ? "Restore" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
