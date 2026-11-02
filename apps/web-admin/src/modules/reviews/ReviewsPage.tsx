import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../shared/api";
import { Chips, Notice, Stars, ago, downloadCsv } from "../../shared/ui";
import { StatusLine, useQuery } from "../../shared/useLoad";

type Review = {
  id: string; merchantId: string | null; merchantName: string; dishName: string; userName: string; rating: number; comment: string; createdAt: number;
  flagged: boolean; flagReason: string | null; hidden: boolean; adminNote: string; moderated: boolean;
};
type Result = { counts: { all: number; queue: number; low: number; hidden: number }; reviews: Review[] };
type Filter = "queue" | "low" | "hidden" | "all";

// Moderate customer reviews: abusive or spammy reviews are auto-flagged, an admin hides, restores or dismisses them.
export default function ReviewsPage() {
  const [params, setParams] = useSearchParams();
  const merchantId = params.get("merchantId") ?? "";
  const [filter, setFilter] = useState<Filter>(merchantId ? "all" : "queue");
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" }>({ text: "", tone: "ok" });
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const url = `/admin/reviews?filter=${filter}${merchantId ? `&merchantId=${merchantId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { data, error, loading, reload } = useQuery<Result>(url);
  const p = { filter, setFilter, q, setQ, merchantId, clearMerchant: () => setParams({}), notice, setNotice, noteOpen, setNoteOpen, noteText, setNoteText };

  async function patch(r: Review, body: Record<string, unknown>, done: string) {
    try {
      await api(`/admin/reviews/${r.id}`, { method: "PATCH", body });
      p.setNotice({ text: done, tone: "ok" });
      p.setNoteOpen(null);
      reload();
    } catch (e) {
      p.setNotice({ text: (e as Error).message, tone: "bad" });
    }
  }

  const c = data?.counts;
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Review moderation</h1>
          <p className="muted">Hidden reviews disappear for customers and stop counting towards shop ratings. Nothing is deleted, and you can restore a review at any time.</p>
        </div>
        <button
          className="btn small ghost"
          disabled={!data || data.reviews.length === 0}
          onClick={() => data && downloadCsv("reviews.csv", ["Shop", "Dish", "Customer", "Rating", "Comment", "Flag", "Hidden", "Date"], data.reviews.map((r) => [r.merchantName, r.dishName, r.userName, r.rating, r.comment, r.flagReason, r.hidden ? "yes" : "no", new Date(r.createdAt).toISOString()]))}
        >
          Export CSV
        </button>
      </div>
      <Chips
        label="Review list"
        value={p.filter}
        onChange={p.setFilter}
        options={[
          { key: "queue", label: "Needs moderation", count: c?.queue },
          { key: "low", label: "Low ratings (1-2★)", count: c?.low },
          { key: "hidden", label: "Hidden", count: c?.hidden },
          { key: "all", label: "All reviews", count: c?.all },
        ]}
      />
      <div className="toolbar">
        <label className="sr-only" htmlFor="rev-q">Search reviews</label>
        <input id="rev-q" type="search" placeholder="Search comment, customer, shop or dish" value={p.q} onChange={(e) => p.setQ(e.target.value)} />
        {p.merchantId ? (
          <button className="chip on" onClick={p.clearMerchant} aria-label="Remove shop filter">
            Shop: {data?.reviews[0]?.merchantName ?? p.merchantId} ✕
          </button>
        ) : null}
      </div>
      <Notice {...p.notice} />
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {data && data.reviews.length === 0 ? <div className="card ok-card">{p.filter === "queue" ? "Nothing to moderate. All flagged reviews are handled." : "No reviews in this list."}</div> : null}
      <div className="review-list">
        {(data?.reviews ?? []).map((r) => (
          <article key={r.id} className={`card review ${r.hidden ? "is-hidden" : ""} ${r.flagged && !r.hidden && !r.moderated ? "needs" : ""}`}>
            <header>
              <div>
                <Stars value={r.rating} /> <b>{r.rating}/5</b>
                <span className="muted"> · {r.dishName} · {r.merchantName}</span>
              </div>
              <div className="tags">
                {r.hidden ? <span className="badge rejected">Hidden</span> : null}
                {r.flagged ? <span className="badge pending">Flagged: {r.flagReason}</span> : null}
              </div>
            </header>
            <p className="quote">{r.comment ? `“${r.comment}”` : <span className="muted">No comment, rating only.</span>}</p>
            <footer>
              <span className="muted">{r.userName} · {ago(r.createdAt)}</span>
              <div className="row-actions">
                {r.hidden ? (
                  <button className="btn small" onClick={() => patch(r, { hidden: false }, "Review restored.")}>Restore</button>
                ) : (
                  <button className="btn small danger" onClick={() => patch(r, { hidden: true }, "Review hidden from customers.")}>Hide review</button>
                )}
                {r.flagged ? (
                  <button className="btn small ghost" onClick={() => patch(r, { flagged: false }, "Flag dismissed.")}>Dismiss flag</button>
                ) : (
                  <button className="btn small ghost" onClick={() => patch(r, { flagged: true }, "Review flagged.")}>Flag</button>
                )}
                <button className="btn small ghost" onClick={() => { p.setNoteOpen(p.noteOpen === r.id ? null : r.id); p.setNoteText(r.adminNote); }}>
                  {r.adminNote ? "Edit note" : "Add note"}
                </button>
              </div>
            </footer>
            {r.adminNote && p.noteOpen !== r.id ? <p className="admin-note"><b>Admin note:</b> {r.adminNote}</p> : null}
            {p.noteOpen === r.id ? (
              <div className="note-edit">
                <label htmlFor={`note-${r.id}`} className="lbl">Internal note (only admins see this)</label>
                <input id={`note-${r.id}`} value={p.noteText} maxLength={200} onChange={(e) => p.setNoteText(e.target.value)} />
                <button className="btn small" onClick={() => patch(r, { note: p.noteText }, "Note saved.")}>Save note</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
