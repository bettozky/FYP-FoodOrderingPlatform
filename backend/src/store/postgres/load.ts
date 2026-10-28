// Reads the merchant-side tables into the in-memory store at startup.
// Database ids (BIGINT) become strings, so "12" is merchant 12, dish 12, etc.
import { env } from "../../config/env.js";
import type { Db } from "../db.js";
import type { Dish, Job, Merchant, MerchantApproval, Role, StoreMode, User, Voucher } from "../types.js";
import { query } from "./pool.js";

const CAMPUS = { lat: 1.5533, lng: 110.3592 };
const VENUE_CATEGORIES = ["Trending", "Buffet", "Luxury", "Aesthetic Cafe"] as const;

export async function loadFromPostgres(db: Db) {
  const tz = env.timeZone;

  const users = await query(`
    SELECT u.user_id::text AS id, lower(u.role::text) AS role, lower(u.email) AS email, u.name, u.phone,
           u.date_of_birth AS dob, u.password_hash,
           (SELECT merchant_id::text FROM merchant WHERE owner_user_id = u.user_id ORDER BY merchant_id LIMIT 1) AS merchant_id
      FROM users u ORDER BY u.user_id`);
  for (const r of users.rows) {
    const u: User = {
      id: r.id, role: r.role as Role, email: r.email, name: r.name, phone: r.phone ?? undefined, dob: r.dob ?? undefined,
      passwordHash: r.password_hash, merchantId: r.merchant_id ?? undefined,
    };
    db.users.set(u.id, u);
  }

  // One venue per merchant for now; hours are today's row (or the first one if closed today).
  const merchants = await query(`
    SELECT m.merchant_id::text AS id, m.owner_user_id::text AS owner_id, m.name, lower(m.approval_status::text) AS approval,
           m.phone, m.cuisine, m.color, m.prep_minutes, m.store_mode, m.application,
           v.address, v.category, v.lat, v.lng,
           to_char(h.open_time, 'HH24:MI') AS open, to_char(h.close_time, 'HH24:MI') AS close,
           (SELECT avg(r.rating) FROM review r
              JOIN order_item oi ON oi.order_item_id = r.order_item_id
              JOIN dish d ON d.dish_id = oi.dish_id
             WHERE d.merchant_id = m.merchant_id) AS rating
      FROM merchant m
      LEFT JOIN LATERAL (SELECT * FROM venue WHERE merchant_id = m.merchant_id ORDER BY venue_id LIMIT 1) v ON TRUE
      LEFT JOIN LATERAL (
        SELECT open_time, close_time FROM operating_hours
         WHERE venue_id = v.venue_id
         ORDER BY (day_of_week = EXTRACT(DOW FROM now() AT TIME ZONE $1)) DESC, day_of_week
         LIMIT 1) h ON TRUE
     ORDER BY m.merchant_id`, [tz]);
  for (const r of merchants.rows) {
    const m: Merchant = {
      id: r.id, name: r.name, stallNo: r.address ?? "TBC",
      rating: r.rating === null ? 0 : Math.round(r.rating * 10) / 10,
      lat: r.lat ?? CAMPUS.lat, lng: r.lng ?? CAMPUS.lng, prepMinutes: r.prep_minutes,
      tags: String(r.cuisine).split(",").map((s) => s.trim()).filter(Boolean),
      color: r.color, hours: { open: r.open ?? "00:00", close: r.close ?? "23:59" },
      approval: r.approval as MerchantApproval, storeMode: r.store_mode as StoreMode,
      venueCategory: VENUE_CATEGORIES.find((c) => c === r.category), phone: r.phone, ownerUserId: r.owner_id,
      application: r.application ?? undefined,
    };
    db.merchants.set(m.id, m);
  }

  const dishes = await query(`
    SELECT d.dish_id::text AS id, d.merchant_id::text AS merchant_id, d.name, d.price, d.image, d.image_url, d.description,
           d.food_type, d.calories, d.is_available, d.style, d.customisations, d.cost, d.stock,
           COALESCE(array_agg(t.tag ORDER BY t.tag) FILTER (WHERE t.tag IS NOT NULL), '{}') AS tags
      FROM dish d LEFT JOIN dish_tag t ON t.dish_id = d.dish_id
     WHERE d.deleted_at IS NULL
     GROUP BY d.dish_id ORDER BY d.dish_id`);
  for (const r of dishes.rows) {
    const d: Dish = {
      id: r.id, merchantId: r.merchant_id, name: r.name, price: r.price, image: r.image, imageUrl: r.image_url ?? undefined, description: r.description,
      category: r.food_type ?? "Mains", calories: r.calories, soldOut: !r.is_available,
      spicy: r.tags.includes("spicy"), dietary: r.tags, style: r.style ?? undefined,
      customisations: r.customisations, cost: r.cost, stock: r.stock ?? undefined,
    };
    db.dishes.set(d.id, d);
  }

  const vouchers = await query(`
    SELECT v.voucher_id::text AS id, v.merchant_id::text AS merchant_id, v.code, v.description,
           lower(v.discount_type::text) AS kind, v.discount_value, v.min_spend, v.usage_limit, v.require_category, v.active,
           to_char(v.expiry AT TIME ZONE $1, 'YYYY-MM-DD') AS expiry_date,
           (SELECT count(*)::int FROM voucher_redemption r WHERE r.voucher_id = v.voucher_id) AS claimed
      FROM voucher v ORDER BY v.voucher_id`, [tz]);
  for (const r of vouchers.rows) {
    const v: Voucher = {
      id: r.id, title: r.code, description: r.description, amount: r.discount_value, kind: r.kind,
      minSpend: r.min_spend, requireCategory: r.require_category ?? undefined, merchantId: r.merchant_id,
      totalLimit: r.usage_limit ?? undefined, claimed: r.claimed, costSpent: 0,
      expiryDate: r.expiry_date ?? undefined, active: r.active,
    };
    db.vouchers.push(v);
  }

  const jobs = await query(`
    SELECT j.job_id::text AS id, j.merchant_id::text AS merchant_id, m.name AS merchant_name, j.title, j.role, j.type,
           j.pay, j.openings, j.description, j.perks, j.is_open, j.applicants, j.posted_at
      FROM job j JOIN merchant m ON m.merchant_id = j.merchant_id ORDER BY j.job_id`);
  for (const r of jobs.rows) {
    const j: Job = {
      id: r.id, merchantId: r.merchant_id, merchantName: r.merchant_name, title: r.title, type: r.type, pay: r.pay,
      description: r.description, postedAt: (r.posted_at as Date).getTime(), open: r.is_open,
      role: r.role, openings: r.openings, perks: r.perks || undefined, applicants: r.applicants,
    };
    db.jobs.set(j.id, j);
  }
}
