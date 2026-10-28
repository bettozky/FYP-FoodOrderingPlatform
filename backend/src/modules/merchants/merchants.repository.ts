// PostgreSQL writes for merchant data (shop settings, menu, vouchers, jobs).
// Routes write here first, then update the in-memory copy in store/db.ts.
// Without DATABASE_URL every function is a no-op (or just makes an id).
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http.js";
import { uid } from "../../lib/ids.js";
import { isUniqueViolation, query, usingPostgres, withTransaction, type Queryable } from "../../store/postgres/pool.js";
import type { Dish, Job, Merchant, MerchantApproval, Voucher } from "../../store/types.js";

export type DishFields = Omit<Dish, "id" | "merchantId">;
export type HoursRow = { day: number; open: string; close: string }; // day 0 = Sunday

const firstVenue = async (c: Queryable, merchantId: string): Promise<string | undefined> =>
  (await c.query("SELECT venue_id FROM venue WHERE merchant_id = $1 ORDER BY venue_id LIMIT 1", [merchantId])).rows[0]?.venue_id;

export async function insertHours(c: Queryable, venueId: string, rows: HoursRow[]) {
  for (const h of rows) {
    await c.query("INSERT INTO operating_hours (venue_id, day_of_week, open_time, close_time) VALUES ($1, $2, $3, $4)", [venueId, h.day, h.open, h.close]);
  }
}

export const everyDay = (hours: { open: string; close: string }): HoursRow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, ...hours }));

// ---------- shop ----------

export async function saveStoreSettings(m: Merchant) {
  if (!usingPostgres) return;
  await withTransaction(async (c) => {
    await c.query("UPDATE merchant SET store_mode = $2, prep_minutes = $3 WHERE merchant_id = $1", [m.id, m.storeMode, m.prepMinutes]);
    await c.query("UPDATE venue SET is_accepting_orders = $2 WHERE merchant_id = $1", [m.id, m.storeMode !== "offline"]);
  });
}

/** The dashboard edits one open/close pair, so it applies to every day the shop already opens. */
export async function saveHours(merchantId: string, hours: { open: string; close: string }) {
  if (!usingPostgres) return;
  await withTransaction(async (c) => {
    const venueId = await firstVenue(c, merchantId);
    if (!venueId) return;
    const upd = await c.query("UPDATE operating_hours SET open_time = $2, close_time = $3 WHERE venue_id = $1", [venueId, hours.open, hours.close]);
    if (!upd.rowCount) await insertHours(c, venueId, everyDay(hours));
  });
}

/** The sign-up answers (merchant.application), e.g. after a file from the sign-up is uploaded. */
export async function saveApplication(merchantId: string, application: Record<string, any>) {
  if (!usingPostgres) return;
  await query("UPDATE merchant SET application = $2 WHERE merchant_id = $1", [merchantId, application]);
}

export async function setMerchantApproval(merchantId: string, approval: MerchantApproval) {
  if (!usingPostgres) return;
  await query("UPDATE merchant SET approval_status = $2 WHERE merchant_id = $1", [merchantId, approval.toUpperCase()]);
}

// ---------- dishes ----------

async function writeTags(c: Queryable, dishId: string, tags: string[]) {
  await c.query("DELETE FROM dish_tag WHERE dish_id = $1", [dishId]);
  for (const t of new Set(tags)) await c.query("INSERT INTO dish_tag (dish_id, tag) VALUES ($1, $2)", [dishId, t]);
}

const dishValues = (d: DishFields) =>
  [d.name, d.category, d.price, d.cost ?? 0, d.image, d.calories, d.style ?? null, d.description, d.customisations, d.stock ?? null, !d.soldOut, d.imageUrl ?? null];

/** Pass a client to run inside an existing transaction (shop sign-up). */
export async function insertDish(merchantId: string, d: DishFields, client?: Queryable): Promise<string> {
  if (!usingPostgres) return uid("d");
  const run = async (c: Queryable) => {
    const { rows } = await c.query(
      `INSERT INTO dish (merchant_id, name, food_type, price, cost, image, calories, style, description, customisations, stock, is_available, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING dish_id::text AS id`,
      [merchantId, ...dishValues(d)]
    );
    await writeTags(c, rows[0].id, d.dietary);
    return rows[0].id as string;
  };
  return client ? run(client) : withTransaction(run);
}

export async function saveDish(d: Dish) {
  if (!usingPostgres) return;
  await withTransaction(async (c) => {
    await c.query(
      `UPDATE dish SET name = $2, food_type = $3, price = $4, cost = $5, image = $6, calories = $7, style = $8,
              description = $9, customisations = $10, stock = $11, is_available = $12, image_url = $13
        WHERE dish_id = $1`,
      [d.id, ...dishValues(d)]
    );
    await writeTags(c, d.id, d.dietary);
  });
}

/** For code that changes a dish outside a request (stock after payment, out of stock): log failures, don't block. */
export function saveDishInBackground(d: Dish) {
  saveDish(d).catch((e) => console.error(`Database: could not save dish ${d.id}:`, e.message));
}

/** Soft delete, so past orders that reference the dish keep working. */
export async function deleteDish(id: string) {
  if (!usingPostgres) return;
  await query("UPDATE dish SET deleted_at = now() WHERE dish_id = $1", [id]);
}

export async function setCategorySoldOut(merchantId: string, category: string, soldOut: boolean) {
  if (!usingPostgres) return;
  await query("UPDATE dish SET is_available = $3 WHERE merchant_id = $1 AND food_type = $2 AND deleted_at IS NULL", [merchantId, category, !soldOut]);
}

// ---------- vouchers ----------

export async function insertVoucher(v: Omit<Voucher, "id">): Promise<string> {
  if (!usingPostgres) return uid("v");
  try {
    const { rows } = await query(
      `INSERT INTO voucher (merchant_id, code, discount_type, discount_value, min_spend, usage_limit, expiry, description, require_category, active)
       VALUES ($1, $2, $3, $4, $5, $6, ($7::date + time '23:59:59') AT TIME ZONE $8, $9, $10, $11)
       RETURNING voucher_id::text AS id`,
      [v.merchantId, v.title, v.kind.toUpperCase(), v.amount, v.minSpend, v.totalLimit ?? null, v.expiryDate ?? null, env.timeZone,
        v.description, v.requireCategory ?? null, v.active]
    );
    return rows[0].id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "That voucher code is already used");
    throw e;
  }
}

export async function setVoucherActive(id: string, active: boolean) {
  if (!usingPostgres) return;
  await query("UPDATE voucher SET active = $2 WHERE voucher_id = $1", [id, active]);
}

export async function deleteVoucher(id: string) {
  if (!usingPostgres) return;
  await query("DELETE FROM voucher WHERE voucher_id = $1", [id]);
}

// ---------- jobs ----------

const jobValues = (j: Omit<Job, "id">) =>
  [j.title, j.role ?? "Staff", j.type, j.pay, j.openings ?? 1, j.description, j.perks ?? "", j.open];

export async function insertJob(j: Omit<Job, "id">): Promise<string> {
  if (!usingPostgres) return uid("j");
  const { rows } = await query(
    `INSERT INTO job (merchant_id, title, role, type, pay, openings, description, perks, is_open, posted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0)) RETURNING job_id::text AS id`,
    [j.merchantId, ...jobValues(j), j.postedAt]
  );
  return rows[0].id;
}

export async function saveJob(j: Job) {
  if (!usingPostgres) return;
  await query(
    `UPDATE job SET title = $2, role = $3, type = $4, pay = $5, openings = $6, description = $7, perks = $8, is_open = $9
      WHERE job_id = $1`,
    [j.id, ...jobValues(j)]
  );
}

export async function deleteJob(id: string) {
  if (!usingPostgres) return;
  await query("DELETE FROM job WHERE job_id = $1", [id]);
}
