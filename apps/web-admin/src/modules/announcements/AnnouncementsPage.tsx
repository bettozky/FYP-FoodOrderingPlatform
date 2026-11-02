import { useState } from "react";
import { api } from "../../shared/api";
import { Notice, ago } from "../../shared/ui";
import { StatusLine, useLoad } from "../../shared/useLoad";

type Entry = { id: string; at: number; admin: string; target: string; detail?: string };

// Send a message to every customer, every shop, or everyone. It appears as a notice in their app.
export default function AnnouncementsPage() {
  const { data, error, loading, reload } = useLoad(() => api<{ entries: Entry[] }>("/admin/audit?action=announcement&limit=30").then((r) => r.entries));
  const [audience, setAudience] = useState("customers");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" }>({ text: "", tone: "ok" });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Send this to ${audience === "all" ? "everyone" : audience}? It cannot be recalled.`)) return;
    setBusy(true);
    try {
      const r = await api<{ sent: number }>("/admin/announcements", { method: "POST", body: { audience, title, body } });
      setNotice({ text: `Sent to ${r.sent} user${r.sent === 1 ? "" : "s"}.`, tone: "ok" });
      setTitle("");
      setBody("");
      reload();
    } catch (err) {
      setNotice({ text: (err as Error).message, tone: "bad" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Announcements</h1>
      <p className="muted">Tell customers or shops about promotions, downtime or new rules. Suspended users are skipped.</p>
      <Notice {...notice} />
      <form className="card form-card" onSubmit={send} aria-label="New announcement">
        <label className="lbl" htmlFor="a-aud">Send to</label>
        <select id="a-aud" value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="customers">All customers</option>
          <option value="merchants">All shop owners</option>
          <option value="all">Everyone</option>
        </select>
        <label className="lbl" htmlFor="a-title">Title</label>
        <input id="a-title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Free delivery this weekend" />
        <label className="lbl" htmlFor="a-body">Message</label>
        <textarea id="a-body" required rows={4} maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="row-actions end"><button className="btn small" type="submit" disabled={busy || !title.trim() || !body.trim()}>{busy ? "Sending…" : "Send announcement"}</button></div>
      </form>
      <h2 className="section">Recently sent</h2>
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {data && data.length === 0 ? <div className="card">Nothing sent yet.</div> : null}
      <ul className="history">
        {(data ?? []).map((a) => (
          <li key={a.id} className="card">
            <b>{(a.detail ?? "").split("\n")[0]}</b> <span className="muted">to {a.target} · {ago(a.at)} · by {a.admin}</span>
            <p>{(a.detail ?? "").split("\n").slice(1).join("\n")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
