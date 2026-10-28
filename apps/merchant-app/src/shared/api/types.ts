// Shapes returned by the backend (see backend/src/store/types.ts).
export type Mode = "delivery" | "dine_in" | "takeaway";
export const MODE_LABEL: Record<Mode, string> = { delivery: "Delivery", dine_in: "Dine-in", takeaway: "Takeaway" };

export type OrderItem = {
  id: string; dishId: string; name: string; price: number; qty: number; mode: Mode; options: string[];
  status: "preparing" | "ready" | "collected" | "handed_over" | "delivered" | "out_of_stock" | "cancelled";
};

export type Order = {
  id: string; customerName: string; customerPhone?: string; items: OrderItem[];
  deliveryAddress?: { label: string; line: string };
  subtotal: number; deliveryFee: number; discount: number; total: number; refunded: number;
  status: "awaiting_merchant" | "awaiting_payment" | "preparing" | "completed" | "rejected" | "expired" | "cancelled";
  payBy?: number; paidAt?: number; paymentMethod?: "card" | "fpx" | "cash"; cashDue?: number; cashReceivedAt?: number; cancelReason?: "no_reply" | "not_paid" | "customer";
  decision?: "pending" | "accepted_partial" | "cancelled";
  respondBy: number; createdAt: number;
};

export type PreorderItem = { id: string; dishId: string; name: string; price: number; qty: number; status: "pending" | "approved" | "declined" };

export type Reservation = {
  id: string; customerName: string; customerPhone: string; date: string; time: string; partySize: number;
  specialRequest?: string; preorder: PreorderItem[]; payNow: boolean; paid: number; refunded: number; amountDue?: number; payBy?: number;
  status: "awaiting_restaurant" | "awaiting_payment" | "confirmed" | "declined" | "expired" | "cancelled" | "completed";
  allocatedTable?: string; respondBy: number; createdAt: number;
};

export type MerchantProfile = {
  id: string; name: string; approval: "pending" | "approved" | "rejected" | "suspended";
  storeMode: "online" | "dine_in" | "offline"; hours: { open: string; close: string }; openNow: boolean; phone: string;
};
