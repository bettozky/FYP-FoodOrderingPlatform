export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Platform overview (FR-6.6). Numbers below are placeholders until the backend is connected.</p>
      <div className="stats">
        <div className="card stat"><span className="muted">Orders today</span><b>0</b></div>
        <div className="card stat"><span className="muted">Revenue today</span><b>RM 0</b></div>
        <div className="card stat"><span className="muted">Merchants waiting approval</span><b>2</b></div>
        <div className="card stat"><span className="muted">Open disputes</span><b>0</b></div>
      </div>
    </div>
  );
}
