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
      <div className="table-wrap">
      <table>
        <thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td data-label="ID">{m.id}</td>
              <td data-label="Name">{m.name}</td>
              <td data-label="Status"><span className={`badge ${m.status}`}>{m.status}</span></td>
              <td data-label="Actions">
                <div className="row-actions">
                  <button className="btn small" aria-label={`Approve ${m.name}`} onClick={() => set(m.id, "approved")}>Approve</button>
                  <button className="btn small danger" aria-label={`Reject ${m.name}`} onClick={() => set(m.id, "rejected")}>Reject</button>
                  <button className="btn small" aria-label={`Suspend ${m.name}`} onClick={() => set(m.id, "suspended")}>Suspend</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
