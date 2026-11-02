import { useState } from "react";
import { Chips, downloadCsv, when } from "../../shared/ui";
import { StatusLine, useQuery } from "../../shared/useLoad";

type Entry = { id: string; at: number; admin: string; action: string; target: string; detail?: string };
const names: Record<string, string> = {
  merchant_approved: "Approved shop", merchant_rejected: "Rejected shop", merchant_suspended: "Suspended shop", merchant_pending: "Set shop to pending", merchant_warned: "Messaged shop",
  review_hidden: "Hid review", review_restored: "Restored review", review_flagged: "Flagged review", review_flag_dismissed: "Dismissed flag",
  order_refunded: "Refunded order", user_suspended: "Suspended user", user_restored: "Restored user",
  voucher_created: "Created voucher", voucher_enabled: "Switched voucher on", voucher_disabled: "Switched voucher off", announcement: "Sent announcement",
};

// Who did what and when. Useful for accountability and for explaining a decision later.
export default function ActivityPage() {
  const [kind, setKind] = useState("");
  const { data, error, loading, reload } = useQuery<{ entries: Entry[] }>(`/admin/audit?limit=200${kind ? `&action=${kind}` : ""}`);
  const rows = data?.entries ?? [];
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Activity log</h1>
          <p className="muted">Every action an admin takes is recorded here, newest first.</p>
        </div>
        <div className="row-actions">
          <button className="btn small ghost" onClick={reload}>Refresh</button>
          <button className="btn small ghost" disabled={rows.length === 0} onClick={() => downloadCsv("activity-log.csv", ["When", "Admin", "Action", "Target", "Detail"], rows.map((r) => [new Date(r.at).toISOString(), r.admin, names[r.action] ?? r.action, r.target, r.detail]))}>Export CSV</button>
        </div>
      </div>
      <Chips
        label="Filter"
        value={kind}
        onChange={setKind}
        options={[{ key: "", label: "Everything" }, { key: "merchant", label: "Shops" }, { key: "review", label: "Reviews" }, { key: "order", label: "Refunds" }, { key: "user", label: "Users" }, { key: "voucher", label: "Vouchers" }, { key: "announcement", label: "Announcements" }]}
      />
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {!loading && !error && rows.length === 0 ? <div className="card">No admin actions yet. Approve a shop or hide a review and it will show up here.</div> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">When</th><th scope="col">Admin</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="When">{when(r.at)}</td>
                  <td data-label="Admin">{r.admin}</td>
                  <td data-label="Action">{names[r.action] ?? r.action}</td>
                  <td data-label="Target">{r.target}</td>
                  <td data-label="Detail">{r.detail ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
