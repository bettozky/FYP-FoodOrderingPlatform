import { useState } from "react";

type Status = "pending" | "approved" | "rejected" | "suspended";
type Merchant = { id: string; name: string; status: Status };

// Sample rows only. FR-6.2: review, approve, reject or suspend merchant registrations.
const initial: Merchant[] = [
  { id: "m-101", name: "Sample Noodle House", status: "pending" },
  { id: "m-102", name: "Sample Nasi Kitchen", status: "pending" },
  { id: "m-103", name: "Sample Drinks Stall", status: "approved" },
];

export default function MerchantsPage() {
  const [rows, setRows] = useState(initial);
  const set = (id: string, status: Status) => setRows((r) => r.map((m) => (m.id === id ? { ...m, status } : m)));
  return (
    <div>
      <h1>Merchants</h1>
      <p className="muted">Requirements: FR-6.2. Sample data; replace with the backend admin API.</p>
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.name}</td>
              <td>{m.status}</td>
              <td style={{ display: "flex", gap: 6 }}>
                <button className="btn small" onClick={() => set(m.id, "approved")}>Approve</button>
                <button className="btn small danger" onClick={() => set(m.id, "rejected")}>Reject</button>
                <button className="btn small" onClick={() => set(m.id, "suspended")}>Suspend</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
