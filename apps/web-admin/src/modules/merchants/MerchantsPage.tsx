import { useState } from "react";
import { api } from "../../shared/api";
import { Link } from "react-router-dom";
import { Modal, Notice, Stars, rm } from "../../shared/ui";
import { StatusLine, useLoad } from "../../shared/useLoad";
import ApplicationReview, { Status } from "./ApplicationReview";

type Merchant = {
  id: string; name: string; stallNo: string; owner?: string; email?: string; phone: string; approval: Status;
  rating: number; reviewCount: number; orders30: number; revenue30: number; level: "good" | "watch" | "at_risk"; flags: { text: string }[];
};
const levelText = { good: "Good", watch: "Watch", at_risk: "At risk" } as const;

const filters: { key: "" | Status; label: string }[] = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

const doneText: Record<Status, string> = { approved: "approved. It is now live for customers.", rejected: "rejected. The shop has been told.", suspended: "suspended. Customers can no longer order from it.", pending: "set back to pending." };

// FR-6.2: the admin opens a shop's sign-up application, checks it, then approves, rejects or suspends it.
// Decisions are only made inside the application window, so nobody approves a shop without seeing what it sent.
export default function MerchantsPage() {
  const [filter, setFilter] = useState<"" | Status>("");
  const [open, setOpen] = useState<Merchant | null>(null);
  const [actionError, setActionError] = useState("");
  const [done, setDone] = useState("");
  const { data, error, loading, reload, setData } = useLoad(() => api<{ merchants: Merchant[] }>("/admin/merchants").then((r) => r.merchants));

  const decide = async (m: Merchant, approval: Status, reason: string) => {
    setActionError("");
    setDone("");
    try {
      await api(`/admin/merchants/${m.id}`, { method: "PATCH", body: { approval, ...(reason ? { reason } : {}) } });
      setData((rows) => (rows ?? []).map((x) => (x.id === m.id ? { ...x, approval } : x)));
      setOpen(null);
      setDone(`${m.name} ${doneText[approval]}`);
      return true;
    } catch (e) {
      setActionError(`Could not update ${m.name}: ${(e as Error).message}`);
      return false;
    }
  };

  const pending = (data ?? []).filter((m) => m.approval === "pending").length;
  const rows = (data ?? []).filter((m) => !filter || m.approval === filter);
  return (
    <div>
      <h1>Merchants</h1>
      <p className="muted">Open a shop's application to check its documents, menu and photos, then approve, reject or suspend it.</p>
      {pending > 0 ? <p><b>{pending} shop{pending > 1 ? "s are" : " is"} waiting for review.</b></p> : null}
      <Notice text={done} />
      <div className="filters" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? "on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <StatusLine loading={loading} error={error} onRetry={reload} />
      {actionError && !open ? <div className="card error" role="alert">{actionError}</div> : null}
      {!loading && !error && rows.length === 0 ? <div className="card">No merchants in this list.</div> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Shop</th><th scope="col">Owner</th><th scope="col">Contact</th><th scope="col">Performance (30 days)</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td data-label="Shop">{m.name}<br /><span className="muted">{m.stallNo}</span></td>
                  <td data-label="Owner">{m.owner ?? "-"}</td>
                  <td data-label="Contact">{m.email ?? "-"}<br /><span className="muted">{m.phone}</span></td>
                  <td data-label="Performance">
                    {m.approval === "approved" ? (
                      <>
                        <span className={`badge ${m.level}`}>{levelText[m.level]}</span>{" "}
                        {m.reviewCount > 0 ? <><Stars value={m.rating} /> {m.rating.toFixed(1)}<span className="muted"> ({m.reviewCount})</span></> : <span className="muted">no reviews</span>}
                        <br /><span className="muted">{m.orders30} orders · {rm(m.revenue30)}</span>
                        {m.flags.length > 0 ? <><br /><Link to="/watchlist">{m.flags.length} warning{m.flags.length > 1 ? "s" : ""}</Link></> : null}
                      </>
                    ) : <span className="muted">-</span>}
                  </td>
                  <td data-label="Status"><span className={`badge ${m.approval}`}>{m.approval}</span></td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      {m.approval === "pending" ? (
                        <button className="btn small" aria-label={`Review application from ${m.name}`} onClick={() => { setActionError(""); setOpen(m); }} data-testid={`review-${m.id}`}>Review application</button>
                      ) : (
                        <button className="btn small ghost" aria-label={`View ${m.name}`} onClick={() => { setActionError(""); setOpen(m); }} data-testid={`review-${m.id}`}>View</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Modal open={!!open} title={open ? open.name : ""} onClose={() => setOpen(null)}>
        {open ? (
          <>
            {actionError ? <div className="card error" role="alert">{actionError}</div> : null}
            <ApplicationReview key={open.id} id={open.id} onDecide={(approval, reason) => decide(open, approval, reason)} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}
