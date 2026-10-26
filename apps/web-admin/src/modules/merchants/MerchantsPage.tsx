import { useState } from "react";
import { api } from "../../shared/api";
import { StatusLine, useLoad } from "../../shared/useLoad";

type Status = "pending" | "approved" | "rejected" | "suspended";
type Merchant = { id: string; name: string; stallNo: string; owner?: string; email?: string; phone: string; approval: Status };

const filters: { key: "" | Status; label: string }[] = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

// FR-6.2: review, approve, reject or suspend merchant registrations (live data from the backend).
export default function MerchantsPage() {
  const [filter, setFilter] = useState<"" | Status>("");
  const [actionError, setActionError] = useState("");
  const { data, error, loading, reload, setData } = useLoad(() => api<{ merchants: Merchant[] }>("/admin/merchants").then((r) => r.merchants));

  const set = async (m: Merchant, approval: Status) => {
    setActionError("");
    try {
      await api(`/admin/merchants/${m.id}`, { method: "PATCH", body: { approval } });
      setData((rows) => (rows ?? []).map((x) => (x.id === m.id ? { ...x, approval } : x)));
    } catch (e) {
      setActionError(`Could not update ${m.name}: ${(e as Error).message}`);
    }
  };

  const rows = (data ?? []).filter((m) => !filter || m.approval === filter);
  return (
    <div>
      <h1>Merchants</h1>
      <p className="muted">Approve, reject or suspend shops that signed up in the merchant app.</p>
      <div className="filters" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? "on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <StatusLine loading={loading} error={error} onRetry={reload} />
      {actionError ? <div className="card error" role="alert">{actionError}</div> : null}
      {!loading && !error && rows.length === 0 ? <div className="card">No merchants in this list.</div> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Shop</th><th scope="col">Owner</th><th scope="col">Contact</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td data-label="Shop">{m.name}<br /><span className="muted">{m.stallNo}</span></td>
                  <td data-label="Owner">{m.owner ?? "-"}</td>
                  <td data-label="Contact">{m.email ?? "-"}<br /><span className="muted">{m.phone}</span></td>
                  <td data-label="Status"><span className={`badge ${m.approval}`}>{m.approval}</span></td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="btn small" aria-label={`Approve ${m.name}`} disabled={m.approval === "approved"} onClick={() => set(m, "approved")}>Approve</button>
                      <button className="btn small danger" aria-label={`Reject ${m.name}`} disabled={m.approval === "rejected"} onClick={() => set(m, "rejected")}>Reject</button>
                      <button className="btn small" aria-label={`Suspend ${m.name}`} disabled={m.approval === "suspended"} onClick={() => set(m, "suspended")}>Suspend</button>
                    </div>
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
