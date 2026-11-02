// The working data set. Every module reads and writes through `db` (plain Maps and arrays, so the business rules stay
// simple and fast). `store/persistence/` copies `db` to PostgreSQL / Supabase and loads it back at start-up.
// Demo data lives in `store/seed.ts`.
import type {
  Address, Announcement, AuditEntry, Call, ChatMessage, Delivery, Dish, Favourites, Job, JobApplication, Merchant, Notification, Order, Payment, Reservation, Review, User, Voucher,
} from "./types.js";

export interface Db {
  users: Map<string, User>;
  tokens: Map<string, string>; // login token -> userId
  tokenExpiry: Map<string, number>; // login token -> expiry (epoch ms)
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
  messages: ChatMessage[];
  calls: Map<string, Call>;
  audit: AuditEntry[];
  addresses: Map<string, Address>;
  favourites: Map<string, Favourites>; // userId -> saved dishes and shops
  applications: Map<string, JobApplication>;
  announcements: Map<string, Announcement>;
}

export const db: Db = {
  users: new Map(), tokens: new Map(), tokenExpiry: new Map(), merchants: new Map(), dishes: new Map(), orders: new Map(),
  payments: new Map(), reservations: new Map(), vouchers: [], notifications: new Map(),
  deliveries: new Map(), jobs: new Map(), reviews: [], messages: [], calls: new Map(), audit: [],
  addresses: new Map(), favourites: new Map(), applications: new Map(), announcements: new Map(),
};

/** Empties every collection (used before re-seeding and by the persistence loader). */
export function clearDb() {
  for (const v of Object.values(db) as unknown[]) {
    if (v instanceof Map) v.clear();
    else if (Array.isArray(v)) v.length = 0;
  }
}

export const CAMPUS = { lat: 1.5533, lng: 110.3592 };

export const RIDERS = [
  { id: "r1", name: "Wei Ming", lat: 1.5533, lng: 110.3592 },
  { id: "r2", name: "Farah", lat: 1.5522, lng: 110.3578 },
  { id: "r3", name: "Aiman", lat: 1.5548, lng: 110.3605 },
];
