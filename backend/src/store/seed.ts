// Demo data: shops, dishes, vouchers, users, jobs and a month of order history so analytics and the admin pages look real.
// Used when the database is empty (or in memory mode). Nothing here runs against a real, populated database.
import { hashPassword } from "../lib/ids.js";
import { db } from "./db.js";
import type { Job, Merchant, Dish, User } from "./types.js";

function m(x: Partial<Merchant> & Pick<Merchant, "id" | "name" | "stallNo" | "rating" | "lat" | "lng" | "prepMinutes" | "tags" | "color" | "phone">): Merchant {
  return { hours: { open: "00:00", close: "23:59" }, approval: "approved", storeMode: "online", ...x };
}
function d(x: Partial<Dish> & Pick<Dish, "id" | "merchantId" | "name" | "price" | "image" | "description" | "category" | "calories">): Dish {
  return { soldOut: false, dietary: [], customisations: [], cost: Math.round(x.price * 0.4 * 100) / 100, ...x };
}

/** Fills the (empty) store with the demo shops, dishes, users and a month of order history. */
export function seedDemoData() {

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
    d({ id: "d1", merchantId: "m1", name: "Beef Noodle Soup", price: 8.5, image: "/media/dishes/d1.jpg", description: "Slow-braised beef brisket, flat rice noodles, house broth.", category: "Noodles", calories: 520, style: "wet", customisations: ["No spring onion", "Extra noodles", "Less salt"] }),
    d({ id: "d2", merchantId: "m1", name: "Dry Wantan Mee", price: 7.0, image: "/media/dishes/d2.jpg", description: "Springy egg noodles tossed in dark sauce, char siu, wantan.", category: "Noodles", calories: 470, style: "dry", customisations: ["No chilli", "Extra char siu"] }),
    d({ id: "d11", merchantId: "m1", name: "Vegetable Noodle Soup", price: 6.5, image: "/media/dishes/d11.jpg", description: "Clear vegetable broth, rice noodles, tofu and greens.", category: "Noodles", calories: 340, style: "wet", dietary: ["vegetarian", "plant_based", "allergy_free"], customisations: ["No spring onion"] }),
    d({ id: "d3", merchantId: "m2", name: "Nasi Lemak Ayam Goreng", price: 7.5, image: "/media/dishes/d3.jpg", description: "Coconut rice, fried chicken, sambal, egg, peanuts.", category: "Rice", calories: 650, style: "dry", customisations: ["Extra sambal", "No peanuts", "No egg"] }),
    d({ id: "d4", merchantId: "m2", name: "Beef Rendang Rice", price: 9.0, image: "/media/dishes/d4.jpg", description: "Rich, slow-cooked beef rendang over steamed rice.", category: "Rice", calories: 610, spicy: true, dietary: ["spicy"], style: "dry", customisations: ["Less spicy", "Extra rendang"] }),
    d({ id: "d12", merchantId: "m2", name: "Nasi Lemak Sayur", price: 6.0, image: "/media/dishes/d12.jpg", description: "Coconut rice with sambal tempeh, vegetables and cucumber.", category: "Rice", calories: 480, style: "dry", dietary: ["vegetarian"], customisations: ["Extra sambal"] }),
    d({ id: "d5", merchantId: "m3", name: "Beef Hor Fun", price: 8.0, image: "/media/dishes/d5.jpg", description: "Wok-fried flat noodles with tender beef slices, egg gravy.", category: "Noodles", calories: 540, style: "wet" }),
    d({ id: "d6", merchantId: "m3", name: "Sweet & Sour Chicken", price: 8.5, image: "/media/dishes/d6.jpg", description: "Crispy chicken, pineapple, capsicum, tangy sauce.", category: "Rice", calories: 590, style: "dry", soldOut: true }),
    d({ id: "d13", merchantId: "m3", name: "Vegetable Fried Rice", price: 6.5, image: "/media/dishes/d13.jpg", description: "Wok-fried rice with seasonal vegetables and egg.", category: "Rice", calories: 450, style: "dry", dietary: ["vegetarian"], customisations: ["No egg"] }),
    d({ id: "d7", merchantId: "m4", name: "Beef Curry with Rice", price: 9.5, image: "/media/dishes/d7.jpg", description: "Slow-simmered beef curry, potatoes, steamed rice.", category: "Rice", calories: 630, spicy: true, dietary: ["spicy"], style: "wet", customisations: ["Less spicy"] }),
    d({ id: "d8", merchantId: "m4", name: "Chicken Briyani", price: 9.0, image: "/media/dishes/d8.jpg", description: "Fragrant spiced rice, roasted chicken leg, raita.", category: "Rice", calories: 600, style: "dry" }),
    d({ id: "d14", merchantId: "m4", name: "Dhal Curry & Roti", price: 6.0, image: "/media/dishes/d14.jpg", description: "Lentil curry with two flaky roti canai.", category: "Rice", calories: 520, style: "wet", dietary: ["vegetarian", "plant_based"] }),
    d({ id: "d9", merchantId: "m5", name: "Brown Sugar Boba Milk", price: 6.5, image: "/media/dishes/d9.jpg", description: "Fresh milk, chewy boba, brown sugar syrup.", category: "Drinks", calories: 320, customisations: ["Less sweet", "No ice", "Extra boba"] }),
    d({ id: "d10", merchantId: "m5", name: "Iced Lemon Tea", price: 3.5, image: "/media/dishes/d10.jpg", description: "Classic housemade lemon tea, not too sweet.", category: "Drinks", calories: 110, dietary: ["vegetarian", "plant_based", "allergy_free"], customisations: ["Less sweet", "No ice"] }),
    d({ id: "d15", merchantId: "m5", name: "Matcha Oat Latte", price: 7.5, image: "/media/dishes/d15.jpg", description: "Ceremonial matcha with oat milk.", category: "Drinks", calories: 190, dietary: ["vegetarian", "plant_based"], customisations: ["Less sweet"] }),
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

  seedCustomers();
  seedHistory();
  seedOtherShops();
  seedReservations();
  seedReviews();
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
      const at = slotTime(day, n + k);
      const id = `SM-H${String(n).padStart(3, "0")}`;
      const method = payMethodFor(n, mode === "delivery");
      db.orders.set(id, {
        id, customerId: seedUserId(names[n % names.length]!), customerName: names[n % names.length]!, merchantId: "m1", merchantName: "Ah Seng Noodle House",
        items, subtotal, deliveryFee: fee, discount: 0, total: subtotal + fee, refunded: 0, ...(method === "cash" ? {} : { paymentId: `pay_${id}` }),
        paymentMethod: method, paidAt: at + 3 * 60000, ...(method === "cash" ? { cashDue: 0, cashReceivedAt: at + 20 * 60000 } : {}),
        status: "completed", respondBy: at + 600000, createdAt: at, acceptedAt: at + 60000, completedAt: at + 25 * 60000, reviewedDishIds: [],
      });
      seedPayment(id, subtotal + fee, method, at);
    }
  }
}


// Made-up customers for the seeded orders, so the admin Customers page has people to show.
const SEED_NAMES = ["Aisyah", "Jun Hao", "Priya", "Daniel", "Siti", "Marcus", "Hana", "Kelvin", "Farah", "Wei Ming"];
const seedUserId = (name: string) => `u_seed_${name.toLowerCase().replace(/\s+/g, "")}`;
function seedCustomers() {
  const hash = hashPassword("demo123");
  SEED_NAMES.forEach((name, i) => {
    const id = seedUserId(name);
    db.users.set(id, { id, role: "customer", email: `${name.toLowerCase().replace(/\s+/g, "")}@scootmeal.test`, name, phone: `+60 12-400 ${String(1000 + i)}`, dob: "2001-05-1" + (i % 9), passwordHash: hash });
  });
}

// ---- demo data for the admin dashboard: the other shops, some missed orders, and customer reviews ----

// Realistic order times: spread over breakfast, lunch and dinner on the given day (0 = today, 1 = yesterday ...),
// independent of the time the server was started.
const SLOT_HOURS = [8, 11, 12, 12, 13, 13, 14, 15, 17, 18, 19, 20];
function slotTime(daysAgo: number, salt: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() - daysAgo * 86400000 + SLOT_HOURS[(salt * 7) % SLOT_HOURS.length]! * 3600000 + ((salt * 13) % 50) * 60000;
}

function payMethodFor(n: number, delivery: boolean): "card" | "fpx" | "cash" {
  const r = n % 5; // deterministic mix: ~40% card, ~35% FPX, ~25% cash (cash never for delivery)
  if (r <= 1) return "card";
  if (r <= 3) return "fpx";
  return delivery ? "card" : "cash";
}

function seedPayment(orderId: string, amount: number, method: "card" | "fpx" | "cash", at: number) {
  if (method === "cash") return;
  db.payments.set(`pay_${orderId}`, {
    id: `pay_${orderId}`, method, ref: `${method}_seed_${orderId}`, amount, refunded: 0, status: "succeeded", refunds: [], createdAt: at + 3 * 60000, for: orderId,
  });
}

function seedOtherShops() {
  const names = ["Aisyah", "Jun Hao", "Priya", "Daniel", "Siti", "Marcus", "Hana", "Kelvin", "Farah", "Wei Ming"];
  const DAY = 86400000;
  // status pattern per shop; Golden Wok misses a lot of orders and confirms slowly, on purpose, so the watchlist has something to show
  const shops: { id: string; perDay: number; pattern: ("completed" | "expired" | "rejected")[]; delayMin: number }[] = [
    { id: "m2", perDay: 3, pattern: ["completed", "completed", "completed", "completed", "completed", "rejected"], delayMin: 2 },
    { id: "m3", perDay: 2, pattern: ["completed", "expired", "completed", "expired", "rejected", "completed", "expired"], delayMin: 7 },
    { id: "m4", perDay: 2, pattern: ["completed", "completed", "completed", "expired", "completed"], delayMin: 3 },
    { id: "m5", perDay: 4, pattern: ["completed", "completed", "completed", "completed", "completed", "completed"], delayMin: 1 },
  ];
  let n = 1000;
  for (const sh of shops) {
    const m = db.merchants.get(sh.id)!;
    const dishes = [...db.dishes.values()].filter((x) => x.merchantId === sh.id);
    for (let day = 1; day <= 14; day++) {
      const count = Math.max(1, sh.perDay + ((day * 5 + n) % 3) - 1);
      for (let k = 0; k < count; k++) {
        n++;
        const status = sh.pattern[(day + k + n) % sh.pattern.length]!;
        const a = dishes[(day + k) % dishes.length]!;
        const mode = (["dine_in", "takeaway", "delivery"] as const)[(day + k + n) % 3]!;
        const qty = 1 + ((day + k) % 2);
        const subtotal = a.price * qty;
        const fee = mode === "delivery" ? 3.5 : 0;
        const total = subtotal + fee;
        const at = slotTime(day, n + k);
        const id = `SM-H${n}`;
        const done = status === "completed";
        const method = payMethodFor(n, mode === "delivery");
        const itemStatus = done ? (mode === "delivery" ? "delivered" : "collected") : "cancelled";
        db.orders.set(id, {
          id, customerId: seedUserId(names[n % names.length]!), customerName: names[n % names.length]!, merchantId: sh.id, merchantName: m.name,
          items: [{ id: `hi${n}`, dishId: a.id, name: a.name, price: a.price, qty, mode, options: [], status: itemStatus as "delivered" | "collected" | "cancelled" }],
          subtotal, deliveryFee: fee, discount: 0, total, refunded: 0,
          status, respondBy: at + 600000, createdAt: at, reviewedDishIds: [],
          ...(status === "expired" ? { cancelReason: "no_reply" as const } : {}),
          ...(done
            ? {
                acceptedAt: at + sh.delayMin * 60000 + ((n % 3) * 20000), paidAt: at + (sh.delayMin + 2) * 60000, completedAt: at + (sh.delayMin + 22) * 60000,
                paymentMethod: method, ...(method === "cash" ? { cashDue: 0, cashReceivedAt: at + 30 * 60000 } : { paymentId: `pay_${id}` }),
              }
            : {}),
        });
        if (done) seedPayment(id, total, method, at);
      }
    }
  }
}


function seedReservations() {
  const DAY = 86400000;
  const day = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
  const rows: [string, string, number, string, string, "confirmed" | "completed" | "declined" | "awaiting_restaurant", string?][] = [
    ["m2", "Siti", -2, "13:00", "4", "completed", "T2"],
    ["m4", "Priya", -1, "19:00", "2", "completed", "T1"],
    ["m2", "Daniel", 1, "12:30", "6", "confirmed", "T3"],
    ["m3", "Marcus", 2, "18:30", "3", "declined"],
  ];
  rows.forEach(([mid, who, off, time, party, status, table], i) => {
    const m = db.merchants.get(mid)!;
    const at = Date.now() - (3 - i) * DAY;
    db.reservations.set(`RS-H${i + 1}`, {
      id: `RS-H${i + 1}`, customerId: seedUserId(who), customerName: who, customerPhone: "+60 12-400 1000", merchantId: mid, merchantName: m.name,
      date: day(off), time, partySize: Number(party), preorder: [], payNow: false, paid: 0, refunded: 0, status,
      ...(table ? { allocatedTable: table } : {}), respondBy: at + 600000, createdAt: at,
    });
  });
}

function seedReviews() {
  const DAY = 86400000;
  const now = Date.now();
  const names = ["Aisyah", "Jun Hao", "Priya", "Daniel", "Siti", "Marcus", "Hana", "Kelvin", "Farah", "Wei Ming"];
  // [dishId, rating, comment, daysAgo, flagReason?]
  const rows: [string, number, string, number, string?][] = [
    ["d1", 5, "Broth is so rich, my usual order.", 1], ["d1", 4, "Good beef, a bit salty.", 3], ["d2", 5, "Best wantan mee on campus.", 4],
    ["d11", 4, "Nice veggie option.", 6], ["d1", 5, "Fast and hot.", 8], ["d2", 4, "Good portion.", 10], ["d1", 2, "Soup was too salty and lukewarm today.", 2], ["d11", 5, "Light and tasty.", 12],
    ["d3", 5, "Sambal is perfect.", 1], ["d4", 5, "Rendang melts in your mouth.", 2], ["d3", 5, "Always consistent.", 5], ["d12", 4, "Good vegetarian lemak.", 7], ["d4", 5, "Worth every ringgit.", 9], ["d3", 4, "Sometimes a long queue.", 11],
    ["d5", 3, "Okay but the hor fun was oily.", 1], ["d6", 2, "Waited 25 minutes, food arrived cold.", 2], ["d5", 3, "Average. Portion is small for the price.", 3], ["d13", 2, "Fried rice was bland.", 5],
    ["d6", 3, "Tasty but they cancelled my first order.", 6], ["d5", 2, "Ordered twice, they never replied the first time.", 8], ["d13", 4, "Better than last time.", 12],
    ["d6", 1, "This place is a scam, the cooks are idiots!", 1, "Possible abusive language"], ["d5", 1, "Cheaper and better at www.cheapeats.example", 4, "Contains a link"],
    ["d7", 4, "Curry has a good kick.", 2], ["d8", 4, "Briyani was fragrant.", 4], ["d14", 3, "Roti was a little dry.", 7], ["d7", 5, "Great value.", 9], ["d8", 4, "Nice, will order again.", 13],
    ["d9", 5, "Boba is chewy and fresh.", 1], ["d10", 5, "Perfect on a hot day.", 2], ["d15", 4, "Matcha is strong, I like it.", 3], ["d9", 5, "My go-to drink.", 5], ["d10", 4, "Refreshing.", 8], ["d15", 5, "Oat latte is great.", 10],
  ];
  const orders = [...db.orders.values()];
  rows.forEach(([dishId, rating, comment, daysAgo, flagReason], i) => {
    const mId = db.dishes.get(dishId)!.merchantId;
    const o = orders.find((x) => x.merchantId === mId && x.status === "completed");
    db.reviews.push({
      id: `r_seed${i + 1}`, orderId: o?.id ?? "SM-H001", dishId, userId: seedUserId(names[i % names.length]!), userName: names[i % names.length]!,
      rating, comment, createdAt: now - daysAgo * DAY - (i % 5) * 3600000, ...(flagReason ? { flagged: true, flagReason } : {}),
    });
  });
}

