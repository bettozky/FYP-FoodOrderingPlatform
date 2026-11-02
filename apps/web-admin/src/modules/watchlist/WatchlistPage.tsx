import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import type { Flag, Level } from "../../shared/types";
import { Modal, Notice, Stars, rm } from "../../shared/ui";
import { StatusLine, useLoad } from "../../shared/useLoad";

type Row = {
  id: string; name: string; stallNo: string; phone: string; level: Level; flags: Flag[];
  requests: number; completed: number; noReply: number; revenue: number; avgConfirmMin: number | null;
  reviewCount: number; avgRating: number | null; shownRating: number; recentLow: number;
};

const levelText: Record<Level, string> = { good: "Good", watch: "Watch", at_risk: "At risk" };

// Watches out for shops with low reviews, missed orders or slow confirmations (FR-6.6 platform quality).
export default function WatchlistPage() {
  const { data, error, loading, reload } = useLoad(() => api<{ merchants: Row[] }>("/admin/watchlist").then((r) => r.merchants));
  const [msgFor, setMsgFor] = useState<Row | null>(null);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" }>({ text: "", tone: "ok" });

  const template = (m: Row) =>
    m.flags.some((f) => f.code === "no_reply")
      ? `Hi ${m.name}, many order requests are expiring without a reply. Please confirm or decline within 5 minutes so customers are not left waiting.`
      : `Hi ${m.name}, recent customer reviews for your shop are low. Please check food quality and wait times. Reply here if you need help.`;

  async function send() {
    if (!msgFor) return;
    try {
      await api(`/admin/merchants/${msgFor.id}/warn`, { method: "POST", body: { message: text } });
      setNotice({ text: `Message sent to ${msgFor.name}.`, tone: "ok" });
      setMsgFor(null);
    } catch (e) {
      setNotice({ text: (e as Error).message, tone: "bad" });
    }
  }
  async function suspend(m: Row) {
    if (!window.confirm(`Suspend ${m.name}? Customers will no longer see this shop until you approve it again.`)) return;
    try {
      await api(`/admin/merchants/${m.id}`, { method: "PATCH", body: { approval: "suspended" } });
      setNotice({ text: `${m.name} was suspended.`, tone: "ok" });
      reload();
    } catch (e) {
      setNotice({ text: (e as Error).message, tone: "bad" });
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Shop watchlist</h1>
          <p className="muted">Shops with low ratings, missed orders or slow confirmations over the last 30 days. Hidden reviews do not count.</p>
        </div>
        <button className="btn small" onClick={reload}>Refresh</button>
      </div>
      <Notice {...notice} />
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {data && data.length === 0 ? <div className="card ok-card">No shops need attention right now.</div> : null}
      <div className="cards">
        {(data ?? []).map((m) => (
          <article key={m.id} className={`card shop ${m.level}`} aria-label={m.name}>
            <header>
              <div>
                <h2>{m.name}</h2>
                <span className="muted">{m.stallNo}</span>
              </div>
              <span className={`badge ${m.level}`}>{levelText[m.level]}</span>
            </header>
            <ul className="flags">
              {m.flags.map((f) => (
                <li key={f.code} className={f.severity}><b>{f.severity === "high" ? "High" : "Medium"}:</b> {f.text}</li>
              ))}
            </ul>
            <dl className="facts">
              <div><dt>Rating</dt><dd>{m.avgRating ? <><Stars value={m.avgRating} /> {m.avgRating.toFixed(1)}</> : "-"}<span className="muted"> ({m.reviewCount})</span></dd></div>
              <div><dt>Order requests</dt><dd>{m.requests}</dd></div>
              <div><dt>No reply</dt><dd>{m.noReply}</dd></div>
              <div><dt>Avg confirm time</dt><dd>{m.avgConfirmMin === null ? "-" : `${m.avgConfirmMin} min`}</dd></div>
              <div><dt>Revenue</dt><dd>{rm(m.revenue)}</dd></div>
            </dl>
            <div className="row-actions">
              <button className="btn small" onClick={() => { setMsgFor(m); setText(template(m)); }}>Message shop</button>
              <Link className="btn small ghost" to={`/reviews?merchantId=${m.id}`}>See reviews</Link>
              <Link className="btn small ghost" to={`/orders?merchantId=${m.id}`}>See orders</Link>
              <button className="btn small danger" onClick={() => suspend(m)}>Suspend</button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={!!msgFor} title={`Message ${msgFor?.name ?? ""}`} onClose={() => setMsgFor(null)}>
        <p className="muted">The shop owner sees this in their merchant app.</p>
        <label htmlFor="warn-text" className="lbl">Message</label>
        <textarea id="warn-text" rows={5} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} />
        <div className="row-actions end">
          <button className="btn small ghost" onClick={() => setMsgFor(null)}>Cancel</button>
          <button className="btn small" disabled={!text.trim()} onClick={send}>Send message</button>
        </div>
      </Modal>
    </div>
  );
}
