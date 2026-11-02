// Tiny SVG charts (no chart library). Each has a text summary for screen readers.
type Bar = { label: string; value: number };

export function BarChart({ data, format = (n) => String(n), height = 180, summary }: { data: Bar[]; format?: (n: number) => string; height?: number; summary: string }) {
  const W = 640, padL = 44, padB = 24, padT = 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const bw = (W - padL) / data.length;
  const h = height - padB - padT;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={summary} preserveAspectRatio="none">
        {[0, 0.5, 1].map((t) => {
          const y = padT + h - t * h;
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} className="grid" />
              <text x={padL - 6} y={y + 4} textAnchor="end" className="axis">{format(Math.round(nice * t))}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = (d.value / nice) * h;
          return (
            <g key={d.label + i}>
              <rect x={padL + i * bw + bw * 0.15} y={padT + h - bh} width={bw * 0.7} height={Math.max(bh, d.value > 0 ? 2 : 0)} rx="3" className="bar">
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
              {(data.length <= 14 || i % 2 === 0) && (
                <text x={padL + i * bw + bw / 2} y={height - 6} textAnchor="middle" className="axis">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** One horizontal stacked bar with a legend underneath (used for splits like card / FPX / cash). */
export function SplitBar({ parts }: { parts: { label: string; value: number; tone: string; note?: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="split" role="img" aria-label={parts.map((p) => `${p.label} ${total ? Math.round((p.value / total) * 100) : 0}%`).join(", ")}>
        {parts.map((p) => (
          <span key={p.label} className={`seg ${p.tone}`} style={{ width: `${total ? (p.value / total) * 100 : 0}%` }} />
        ))}
      </div>
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.label}>
            <i className={`dot ${p.tone}`} aria-hidden="true" />
            <span>{p.label}</span>
            <b>{total ? Math.round((p.value / total) * 100) : 0}%</b>
            {p.note ? <span className="muted"> · {p.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankList({ rows, format = (n) => String(n) }: { rows: { label: string; sub?: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="muted">No data yet.</p>;
  return (
    <ol className="rank">
      {rows.map((r) => (
        <li key={r.label + (r.sub ?? "")}>
          <div className="rank-top"><span>{r.label}{r.sub ? <span className="muted"> · {r.sub}</span> : null}</span><b>{format(r.value)}</b></div>
          <div className="rank-bar"><span style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ol>
  );
}
