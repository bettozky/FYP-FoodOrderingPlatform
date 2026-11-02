import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../shared/api";
import { Chips, Modal, Notice, downloadCsv, rm, when } from "../../shared/ui";
import { StatusLine, useQuery } from "../../shared/useLoad";

type Order = {
  id: string; customerName: string; merchantName: string; merchantId: string; status: string; itemCount: number;
  total: number; refunded: number; createdAt: number; cancelReason: string | null; method: "card" | "fpx" | "cash" | null; cashPending: boolean;
};
type Detail = {
  order: {
    id: string; customerName: string; customerPhone?: string; merchantName: string; merchantPhone?: string; status: string; total: number; subtotal: number;
    deliveryFee: number; discount: number; refunded: number; method: string | null; canRefund: boolean; cashDue?: number; deliveryAddress?: { line: string };
    items: { id: string; name: string; qty: number; price: number; mode: string; status: string }[];
  };
  timeline: { label: string; at: number }[];
};

const label: Record<string, string> = {
  awaiting_merchant: "Waiting for shop", awaiting_payment: "Waiting for payment", preparing: "Preparing", completed: "Completed",
  rejected: "Declined", expired: "No reply", cancelled: "Cancelled",
};
const tone = (s: string) => (s === "completed" ? "approved" : s === "rejected" || s === "expired" || s === "cancelled" ? "rejected" : "pending");
const methodText = { card: "Card", fpx: "FPX", cash: "Cash" } as const;
type Filter = "" | "awaiting_merchant" | "awaiting_payment" | "preparing" | "completed" | "rejected" | "expired" | "cancelled";

// FR-6.4: all orders with search, filters, CSV export, and a detail view where an admin can refund (disputes).
export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const merchantId = params.get("merchantId") ?? "";
  const [status, setStatus] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const url = `/admin/orders?limit=300${status ? `&status=${status}` : ""}${merchantId ? `&merchantId=${merchantId}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { data, error, loading, reload } = useQuery<{ orders: Order[] }>(url);
  const orders = data?.orders ?? [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="muted">Every order, newest first. Open one to see its timeline or issue a refund.</p>
        </div>
        <div className="row-actions">
          <button className="btn small ghost" onClick={reload}>Refresh</button>
          <button
            className="btn small ghost"
            disabled={orders.length === 0}
            onClick={() => downloadCsv("orders.csv", ["Order", "Customer", "Shop", "Items", "Total (RM)", "Refunded (RM)", "Payment", "Status", "Placed"], orders.map((o) => [o.id, o.customerName, o.merchantName, o.itemCount, o.total.toFixed(2), o.refunded.toFixed(2), o.method ?? "", label[o.status] ?? o.status, new Date(o.createdAt).toISOString()]))}
          >
            Export CSV
          </button>
        </div>
      </div>
      <Chips
        label="Filter by status"
        value={status}
        onChange={setStatus}
        options={[
          { key: "", label: "All" }, { key: "awaiting_merchant", label: "Waiting for shop" }, { key: "awaiting_payment", label: "Waiting for payment" },
          { key: "preparing", label: "Preparing" }, { key: "completed", label: "Completed" }, { key: "rejected", label: "Declined" }, { key: "expired", label: "No reply" }, { key: "cancelled", label: "Cancelled" },
        ]}
      />
      <div className="toolbar">
        <label className="sr-only" htmlFor="ord-q">Search orders</label>
        <input id="ord-q" type="search" placeholder="Search order number, customer or shop" value={q} onChange={(e) => setQ(e.target.value)} />
        {merchantId ? <button className="chip on" onClick={() => setParams({})} aria-label="Remove shop filter">Shop: {orders[0]?.merchantName ?? merchantId} ✕</button> : null}
      </div>
      <StatusLine loading={loading && !data} error={error} onRetry={reload} />
      {!loading && !error && orders.length === 0 ? <div className="card">No orders match.</div> : null}
      {orders.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Shop</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Payment</th><th scope="col">Status</th><th scope="col">Placed</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order"><button className="link" onClick={() => setOpen(o.id)} aria-label={`Open order ${o.id}`}>{o.id}</button></td>
                  <td data-label="Customer">{o.customerName}</td>
                  <td data-label="Shop">{o.merchantName}</td>
                  <td data-label="Items">{o.itemCount}</td>
                  <td data-label="Total">{rm(o.total)}{o.refunded > 0 ? <><br /><span className="muted">refunded {rm(o.refunded)}</span></> : null}</td>
                  <td data-label="Payment">{o.method ? methodText[o.method] : "-"}{o.cashPending ? <><br /><span className="muted">cash not collected</span></> : null}</td>
                  <td data-label="Status"><span className={`badge ${tone(o.status)}`}>{label[o.status] ?? o.status}</span></td>
                  <td data-label="Placed">{when(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <OrderDialog id={open} onClose={() => setOpen(null)} onChanged={reload} />
    </div>
  );
}

function OrderDialog({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  return (
    <Modal open={!!id} title={`Order ${id ?? ""}`} onClose={onClose}>
      {id ? <OrderBody id={id} onChanged={onChanged} /> : null}
    </Modal>
  );
}

function OrderBody({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { data, error, loading, reload } = useQuery<Detail>(`/admin/orders/${id}`);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" }>({ text: "", tone: "ok" });
  const o = data?.order;

  async function refund() {
    try {
      const r = await api<{ refunded: number }>(`/admin/orders/${id}/refund`, { method: "POST", body: { amount: Number(amount), reason } });
      setNotice({ text: `Refunded ${rm(r.refunded)}. The customer was notified.`, tone: "ok" });
      setAmount("");
      setReason("");
      reload();
      onChanged();
    } catch (e) {
      setNotice({ text: (e as Error).message, tone: "bad" });
    }
  }

  return (
    <>
      <StatusLine loading={loading && !o} error={error} onRetry={reload} />
      {o ? (
        <>
          <p>
            <span className={`badge ${tone(o.status)}`}>{label[o.status] ?? o.status}</span>{" "}
            <b>{o.customerName}</b> ordered from <b>{o.merchantName}</b>
            {o.customerPhone ? <span className="muted"> · customer {o.customerPhone}</span> : null}
          </p>
          <ul className="lines">
            {o.items.map((i) => (
              <li key={i.id}><span>{i.qty}× {i.name} <span className="muted">· {i.mode.replace("_", "-")} · {i.status.replace("_", " ")}</span></span><span>{rm(i.price * i.qty)}</span></li>
            ))}
            {o.deliveryFee > 0 ? <li><span>Delivery fee</span><span>{rm(o.deliveryFee)}</span></li> : null}
            {o.discount > 0 ? <li><span>Voucher</span><span>– {rm(o.discount)}</span></li> : null}
            <li className="total"><span>Total{o.method ? ` (${o.method === "fpx" ? "FPX" : o.method})` : ""}</span><span>{rm(o.total)}</span></li>
            {o.refunded > 0 ? <li><span>Refunded</span><span>{rm(o.refunded)}</span></li> : null}
          </ul>
          {o.deliveryAddress ? <p className="muted">Deliver to: {o.deliveryAddress.line}</p> : null}
          <h3>Timeline</h3>
          <ol className="timeline">
            {(data?.timeline ?? []).map((t, i) => (
              <li key={i}><b>{t.label}</b><span className="muted">{when(t.at)}</span></li>
            ))}
          </ol>
          <Notice {...notice} />
          {o.canRefund ? (
            <div className="refund">
              <h3>Refund (dispute or complaint)</h3>
              <p className="muted">
                {o.method === "cash"
                  ? `This is a cash order that was not collected yet, so a refund lowers what the customer owes at the stall (up to ${rm(o.cashDue ?? 0)}).`
                  : `Money goes back to the customer's payment (up to ${rm(o.total - o.refunded)}).`}
              </p>
              <div className="form-row">
                <div>
                  <label className="lbl" htmlFor="refund-amt">Amount (RM)</label>
                  <input id="refund-amt" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="lbl" htmlFor="refund-why">Reason (the customer sees this)</label>
                  <input id="refund-why" value={reason} maxLength={120} placeholder="e.g. Food arrived cold" onChange={(e) => setReason(e.target.value)} />
                </div>
              </div>
              <div className="row-actions end">
                <button className="btn small" disabled={!(Number(amount) > 0) || !reason.trim()} onClick={refund}>Issue refund</button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
