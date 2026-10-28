export type Role = "customer" | "merchant" | "admin";
export type MerchantApproval = "pending" | "approved" | "rejected" | "suspended";
export type StoreMode = "online" | "dine_in" | "offline"; // dashboard switch: all / dine-in only / closed
export type FulfilmentMode = "delivery" | "dine_in" | "takeaway";

export interface User {
  id: string;
  role: Role;
  email: string;
  name: string;
  phone?: string;
  dob?: string; // YYYY-MM-DD
  passwordHash: string;
  merchantId?: string;
}

export interface Merchant {
  id: string;
  name: string;
  stallNo: string;
  rating: number;
  lat: number;
  lng: number;
  prepMinutes: number;
  tags: string[];
  color: string;
  hours: { open: string; close: string }; // "HH:MM" local time
  approval: MerchantApproval;
  storeMode: StoreMode;
  venueCategory?: "Trending" | "Buffet" | "Luxury" | "Aesthetic Cafe";
  phone: string;
  ownerUserId?: string;
  application?: Record<string, any>; // the sign-up answers (FR-5.1), shown to the admin
}

export interface Dish {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  image: string; // emoji, shown when there is no photo
  imageUrl?: string; // photo in Supabase Storage (public URL)
  description: string;
  category: string;
  calories: number;
  soldOut: boolean;
  spicy?: boolean;
  dietary: string[]; // spicy | vegetarian | plant_based | allergy_free
  style?: "dry" | "wet";
  customisations: string[];
  cost?: number; // ingredient cost, for the merchant's profit report (FR-5.12)
  stock?: number; // optional stock count; 0 means sold out
}

export type ItemStatus =
  | "preparing"
  | "ready" // dine-in / takeaway food waiting at the counter
  | "collected"
  | "handed_over" // delivery items given to the rider
  | "delivered"
  | "out_of_stock"
  | "cancelled";

export interface OrderItem {
  id: string;
  dishId: string;
  name: string;
  price: number;
  qty: number;
  mode: FulfilmentMode;
  options: string[];
  status: ItemStatus;
}

export type OrderStatus =
  | "awaiting_merchant" // request sent, restaurant has 10 minutes to confirm. Nothing is paid yet.
  | "awaiting_payment" // restaurant confirmed, customer must pay within the payment window
  | "preparing"
  | "completed"
  | "rejected"
  | "expired" // merchant did not answer in time
  | "cancelled";

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  merchantId: string;
  merchantName: string;
  items: OrderItem[];
  deliveryAddress?: { label: string; line: string; lat: number; lng: number };
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  refunded: number;
  paymentId?: string; // set when the customer pays, after the restaurant has confirmed
  voucherId?: string;
  status: OrderStatus;
  decision?: "pending" | "accepted_partial" | "cancelled"; // out-of-stock decision by the customer
  respondBy: number; // epoch ms: merchant deadline
  createdAt: number;
  payBy?: number; // epoch ms: customer payment deadline once the restaurant confirms
  paidAt?: number;
  cancelReason?: "not_paid" | "no_reply" | "customer";
  acceptedAt?: number;
  completedAt?: number;
  reviewedDishIds: string[];
}

export interface Payment {
  id: string;
  ref: string; // simulated Stripe payment intent id
  amount: number;
  refunded: number;
  status: "succeeded" | "refunded" | "partially_refunded";
  refunds: { amount: number; reason: string; at: number }[];
  createdAt: number;
  for: string; // order or reservation id
}

export interface PreorderItem {
  id: string;
  dishId: string;
  name: string;
  price: number;
  qty: number;
  status: "pending" | "approved" | "declined";
}

export type ReservationStatus =
  | "awaiting_restaurant"
  | "confirmed"
  | "declined"
  | "expired"
  | "cancelled"
  | "completed";

export interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  merchantId: string;
  merchantName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  partySize: number;
  specialRequest?: string;
  preorder: PreorderItem[];
  payNow: boolean;
  paymentId?: string;
  paid: number;
  refunded: number;
  status: ReservationStatus;
  allocatedTable?: string;
  respondBy: number;
  createdAt: number;
  reminded?: boolean;
}

export interface Voucher {
  id: string;
  title: string;
  description: string;
  amount: number; // RM off, or percent off when kind is "percent"
  kind: "fixed" | "percent";
  minSpend: number;
  requireCategory?: string;
  merchantId?: string; // set when created by a merchant promotion (FR-5.11)
  totalLimit?: number;
  claimed: number;
  costSpent: number; // what the promotion has cost the merchant so far
  expiryDate?: string; // YYYY-MM-DD
  active: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: number;
  ackedAt?: number;
}

export interface Delivery {
  orderId: string;
  riderId: string;
  startedAt: number;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export interface Job {
  id: string;
  merchantId: string;
  merchantName: string;
  title: string;
  type: string;
  pay: string;
  description: string;
  postedAt: number;
  open: boolean;
  role?: string;
  openings?: number;
  perks?: string;
  applicants?: number;
}

export interface Review {
  id: string;
  orderId: string;
  dishId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: number;
}

export type ChatRole = "customer" | "merchant";
export type ThreadKind = "order" | "reservation";

export interface ChatMessage {
  seq: number;
  id: string;
  kind: ThreadKind;
  threadId: string;
  from: ChatRole | "system";
  text: string;
  at: number;
  readBy: ChatRole[];
}

export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed";

export interface CallSignal {
  seq: number;
  from: ChatRole;
  type: "offer" | "answer" | "candidate";
  data: unknown;
}

export interface Call {
  id: string;
  kind: ThreadKind;
  threadId: string;
  callerRole: ChatRole;
  callerUserId: string;
  calleeUserId: string;
  callerName: string;
  calleeName: string;
  status: CallStatus;
  createdAt: number;
  answeredAt?: number;
  endedAt?: number;
  signals: CallSignal[];
}
