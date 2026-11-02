-- ScootMeal database schema (PostgreSQL / Supabase).
--
-- How it is organised: one table per kind of thing (users, merchants, dishes, orders ...).
-- Each row has the columns you filter and join on in SQL (ids, status, owner, dates) plus a `data` JSONB column holding
-- the full record exactly as the API returns it. The backend keeps the live data in memory and saves every change here
-- (see src/store/persistence), so you can browse and edit all data in the Supabase Table Editor or query it with SQL.
--
-- There are no foreign keys on purpose: the backend writes tables in batches in any order. The *_id columns are plain
-- references you can join on.

CREATE TABLE IF NOT EXISTS users (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL,                 -- customer | merchant | admin
  data       JSONB NOT NULL,                -- name, phone, dob, passwordHash, merchantId, suspended ...
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,              -- the login token
  user_id    TEXT NOT NULL,
  expires_at BIGINT NOT NULL,               -- epoch milliseconds
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS merchants (
  seq           BIGSERIAL,
  id            TEXT PRIMARY KEY,
  owner_user_id TEXT,
  approval      TEXT NOT NULL,              -- pending | approved | rejected | suspended
  data          JSONB NOT NULL,             -- name, stall, hours, tags, location, sign-up application ...
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dishes (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  data        JSONB NOT NULL,               -- name, price, category, stock, soldOut, imageUrl ...
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dishes_merchant_idx ON dishes (merchant_id);

CREATE TABLE IF NOT EXISTS orders (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,             -- SM-10251 ...
  customer_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  status      TEXT NOT NULL,
  created_at  BIGINT NOT NULL,              -- epoch milliseconds
  data        JSONB NOT NULL,               -- items, totals, refund, deadlines (respondBy / payBy) ...
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_merchant_idx ON orders (merchant_id, status);

CREATE TABLE IF NOT EXISTS payments (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  order_id   TEXT,                          -- order or reservation the payment belongs to
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);

CREATE TABLE IF NOT EXISTS reservations (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,             -- RS-5001 ...
  customer_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  status      TEXT NOT NULL,
  created_at  BIGINT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservations_customer_idx ON reservations (customer_id);
CREATE INDEX IF NOT EXISTS reservations_merchant_idx ON reservations (merchant_id, status);

CREATE TABLE IF NOT EXISTS vouchers (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,
  merchant_id TEXT,                         -- null = platform voucher
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS deliveries (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,              -- same as the order id
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  dish_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_dish_idx ON reviews (dish_id);

CREATE TABLE IF NOT EXISTS messages (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL,                 -- order or reservation id
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages (thread_id);

CREATE TABLE IF NOT EXISTS calls (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,                -- admin, action, target, detail, at
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON addresses (user_id);

CREATE TABLE IF NOT EXISTS favourites (
  seq        BIGSERIAL,
  id         TEXT PRIMARY KEY,              -- the customer's user id
  data       JSONB NOT NULL,                -- { dishes: [...], merchants: [...] }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The API server connects with the database owner role, which is not affected by row level security.
-- Turning RLS on (with no policies) means nobody can read these tables through Supabase's public REST/anon API,
-- so password hashes and orders are never exposed by accident. Use the backend API or the Supabase dashboard instead.
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites    ENABLE ROW LEVEL SECURITY;
