// Shapes returned by the backend (see backend/src/store/types.ts).
export type Mode = "delivery" | "dine_in" | "takeaway";
export const MODE_LABEL: Record<Mode, string> = { delivery: "Delivery", dine_in: "Dine-in", takeaway: "Takeaway" };
export const MODE_ICON: Record<Mode, string> = { delivery: "bicycle", dine_in: "restaurant", takeaway: "bag-handle" };

export type Merchant = {
  id: string; name: string; stallNo: string; rating: number; prepMinutes: number; tags: string[]; color: string;
  hours: { open: string; close: string }; venueCategory?: string; phone: string; lat: number; lng: number;
  openNow: boolean; dineInOnly: boolean; distanceKm: number;
};

export type Dish = {
  id: string; merchantId: string; name: string; price: number; image: string; imageUrl?: string; description: string; category: string;
  calories: number; soldOut: boolean; spicy?: boolean; dietary: string[]; style?: "dry" | "wet"; customisations: string[];
};

export type OrderItem = {
  id: string; dishId: string; name: string; price: number; qty: number; mode: Mode; options: string[];
  status: "preparing" | "ready" | "collected" | "handed_over" | "delivered" | "out_of_stock" | "cancelled";
};

export type Order = {
  id: string; merchantId: string; merchantName: string; merchantPhone?: string; items: OrderItem[];
  deliveryAddress?: { label: string; line: string; lat: number; lng: number };
  subtotal: number; deliveryFee: number; discount: number; total: number; refunded: number;
  status: "awaiting_merchant" | "awaiting_payment" | "preparing" | "completed" | "rejected" | "expired" | "cancelled";
  payBy?: number; paidAt?: number; cancelReason?: "no_reply" | "not_paid" | "customer";
  decision?: "pending" | "accepted_partial" | "cancelled";
  respondBy: number; createdAt: number; reviewedDishIds: string[]; canReview: boolean;
};

export type PreorderItem = { id: string; dishId: string; name: string; price: number; qty: number; status: "pending" | "approved" | "declined" };

export type Reservation = {
  id: string; merchantId: string; merchantName: string; merchantPhone?: string; venueCategory?: string;
  date: string; time: string; partySize: number; specialRequest?: string; preorder: PreorderItem[];
  payNow: boolean; paid: number; refunded: number;
  status: "awaiting_restaurant" | "confirmed" | "declined" | "expired" | "cancelled" | "completed";
  allocatedTable?: string; respondBy: number; createdAt: number; cutoffMs: number;
};

export type Voucher = { id: string; title: string; description: string; amount: number; minSpend: number; requireCategory?: string; merchantId?: string };

export type AppNotification = { id: string; type: string; title: string; body: string; data?: Record<string, any>; createdAt: number };

export type Job = { id: string; merchantName: string; title: string; type: string; pay: string; description: string; postedAt: number };
