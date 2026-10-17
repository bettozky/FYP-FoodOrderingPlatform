import { Order, OrderItem } from "../../shared/api/types";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

export function orderBadge(o: Order): { label: string; tone: Tone } {
  if (o.decision === "pending") return { label: "Needs your decision", tone: "warning" };
  switch (o.status) {
    case "awaiting_merchant": return { label: "Awaiting restaurant", tone: "warning" };
    case "awaiting_payment": return { label: "Confirmed - pay now", tone: "success" };
    case "preparing": return o.items.some((i) => i.status === "ready") ? { label: "Ready to collect", tone: "success" } : { label: "Preparing", tone: "primary" };
    case "completed": return { label: "Completed", tone: "success" };
    case "rejected": return { label: "Declined by restaurant", tone: "danger" };
    case "expired": return { label: o.cancelReason === "not_paid" ? "Not paid - cancelled" : "No reply - cancelled", tone: "danger" };
    case "cancelled": return { label: "Cancelled", tone: "danger" };
  }
}

export function itemBadge(i: OrderItem): { label: string; tone: Tone } {
  switch (i.status) {
    case "preparing": return { label: "Preparing", tone: "primary" };
    case "ready": return { label: "Ready - collect", tone: "success" };
    case "collected": return { label: "Collected", tone: "success" };
    case "handed_over": return { label: "With rider", tone: "primary" };
    case "delivered": return { label: "Delivered", tone: "success" };
    case "out_of_stock": return { label: "Out of stock", tone: "danger" };
    case "cancelled": return { label: "Cancelled", tone: "danger" };
  }
}

export const isActive = (o: Order) => o.status === "awaiting_merchant" || o.status === "awaiting_payment" || o.status === "preparing";
