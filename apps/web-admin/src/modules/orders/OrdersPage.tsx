import { api } from "../../shared/api";
import { StatusLine, useLoad } from "../../shared/useLoad";

type Order = {
  id: string; customerName: string; merchantName: string; status: string; itemCount: number;
  total: number; refunded: number; createdAt: number; cancelReason: string | null;
};

const label: Record<string, string> = {
  awaiting_merchant: "Waiting for shop",
  awaiting_payment: "Waiting for payment",
  preparing: "Preparing",
  completed: "Completed",
  rejected: "Declined",
  expired: "No reply",
  cancelled: "Cancelled",
};
const tone = (s: string) => (s === "completed" ? "approved" : s === "rejected" || s === "expired" || s === "cancelled" ? "rejected" : "pending");

// FR-6.4: all orders, newest first (live from the backend).
export default function OrdersPage() {
  const { data, error, loading, reload } = useLoad(() => api<{ orders: Order[] }>("/admin/orders?limit=200").then((r) => r.orders));
  return (
    <div>
      <h1>Orders</h1>
      <p className="muted">Every order, newest first.</p>
      <p><button className="btn small" onClick={reload}>Refresh</button></p>
      <StatusLine loading={loading} error={error} onRetry={reload} />
      {!loading && !error && data && data.length === 0 ? <div className="card">No orders yet.</div> : null}
      {data && data.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Shop</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Placed</th></tr></thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order">{o.id}</td>
                  <td data-label="Customer">{o.customerName}</td>
                  <td data-label="Shop">{o.merchantName}</td>
                  <td data-label="Items">{o.itemCount}</td>
                  <td data-label="Total">RM {o.total.toFixed(2)}{o.refunded > 0 ? <><br /><span className="muted">refunded RM {o.refunded.toFixed(2)}</span></> : null}</td>
                  <td data-label="Status"><span className={`badge ${tone(o.status)}`}>{label[o.status] ?? o.status}</span></td>
                  <td data-label="Placed">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
