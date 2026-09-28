// Mock data standing in for the backend API during frontend development.
// Shape mirrors what the Logistics/Ordering modules would return, so wiring
// up real endpoints later is a drop-in swap rather than a rewrite.

export type Merchant = {
  id: string;
  name: string;
  stallNo: string;
  rating: number;
  distanceKm: number;
  prepMinutes: number;
  tags: string[];
  color: string;
};

export type Dish = {
  id: string;
  name: string;
  merchantId: string;
  price: number;
  image: string; // emoji placeholder, swap for real photo later
  description: string;
  category: string;
  soldOut?: boolean;
  spicy?: boolean;
};

export const merchants: Merchant[] = [
  { id: "m1", name: "Ah Seng Noodle House", stallNo: "Canteen A, Stall 3", rating: 4.6, distanceKm: 0.2, prepMinutes: 12, tags: ["Noodles", "Halal-friendly"], color: "#F2A65A" },
  { id: "m2", name: "Nasi Kak Yah", stallNo: "Canteen A, Stall 7", rating: 4.8, distanceKm: 0.2, prepMinutes: 15, tags: ["Malay", "Rice"], color: "#7FB685" },
  { id: "m3", name: "Golden Wok", stallNo: "Canteen B, Stall 2", rating: 4.3, distanceKm: 0.4, prepMinutes: 10, tags: ["Chinese", "Fried"], color: "#E8998D" },
  { id: "m4", name: "Curry Corner", stallNo: "Canteen B, Stall 5", rating: 4.5, distanceKm: 0.4, prepMinutes: 18, tags: ["Indian", "Curry"], color: "#C97B63" },
  { id: "m5", name: "Boba & Brew", stallNo: "Canteen A, Stall 1", rating: 4.7, distanceKm: 0.2, prepMinutes: 6, tags: ["Drinks", "Dessert"], color: "#8E7CC3" },
];

export const dishes: Dish[] = [
  { id: "d1", name: "Beef Noodle Soup", merchantId: "m1", price: 8.5, image: "🍜", description: "Slow-braised beef brisket, flat rice noodles, house broth.", category: "Noodles" },
  { id: "d2", name: "Dry Wantan Mee", merchantId: "m1", price: 7.0, image: "🍝", description: "Springy egg noodles tossed in dark sauce, char siu, wantan.", category: "Noodles" },
  { id: "d3", name: "Nasi Lemak Ayam Goreng", merchantId: "m2", price: 7.5, image: "🍛", description: "Coconut rice, fried chicken, sambal, egg, peanuts.", category: "Rice" },
  { id: "d4", name: "Beef Rendang Rice", merchantId: "m2", price: 9.0, image: "🍚", description: "Rich, slow-cooked beef rendang over steamed rice.", category: "Rice", spicy: true },
  { id: "d5", name: "Beef Hor Fun", merchantId: "m3", price: 8.0, image: "🍲", description: "Wok-fried flat noodles with tender beef slices, egg gravy.", category: "Noodles" },
  { id: "d6", name: "Sweet & Sour Chicken", merchantId: "m3", price: 8.5, image: "🍗", description: "Crispy chicken, pineapple, capsicum, tangy sauce.", category: "Rice", soldOut: true },
  { id: "d7", name: "Beef Curry with Rice", merchantId: "m4", price: 9.5, image: "🍛", description: "Slow-simmered beef curry, potatoes, steamed rice.", category: "Rice", spicy: true },
  { id: "d8", name: "Chicken Briyani", merchantId: "m4", price: 9.0, image: "🍛", description: "Fragrant spiced rice, roasted chicken leg, raita.", category: "Rice" },
  { id: "d9", name: "Brown Sugar Boba Milk", merchantId: "m5", price: 6.5, image: "🧋", description: "Fresh milk, chewy boba, brown sugar syrup.", category: "Drinks" },
  { id: "d10", name: "Iced Lemon Tea", merchantId: "m5", price: 3.5, image: "🍹", description: "Classic housemade lemon tea, not too sweet.", category: "Drinks" },
];

export const categories = ["All", "Noodles", "Rice", "Drinks"];

export type OrderStatus = "placed" | "preparing" | "ready" | "on_the_way" | "delivered";

export type OrderItem = { dishId: string; name: string; qty: number; price: number };

export type Order = {
  id: string;
  merchantName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  mode: "Dine-in" | "Takeaway" | "Delivery";
  placedAt: string;
  etaMinutes: number;
};

export const activeOrder: Order = {
  id: "SM-10245",
  merchantName: "Ah Seng Noodle House",
  items: [
    { dishId: "d1", name: "Beef Noodle Soup", qty: 1, price: 8.5 },
    { dishId: "d9", name: "Brown Sugar Boba Milk", qty: 1, price: 6.5 },
  ],
  total: 15.0,
  status: "preparing",
  mode: "Delivery",
  placedAt: "12:41 PM",
  etaMinutes: 18,
};

export const orderHistory: Order[] = [
  {
    id: "SM-10190",
    merchantName: "Nasi Kak Yah",
    items: [{ dishId: "d3", name: "Nasi Lemak Ayam Goreng", qty: 2, price: 7.5 }],
    total: 15.0,
    status: "delivered",
    mode: "Takeaway",
    placedAt: "Yesterday, 1:05 PM",
    etaMinutes: 0,
  },
  {
    id: "SM-10122",
    merchantName: "Curry Corner",
    items: [{ dishId: "d7", name: "Beef Curry with Rice", qty: 1, price: 9.5 }],
    total: 9.5,
    status: "delivered",
    mode: "Dine-in",
    placedAt: "3 days ago",
    etaMinutes: 0,
  },
];

export type Voucher = {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  expiresIn: string;
};

export const loyalty = {
  points: 320,
  tier: "Regular",
  nextTierAt: 500,
};

export const vouchers: Voucher[] = [
  { id: "v1", title: "RM3 off", description: "Any order above RM15", pointsCost: 150, expiresIn: "12 days" },
  { id: "v2", title: "Free Iced Lemon Tea", description: "With any rice dish", pointsCost: 100, expiresIn: "20 days" },
  { id: "v3", title: "RM5 off", description: "Any order above RM25", pointsCost: 250, expiresIn: "7 days" },
];

// --- Merchant-side mock data -------------------------------------------

export type MerchantOrder = {
  id: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  mode: "Dine-in" | "Takeaway" | "Delivery";
  status: OrderStatus;
  placedAt: string;
};

export const merchantIncomingOrders: MerchantOrder[] = [
  {
    id: "SM-10251",
    customerName: "Aliff B.",
    items: [{ dishId: "d1", name: "Beef Noodle Soup", qty: 2, price: 8.5 }],
    total: 17.0,
    mode: "Delivery",
    status: "placed",
    placedAt: "Just now",
  },
  {
    id: "SM-10250",
    customerName: "Mei Ling",
    items: [{ dishId: "d2", name: "Dry Wantan Mee", qty: 1, price: 7.0 }],
    total: 7.0,
    mode: "Takeaway",
    status: "preparing",
    placedAt: "4 min ago",
  },
  {
    id: "SM-10248",
    customerName: "Raj K.",
    items: [
      { dishId: "d1", name: "Beef Noodle Soup", qty: 1, price: 8.5 },
      { dishId: "d2", name: "Dry Wantan Mee", qty: 1, price: 7.0 },
    ],
    total: 15.5,
    mode: "Dine-in",
    status: "ready",
    placedAt: "11 min ago",
  },
];

export const merchantMenu = dishes.filter((d) => d.merchantId === "m1");

export const merchantStats = {
  todayOrders: 24,
  todayRevenue: 312.5,
  avgPrepMinutes: 12,
};
