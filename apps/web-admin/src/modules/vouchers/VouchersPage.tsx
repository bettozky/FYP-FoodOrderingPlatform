import { useState } from "react";
import { api } from "../../shared/api";
import { Notice, rm } from "../../shared/ui";
import { StatusLine, useLoad } from "../../shared/useLoad";

type V = {
  id: string; title: string; description: string; amount: number; kind: "fixed" | "percent"; minSpend: number; scope: string;
  claimed: number; totalLimit?: number; costSpent: number; expiryDate?: string; active: boolean;
};

// Oversee every promotion on the platform, switch one off if it is abused, and create platform-wide vouchers.
export default function VouchersPage() {
  const { data, error, loading, reload } = useLoad(() => api<{ vouchers: V[] }>("/admin/vouchers").then((r) => r.vouchers));
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" }>({ text: "", tone: "ok" });
  const [f, setF] = useState({ title: "", amount: "", kind: "fixed", minSpend: "0", totalLimit: "", expiryDate: "" });

  async function toggle(v: V) {
    try {
      await api(`/admin/vouchers/${v.id}`, { method: "PATCH", body: { active: !v.active } });
      reload();
    } catch (e) {
      setNotice({ text: (e as Error).message, tone: "bad" });
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/vouchers", { method: "POST", body: { ...f, amount: Number(f.amount), minSpend: Number(f.minSpend || 0), totalLimit: f.totalLimit || undefined, expiryDate: f.expiryDate || undefined } });
      setNotice({ text: `Voucher ${f.title.toUpperCase()} created. Customers can use it at checkout.`, tone: "ok" });
      setF({ title: "", amount: "", kind: "fixed", minSpend: "0", totalLimit: "", expiryDate: "" });
      reload();
    } catch (err) {
      setNotice({ text: (err as Error).message, tone: "bad" });
    }
  }

  return (
    <div>
      <h1>Vouchers and promotions</h1>
      <p className="muted">Platform-wide vouchers apply to every shop. Shop vouchers were created by the shop owners.</p>
      <Notice {...notice} />
      <form className="card form-card" onSubmit={create} aria-label="Create a platform voucher">
        <h2 className="section">New platform voucher</h2>
        <div className="form-row">
          <div><label className="lbl" htmlFor="v-code">Code</label><input id="v-code" required maxLength={30} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="RAYA5" /></div>
          <div>
            <label className="lbl" htmlFor="v-kind">Type</label>
            <select id="v-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="fixed">RM off</option><option value="percent">% off</option></select>
          </div>
          <div><label className="lbl" htmlFor="v-amt">{f.kind === "percent" ? "Percent" : "Amount (RM)"}</label><input id="v-amt" required type="number" min="0.01" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="v-min">Min spend (RM)</label><input id="v-min" type="number" min="0" step="0.01" value={f.minSpend} onChange={(e) => setF({ ...f, minSpend: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="v-lim">Total uses (optional)</label><input id="v-lim" type="number" min="1" value={f.totalLimit} onChange={(e) => setF({ ...f, totalLimit: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="v-exp">Expires (optional)</label><input id="v-exp" type="date" value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} /></div>
        </div>
        <div className="row-actions end"><button className="btn small" type="submit">Create voucher</button></div>
      </form>
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {data && data.length === 0 ? <div className="card">No vouchers yet.</div> : null}
      {data && data.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Code</th><th scope="col">Offer</th><th scope="col">Applies to</th><th scope="col">Used</th><th scope="col">Cost so far</th><th scope="col">Expires</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id}>
                  <td data-label="Code"><b>{v.title}</b></td>
                  <td data-label="Offer">{v.kind === "percent" ? `${v.amount}% off` : `${rm(v.amount)} off`}<br /><span className="muted">min spend {rm(v.minSpend)}</span></td>
                  <td data-label="Applies to">{v.scope}</td>
                  <td data-label="Used">{v.claimed}{v.totalLimit ? ` / ${v.totalLimit}` : ""}</td>
                  <td data-label="Cost so far">{rm(v.costSpent)}</td>
                  <td data-label="Expires">{v.expiryDate ?? "No expiry"}</td>
                  <td data-label="Status"><span className={`badge ${v.active ? "approved" : "suspended"}`}>{v.active ? "Active" : "Off"}</span></td>
                  <td data-label="Action"><button className={`btn small ${v.active ? "danger" : ""}`} aria-label={`${v.active ? "Switch off" : "Switch on"} ${v.title}`} onClick={() => toggle(v)}>{v.active ? "Switch off" : "Switch on"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
