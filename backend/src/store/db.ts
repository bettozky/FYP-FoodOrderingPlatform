// In-memory demo store (resets whenever the server restarts).
// Swap this for a real database later: every module reads/writes through `db`.
import { hashPassword } from "../lib/ids.js";
import type {
  Delivery, Dish, Job, Merchant, Notification, Order, Payment, Reservation, Review, User, Voucher,
} from "./types.js";

export interface Db {
  users: Map<string, User>;
  tokens: Map<string, string>; // token -> userId
  merchants: Map<string, Merchant>;
  dishes: Map<string, Dish>;
  orders: Map<string, Order>;
  payments: Map<string, Payment>;
  reservations: Map<string, Reservation>;
  vouchers: Voucher[];
  notifications: Map<string, Notification>;
  deliveries: Map<string, Delivery>;
  jobs: Map<string, Job>;
  reviews: Review[];
}

export const db: Db = {
  users: new Map(), tokens: new Map(), merchants: new Map(), dishes: new Map(), orders: new Map(),
  payments: new Map(), reservations: new Map(), vouchers: [], notifications: new Map(),
  deliveries: new Map(), jobs: new Map(), reviews: [],
};

export const CAMPUS = { lat: 1.5533, lng: 110.3592 };

export const RIDERS = [
  { id: "r1", name: "Wei Ming", lat: 1.5533, lng: 110.3592 },
  { id: "r2", name: "Farah", lat: 1.5522, lng: 110.3578 },
  { id: "r3", name: "Aiman", lat: 1.5548, lng: 110.3605 },
];

function m(x: Partial<Merchant> & Pick<Merchant, "id" | "name" | "stallNo" | "rating" | "lat" | "lng" | "prepMinutes" | "tags" | "color" | "phone">): Merchant {
  return { hours: { open: "00:00", close: "23:59" }, approval: "approved", storeMode: "online", ...x };
}
function d(x: Partial<Dish> & Pick<Dish, "id" | "merchantId" | "name" | "price" | "image" | "description" | "category" | "calories">): Dish {
  return { soldOut: false, dietary: [], customisations: [], cost: Math.round(x.price * 0.4 * 100) / 100, ...x };
}

export function resetDb() {
  for (const k of Object.keys(db) as (keyof Db)[]) {
    const v = db[k] as unknown;
    if (v instanceof Map) v.clear();
    else if (Array.isArray(v)) v.length = 0;
  }

  const merchants: Merchant[] = [
    m({ id: "m1", name: "Ah Seng Noodle House", stallNo: "Canteen A, Stall 3", rating: 4.6, lat: 1.5541, lng: 110.3601, prepMinutes: 12, tags: ["Noodles", "Halal-friendly"], color: "#C97F03", phone: "+60 12-300 0001", venueCategory: "Trending" }),
    m({ id: "m2", name: "Nasi Kak Yah", stallNo: "Canteen A, Stall 7", rating: 4.8, lat: 1.5538, lng: 110.3596, prepMinutes: 15, tags: ["Malay", "Rice"], color: "#3F5B34", phone: "+60 12-300 0002", venueCategory: "Buffet" }),
    m({ id: "m3", name: "Golden Wok", stallNo: "Canteen B, Stall 2", rating: 4.3, lat: 1.5575, lng: 110.3631, prepMinutes: 10, tags: ["Chinese", "Fried"], color: "#A8362B", phone: "+60 12-300 0003", hours: { open: "11:00", close: "15:00" }, venueCategory: "Luxury" }),
    m({ id: "m4", name: "Curry Corner", stallNo: "Canteen B, Stall 5", rating: 4.5, lat: 1.5569, lng: 110.3624, prepMinutes: 18, tags: ["Indian", "Curry"], color: "#9C6402", phone: "+60 12-300 0004", hours: { open: "07:00", close: "22:00" }, venueCategory: "Trending" }),
    m({ id: "m5", name: "Boba & Brew", stallNo: "Canteen A, Stall 1", rating: 4.7, lat: 1.5529, lng: 110.3588, prepMinutes: 6, tags: ["Drinks", "Dessert"], color: "#211D18", phone: "+60 12-300 0005", venueCategory: "Aesthetic Cafe" }),
    // waiting for admin approval (FR-5.1)
    m({ id: "m6", name: "Kopitiam Lama", stallNo: "Canteen C, Stall 4", rating: 0, lat: 1.5551, lng: 110.3612, prepMinutes: 10, tags: ["Kopitiam"], color: "#6B4F2A", phone: "+60 12-300 0006", approval: "pending" }),
    m({ id: "m7", name: "Sushi Zen", stallNo: "Canteen C, Stall 9", rating: 0, lat: 1.5559, lng: 110.3618, prepMinutes: 14, tags: ["Japanese"], color: "#2B5876", phone: "+60 12-300 0007", approval: "pending" }),
  ];
  merchants.forEach((x) => db.merchants.set(x.id, x));

  const dishes: Dish[] = [
    d({ id: "d1", merchantId: "m1", name: "Beef Noodle Soup", price: 8.5, image: "🍜", description: "Slow-braised beef brisket, flat rice noodles, house broth.", category: "Noodles", calories: 520, style: "wet", customisations: ["No spring onion", "Extra noodles", "Less salt"] }),
    d({ id: "d2", merchantId: "m1", name: "Dry Wantan Mee", price: 7.0, image: "🍝", description: "Springy egg noodles tossed in dark sauce, char siu, wantan.", category: "Noodles", calories: 470, style: "dry", customisations: ["No chilli", "Extra char siu"] }),
    d({ id: "d11", merchantId: "m1", name: "Vegetable Noodle Soup", price: 6.5, image: "🥬", description: "Clear vegetable broth, rice noodles, tofu and greens.", category: "Noodles", calories: 340, style: "wet", dietary: ["vegetarian", "plant_based", "allergy_free"], customisations: ["No spring onion"] }),
    d({ id: "d3", merchantId: "m2", name: "Nasi Lemak Ayam Goreng", price: 7.5, image: "🍛", description: "Coconut rice, fried chicken, sambal, egg, peanuts.", category: "Rice", calories: 650, style: "dry", customisations: ["Extra sambal", "No peanuts", "No egg"] }),
    d({ id: "d4", merchantId: "m2", name: "Beef Rendang Rice", price: 9.0, image: "🍚", description: "Rich, slow-cooked beef rendang over steamed rice.", category: "Rice", calories: 610, spicy: true, dietary: ["spicy"], style: "dry", customisations: ["Less spicy", "Extra rendang"] }),
    d({ id: "d12", merchantId: "m2", name: "Nasi Lemak Sayur", price: 6.0, image: "🥗", description: "Coconut rice with sambal tempeh, vegetables and cucumber.", category: "Rice", calories: 480, style: "dry", dietary: ["vegetarian"], customisations: ["Extra sambal"] }),
    d({ id: "d5", merchantId: "m3", name: "Beef Hor Fun", price: 8.0, image: "🍲", description: "Wok-fried flat noodles with tender beef slices, egg gravy.", category: "Noodles", calories: 540, style: "wet" }),
    d({ id: "d6", merchantId: "m3", name: "Sweet & Sour Chicken", price: 8.5, image: "🍗", description: "Crispy chicken, pineapple, capsicum, tangy sauce.", category: "Rice", calories: 590, style: "dry", soldOut: true }),
    d({ id: "d13", merchantId: "m3", name: "Vegetable Fried Rice", price: 6.5, image: "🍚", description: "Wok-fried rice with seasonal vegetables and egg.", category: "Rice", calories: 450, style: "dry", dietary: ["vegetarian"], customisations: ["No egg"] }),
    d({ id: "d7", merchantId: "m4", name: "Beef Curry with Rice", price: 9.5, image: "🍛", description: "Slow-simmered beef curry, potatoes, steamed rice.", category: "Rice", calories: 630, spicy: true, dietary: ["spicy"], style: "wet", customisations: ["Less spicy"] }),
    d({ id: "d8", merchantId: "m4", name: "Chicken Briyani", price: 9.0, image: "🍛", description: "Fragrant spiced rice, roasted chicken leg, raita.", category: "Rice", calories: 600, style: "dry" }),
    d({ id: "d14", merchantId: "m4", name: "Dhal Curry & Roti", price: 6.0, image: "🫓", description: "Lentil curry with two flaky roti canai.", category: "Rice", calories: 520, style: "wet", dietary: ["vegetarian", "plant_based"] }),
    d({ id: "d9", merchantId: "m5", name: "Brown Sugar Boba Milk", price: 6.5, image: "🧋", description: "Fresh milk, chewy boba, brown sugar syrup.", category: "Drinks", calories: 320, customisations: ["Less sweet", "No ice", "Extra boba"] }),
    d({ id: "d10", merchantId: "m5", name: "Iced Lemon Tea", price: 3.5, image: "🍹", description: "Classic housemade lemon tea, not too sweet.", category: "Drinks", calories: 110, dietary: ["vegetarian", "plant_based", "allergy_free"], customisations: ["Less sweet", "No ice"] }),
    d({ id: "d15", merchantId: "m5", name: "Matcha Oat Latte", price: 7.5, image: "🍵", description: "Ceremonial matcha with oat milk.", category: "Drinks", calories: 190, dietary: ["vegetarian", "plant_based"], customisations: ["Less sweet"] }),
  ];
  dishes.forEach((x) => db.dishes.set(x.id, x));

  db.vouchers.push(
    { id: "v1", title: "RM3 off", description: "Any order above RM15", amount: 3, kind: "fixed", minSpend: 15, claimed: 0, costSpent: 0, active: true },
    { id: "v2", title: "Free Iced Lemon Tea", description: "With any rice dish", amount: 3.5, kind: "fixed", minSpend: 0, requireCategory: "Rice", claimed: 0, costSpent: 0, active: true },
    { id: "v3", title: "RM5 off", description: "Any order above RM25", amount: 5, kind: "fixed", minSpend: 25, claimed: 0, costSpent: 0, active: true },
  );

  db.vouchers.push(
    { id: "v4", title: "WELCOME10", description: "10% off, min spend RM10 at Ah Seng Noodle House", amount: 10, kind: "percent", minSpend: 10, merchantId: "m1", totalLimit: 100, claimed: 14, costSpent: 21.6, active: true },
    { id: "v5", title: "LUNCH2", description: "RM2 off, min spend RM12 at Ah Seng Noodle House", amount: 2, kind: "fixed", minSpend: 12, merchantId: "m1", totalLimit: 50, claimed: 9, costSpent: 18, active: true },
  );

  const users: User[] = [
    { id: "u_demo", role: "customer", email: "demo@scootmeal.test", name: "Demo Student", phone: "+60 12-345 6789", dob: "2000-01-01", passwordHash: hashPassword("demo123") },
    { id: "u_merchant", role: "merchant", email: "ahseng@scootmeal.test", name: "Ah Seng", phone: "+60 12-300 0001", passwordHash: hashPassword("merchant123"), merchantId: "m1" },
    { id: "u_admin", role: "admin", email: "admin@scootmeal.test", name: "Platform Admin", passwordHash: hashPassword("admin123") },
  ];
  users.forEach((u) => db.users.set(u.id, u));
  db.merchants.get("m1")!.ownerUserId = "u_merchant";

  const now = Date.now();
  const jobs: Job[] = [
    { id: "j1", merchantId: "m1", merchantName: "Ah Seng Noodle House", title: "Part-time kitchen helper", type: "Part-time", pay: "RM9/hr", description: "Lunch rush, 11am-2pm, Mon-Fri.", postedAt: now - 86400000, open: true },
    { id: "j2", merchantId: "m5", merchantName: "Boba & Brew", title: "Weekend barista", type: "Weekend", pay: "RM11/hr", description: "Sat-Sun, training provided.", postedAt: now - 2 * 86400000, open: true },
    { id: "j3", merchantId: "m2", merchantName: "Nasi Kak Yah", title: "Cashier", type: "Part-time", pay: "RM9.50/hr", description: "Evening shift, 5pm-9pm.", postedAt: now - 3 * 86400000, open: true },
  ];
  jobs.forEach((j) => db.jobs.set(j.id, j));

  seedHistory();
}

// Past completed orders for Ah Seng (m1) so analytics and History look real from the first launch.
// They belong to made-up customers and are all older than today, so "orders today" starts at 0.
function seedHistory() {
  const names = ["Aisyah", "Jun Hao", "Priya", "Daniel", "Siti", "Marcus", "Hana", "Kelvin"];
  const dish = (id: string) => db.dishes.get(id)!;
  const menu = ["d1", "d2", "d11"];
  const modes = ["dine_in", "takeaway", "delivery"] as const;
  const DAY = 86400000;
  let n = 0;
  for (let day = 1; day <= 27; day++) {
    const count = 1 + ((day * 7) % 4); // 1..4 orders per day, deterministic
    for (let k = 0; k < count; k++) {
      n++;
      const a = dish(menu[(day + k) % 3]!), b = dish(menu[(day + k + 1) % 3]!);
      const mode = modes[(day + k) % 3]!;
      const qtyA = 1 + ((day + k) % 2);
      const items = [
        { id: `hi${n}a`, dishId: a.id, name: a.name, price: a.price, qty: qtyA, mode, options: [] as string[], status: (mode === "delivery" ? "delivered" : "collected") as "delivered" | "collected" },
        ...(k % 2 === 0 ? [{ id: `hi${n}b`, dishId: b.id, name: b.name, price: b.price, qty: 1, mode, options: [] as string[], status: (mode === "delivery" ? "delivered" : "collected") as "delivered" | "collected" }] : []),
      ];
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const fee = mode === "delivery" ? 3.5 : 0;
      const at = Date.now() - day * DAY - (3 + k * 2) * 3600000 + 12 * 60000;
      const id = `SM-H${String(n).padStart(3, "0")}`;
      db.orders.set(id, {
        id, customerId: "u_seed", customerName: names[n % names.length]!, merchantId: "m1", merchantName: "Ah Seng Noodle House",
        items, subtotal, deliveryFee: fee, discount: 0, total: subtotal + fee, refunded: 0, paymentId: `pay_${id}`,
        status: "completed", respondBy: at + 600000, createdAt: at, acceptedAt: at + 60000, completedAt: at + 25 * 60000, reviewedDishIds: [],
      });
    }
  }
}

resetDb();
