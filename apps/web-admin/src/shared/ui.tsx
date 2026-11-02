import { useEffect, useRef } from "react";

export const rm = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export const when = (ts: number) => new Date(ts).toLocaleString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Stars as text + symbol, so the rating never relies on colour alone. */
export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {"★".repeat(Math.round(value))}
      <span className="off">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

/** Native <dialog>: gives focus trapping, Escape to close and a backdrop for free. */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-labelledby="modal-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      {open ? (
        <div className="modal-body">
          <div className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button className="btn small ghost" onClick={onClose} aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { key: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} className={`chip ${value === o.key ? "on" : ""}`} aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}
          {o.count !== undefined ? <span className="count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Small message that confirms an action and fades by itself. */
export function Notice({ text, tone = "ok" }: { text: string; tone?: "ok" | "bad" }) {
  if (!text) return null;
  return <div className={`notice ${tone}`} role={tone === "bad" ? "alert" : "status"}>{text}</div>;
}
