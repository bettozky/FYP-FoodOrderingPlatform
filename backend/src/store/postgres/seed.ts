// Demo accounts and sample restaurants, created once (when demo@scootmeal.test does not exist yet).
//   customer  demo@scootmeal.test   / demo123
//   merchant  ahseng@scootmeal.test / merchant123
//   admin     admin@scootmeal.test  / admin123
//   npm run db:seed
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { withTransaction } from "./pool.js";

type SeedDish = { name: string; cat: string; price: number; cost: number; img: string; cal: number; style?: "dry" | "wet"; tags: string[]; desc: string; opts: string[] };
type SeedMerchant = {
  email: string; owner: string; name: string; phone: string; stall: string; cuisine: string; color: string; prep: number;
  open: string; close: string; lat: number; lng: number; mode: "online" | "dine_in"; pax: number; venueCat: string | null;
  dishes: SeedDish[];
  vouchers: { code: string; type: "FIXED" | "PERCENT"; value: number; min: number; limit: number; desc: string }[];
  jobs: { title: string; role: string; type: string; pay: string; openings: number; desc: string; perks: string }[];
};

const MERCHANTS: SeedMerchant[] = [
  {
    email: "ahseng@scootmeal.test", owner: "Ah Seng", name: "Ah Seng Kolo Mee", phone: "+60 12-345 6789",
    stall: "Canteen A, Stall 3", cuisine: "Noodles, Chinese", color: "#F3E4C4", prep: 12, open: "07:00", close: "23:30",
    lat: 1.5533, lng: 110.3592, mode: "online", pax: 10, venueCat: "Trending",
    dishes: [
      { name: "Kolo Mee", cat: "Noodles", price: 6.5, cost: 2.4, img: "🍜", cal: 520, style: "dry", tags: [], desc: "Springy egg noodles tossed in shallot oil, with char siu and minced pork.", opts: ["Extra char siu", "No spring onion", "Red (char siu sauce)"] },
      { name: "Kampua Mee", cat: "Noodles", price: 6.0, cost: 2.0, img: "🍜", cal: 480, style: "dry", tags: [], desc: "Foochow-style noodles with lard and fragrant shallots.", opts: ["Less oil", "Add egg"] },
      { name: "Sarawak Laksa", cat: "Noodles", price: 9.0, cost: 3.6, img: "🍲", cal: 610, style: "wet", tags: ["spicy"], desc: "Rice vermicelli in a spiced coconut broth with prawns, chicken and omelette strips.", opts: ["Extra prawns", "Less spicy"] },
      { name: "Teh C Peng", cat: "Drinks", price: 3.2, cost: 0.9, img: "🧋", cal: 180, tags: ["vegetarian"], desc: "Iced three-layer tea with evaporated milk.", opts: ["Less sugar"] },
    ],
    vouchers: [{ code: "SCOOT5", type: "FIXED", value: 5, min: 20, limit: 200, desc: "RM 5 off orders from RM 20 at Ah Seng Kolo Mee" }],
    jobs: [{ title: "Kitchen Helper", role: "Kitchen", type: "Part-Time", pay: "RM 9 / hour", openings: 2, desc: "Help prepare noodles and keep the kitchen clean during lunch rush.", perks: "Free meal every shift" }],
  },
  {
    email: "makcik@scootmeal.test", owner: "Mak Cik Zaitun", name: "Mak Cik Nasi Lemak", phone: "+60 13-222 1188",
    stall: "Canteen B, Stall 1", cuisine: "Rice, Malay", color: "#E7F0DC", prep: 10, open: "07:00", close: "22:00",
    lat: 1.5548, lng: 110.3605, mode: "online", pax: 12, venueCat: "Buffet",
    dishes: [
      { name: "Nasi Lemak Ayam Goreng", cat: "Rice", price: 8.5, cost: 3.2, img: "🍛", cal: 780, tags: ["spicy"], desc: "Coconut rice with fried chicken, sambal, egg, peanuts and anchovies.", opts: ["Extra sambal", "No anchovies"] },
      { name: "Nasi Goreng Kampung", cat: "Rice", price: 7.5, cost: 2.6, img: "🍳", cal: 650, tags: ["spicy"], desc: "Village-style fried rice with anchovies and kangkung, topped with a fried egg.", opts: ["Less spicy", "Add chicken"] },
      { name: "Mee Goreng Mamak", cat: "Noodles", price: 7.0, cost: 2.3, img: "🍝", cal: 600, style: "dry", tags: ["spicy"], desc: "Wok-fried yellow noodles with tofu, potato and egg.", opts: ["Less spicy"] },
      { name: "Roti Canai", cat: "Rice", price: 2.5, cost: 0.7, img: "🫓", cal: 300, tags: ["vegetarian"], desc: "Flaky flatbread with dhal curry.", opts: ["Add egg", "Extra curry"] },
    ],
    vouchers: [{ code: "NASI3", type: "FIXED", value: 3, min: 15, limit: 100, desc: "RM 3 off orders from RM 15 at Mak Cik Nasi Lemak" }],
    jobs: [],
  },
  {
    email: "tehtarik@scootmeal.test", owner: "Ravi", name: "Teh Tarik Corner", phone: "+60 16-888 2020",
    stall: "Library Café", cuisine: "Drinks", color: "#F6E3D3", prep: 5, open: "08:00", close: "02:00",
    lat: 1.5521, lng: 110.3571, mode: "online", pax: 5, venueCat: null,
    dishes: [
      { name: "Teh Tarik", cat: "Drinks", price: 2.8, cost: 0.8, img: "🍵", cal: 200, tags: ["vegetarian"], desc: "Pulled milk tea, frothy and sweet.", opts: ["Less sugar", "Iced"] },
      { name: "Kopi C Peng", cat: "Drinks", price: 3.0, cost: 0.8, img: "☕", cal: 150, tags: ["vegetarian"], desc: "Iced local coffee with evaporated milk.", opts: ["Less sugar"] },
      { name: "Milo Dinosaur", cat: "Drinks", price: 5.5, cost: 1.6, img: "🥤", cal: 420, tags: ["vegetarian"], desc: "Iced Milo topped with a mountain of Milo powder.", opts: [] },
      { name: "Fresh Lime Juice", cat: "Drinks", price: 3.5, cost: 0.9, img: "🍋", cal: 120, tags: ["vegetarian", "plant_based", "allergy_free"], desc: "Freshly squeezed limes with a hint of sour plum.", opts: ["No sour plum"] },
    ],
    vouchers: [{ code: "DRINK2", type: "FIXED", value: 2, min: 8, limit: 100, desc: "RM 2 off drinks from RM 8 at Teh Tarik Corner" }],
    jobs: [{ title: "Barista (Evening Shift)", role: "Front of House", type: "Part-Time", pay: "RM 10 / hour", openings: 1, desc: "Make teh tarik and coffee for the evening crowd, 6pm to midnight.", perks: "Flexible hours, free drinks" }],
  },
  {
    email: "greenbowl@scootmeal.test", owner: "Aisyah", name: "Green Bowl", phone: "+60 11-555 7788",
    stall: "Faculty Building, Level 1", cuisine: "Vegetarian, Healthy", color: "#DDEFE4", prep: 15, open: "10:00", close: "22:00",
    lat: 1.556, lng: 110.362, mode: "dine_in", pax: 15, venueCat: "Aesthetic Cafe",
    dishes: [
      { name: "Tofu Buddha Bowl", cat: "Rice", price: 11.9, cost: 4.5, img: "🥗", cal: 540, tags: ["vegetarian", "plant_based"], desc: "Brown rice, crispy tofu, roasted vegetables and peanut sauce.", opts: ["No peanut sauce"] },
      { name: "Mushroom Fried Rice", cat: "Rice", price: 9.9, cost: 3.4, img: "🍄", cal: 590, tags: ["vegetarian"], desc: "Fried rice with shiitake and king oyster mushrooms.", opts: ["Add egg"] },
      { name: "Veggie Wrap", cat: "Snacks", price: 8.5, cost: 2.9, img: "🌯", cal: 430, tags: ["vegetarian", "plant_based", "allergy_free"], desc: "Wholemeal wrap with hummus, salad and grilled vegetables.", opts: [] },
    ],
    vouchers: [],
    jobs: [{ title: "Service Crew", role: "Front of House", type: "Full-Time", pay: "RM 1,800 / month", openings: 1, desc: "Serve dine-in guests and manage table bookings.", perks: "EPF, staff meals" }],
  },
];

/** Returns true when the demo data was created, false when it already existed. */
export async function seed(): Promise<boolean> {
  return withTransaction(async (db) => {
    const exists = await db.query("SELECT 1 FROM users WHERE lower(email) = 'demo@scootmeal.test'");
    if (exists.rows[0]) return false;

    const addUser = async (name: string, email: string, password: string, role: string, phone: string | null = null, dob: string | null = null) => {
      const found = await db.query("SELECT user_id FROM users WHERE lower(email) = lower($1)", [email]);
      if (found.rows[0]) return found.rows[0].user_id;
      const { rows } = await db.query(
        "INSERT INTO users (name, email, password_hash, role, phone, date_of_birth) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id",
        [name, email, await bcrypt.hash(password, 10), role, phone, dob]
      );
      return rows[0].user_id;
    };

    await addUser("Demo Student", "demo@scootmeal.test", "demo123", "CUSTOMER", "+60 12-000 1234", "2003-05-14");
    await addUser("ScootMeal Admin", "admin@scootmeal.test", "admin123", "ADMIN");

    for (const s of MERCHANTS) {
      const owner = await addUser(s.owner, s.email, "merchant123", "MERCHANT", s.phone);
      const { rows: mr } = await db.query(
        `INSERT INTO merchant (owner_user_id, name, approval_status, phone, cuisine, color, prep_minutes, store_mode)
         VALUES ($1, $2, 'APPROVED', $3, $4, $5, $6, $7) RETURNING merchant_id`,
        [owner, s.name, s.phone, s.cuisine, s.color, s.prep, s.mode]
      );
      const merchantId = mr[0].merchant_id;
      const { rows: vr } = await db.query(
        `INSERT INTO venue (merchant_id, name, address, category, price_per_pax, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING venue_id`,
        [merchantId, s.name, s.stall, s.venueCat, s.pax, s.lat, s.lng]
      );
      for (let day = 0; day < 7; day++) {
        await db.query("INSERT INTO operating_hours (venue_id, day_of_week, open_time, close_time) VALUES ($1, $2, $3, $4)", [vr[0].venue_id, day, s.open, s.close]);
      }
      for (const d of s.dishes) {
        const { rows: dr } = await db.query(
          `INSERT INTO dish (merchant_id, name, food_type, price, cost, image, calories, style, description, customisations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING dish_id`,
          [merchantId, d.name, d.cat, d.price, d.cost, d.img, d.cal, d.style || null, d.desc, d.opts]
        );
        for (const t of d.tags) await db.query("INSERT INTO dish_tag (dish_id, tag) VALUES ($1, $2)", [dr[0].dish_id, t]);
      }
      for (const v of s.vouchers) {
        await db.query(
          `INSERT INTO voucher (merchant_id, code, discount_type, discount_value, min_spend, usage_limit, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING`,
          [merchantId, v.code, v.type, v.value, v.min, v.limit, v.desc]
        );
      }
      for (const j of s.jobs) {
        await db.query(
          `INSERT INTO job (merchant_id, title, role, type, pay, openings, description, perks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [merchantId, j.title, j.role, j.type, j.pay, j.openings, j.desc, j.perks]
        );
      }
    }
    return true;
  });
}

// Allow running directly: npm run db:seed
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed()
    .then((created) => { console.log(created ? "Demo data created" : "Demo data already exists"); process.exit(0); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
