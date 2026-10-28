// PostgreSQL writes for new accounts. Without DATABASE_URL these only make ids.
import { HttpError } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { isUniqueViolation, query, usingPostgres, withTransaction } from "../../store/postgres/pool.js";
import type { Merchant, User } from "../../store/types.js";
import { insertDish, insertHours, type DishFields, type HoursRow } from "../merchants/merchants.repository.js";

function emailTaken(e: unknown): never {
  if (isUniqueViolation(e)) throw new HttpError(409, "That email is already registered");
  throw e;
}

export async function insertCustomer(u: Omit<User, "id">): Promise<string> {
  if (!usingPostgres) return uid("u");
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, date_of_birth)
       VALUES ($1, $2, $3, 'CUSTOMER', $4, $5) RETURNING user_id::text AS id`,
      [u.name, u.email, u.passwordHash, u.phone ?? null, u.dob ?? null]
    );
    return rows[0].id;
  } catch (e) {
    return emailTaken(e);
  }
}

export type MerchantSignup = {
  user: Omit<User, "id" | "merchantId" | "role">;
  merchant: Omit<Merchant, "id" | "ownerUserId">;
  hours: HoursRow[];
  menu: DishFields[];
  application: unknown; // the full sign-up answers, kept for the admin
};

/** FR-5.1: owner account + PENDING merchant + venue + hours + starter menu, all or nothing. */
export async function insertMerchantSignup(s: MerchantSignup): Promise<{ userId: string; merchantId: string; dishIds: string[] }> {
  if (!usingPostgres) return { userId: uid("u"), merchantId: uid("m"), dishIds: s.menu.map(() => uid("d")) };
  const m = s.merchant;
  try {
    return await withTransaction(async (c) => {
      const { rows: ur } = await c.query(
        `INSERT INTO users (name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, 'MERCHANT', $4) RETURNING user_id::text AS id`,
        [s.user.name, s.user.email, s.user.passwordHash, s.user.phone ?? null]
      );
      const userId: string = ur[0].id;
      const { rows: mr } = await c.query(
        `INSERT INTO merchant (owner_user_id, name, approval_status, phone, cuisine, color, prep_minutes, store_mode, application)
         VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $7, $8) RETURNING merchant_id::text AS id`,
        [userId, m.name, m.phone, m.tags.join(", "), m.color, m.prepMinutes, m.storeMode, s.application ?? null]
      );
      const merchantId: string = mr[0].id;
      const { rows: vr } = await c.query(
        `INSERT INTO venue (merchant_id, name, address, category, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING venue_id::text AS id`,
        [merchantId, m.name, m.stallNo, m.venueCategory ?? null, m.lat, m.lng]
      );
      await insertHours(c, vr[0].id, s.hours);
      const dishIds: string[] = [];
      for (const d of s.menu) dishIds.push(await insertDish(merchantId, d, c));
      return { userId, merchantId, dishIds };
    });
  } catch (e) {
    return emailTaken(e);
  }
}
