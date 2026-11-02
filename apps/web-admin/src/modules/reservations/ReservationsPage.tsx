import { useState } from "react";
import { Chips, downloadCsv, rm, when } from "../../shared/ui";
import { StatusLine, useQuery } from "../../shared/useLoad";

type R = { id: string; customerName: string; merchantName: string; date: string; time: string; partySize: number; status: string; table: string | null; payNow: boolean; paid: number; refunded: number; createdAt: number };
const label: Record<string, string> = {
  awaiting_restaurant: "Waiting for shop", awaiting_payment: "Waiting for payment", confirmed: "Confirmed", declined: "Declined", expired: "No reply", cancelled: "Cancelled", completed: "Completed",
};
const tone = (s: string) => (s === "confirmed" || s === "completed" ? "approved" : ["declined", "expired", "cancelled"].includes(s) ? "rejected" : "pending");

// Table bookings across all shops (read-only overview).
export default function ReservationsPage() {
  const [status, setStatus] = useState("");
  const { data, error, loading, reload } = useQuery<{ reservations: R[] }>(`/admin/reservations${status ? `?status=${status}` : ""}`);
  const rows = data?.reservations ?? [];
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Reservations</h1>
          <p className="muted">Table bookings across all shops.</p>
        </div>
        <button className="btn small ghost" disabled={rows.length === 0} onClick={() => downloadCsv("reservations.csv", ["Booking", "Customer", "Shop", "Date", "Time", "Guests", "Table", "Status"], rows.map((r) => [r.id, r.customerName, r.merchantName, r.date, r.time, r.partySize, r.table, label[r.status] ?? r.status]))}>Export CSV</button>
      </div>
      <Chips
        label="Filter by status"
        value={status}
        onChange={setStatus}
        options={[{ key: "", label: "All" }, { key: "awaiting_restaurant", label: "Waiting for shop" }, { key: "awaiting_payment", label: "Waiting for payment" }, { key: "confirmed", label: "Confirmed" }, { key: "completed", label: "Completed" }, { key: "declined", label: "Declined" }, { key: "expired", label: "No reply" }, { key: "cancelled", label: "Cancelled" }]}
      />
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {!loading && !error && rows.length === 0 ? <div className="card">No reservations in this list.</div> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Booking</th><th scope="col">Customer</th><th scope="col">Shop</th><th scope="col">When</th><th scope="col">Guests</th><th scope="col">Table</th><th scope="col">Payment</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Booking">{r.id}<br /><span className="muted">booked {when(r.createdAt)}</span></td>
                  <td data-label="Customer">{r.customerName}</td>
                  <td data-label="Shop">{r.merchantName}</td>
                  <td data-label="When">{r.date} {r.time}</td>
                  <td data-label="Guests">{r.partySize}</td>
                  <td data-label="Table">{r.table ?? "-"}</td>
                  <td data-label="Payment">{r.payNow ? (r.paid > 0 ? `Paid ${rm(r.paid)}` : "Pay now") : "Pay later"}{r.refunded > 0 ? <><br /><span className="muted">refunded {rm(r.refunded)}</span></> : null}</td>
                  <td data-label="Status"><span className={`badge ${tone(r.status)}`}>{label[r.status] ?? r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
