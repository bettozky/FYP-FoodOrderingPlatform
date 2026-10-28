-- =====================================================================
-- Extra columns and tables needed by the ScootMeal customer and merchant
-- apps, added on top of the 15-table ERD schema (001_base_schema.sql).
-- Safe to run on a database that already has data.
-- =====================================================================

-- ---------- MERCHANT / VENUE ----------
ALTER TABLE merchant
  ADD COLUMN IF NOT EXISTS phone        TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cuisine      TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS color        TEXT        NOT NULL DEFAULT '#F3E4C4',
  ADD COLUMN IF NOT EXISTS prep_minutes INTEGER     NOT NULL DEFAULT 15 CHECK (prep_minutes > 0),
  ADD COLUMN IF NOT EXISTS store_mode   TEXT        NOT NULL DEFAULT 'online'
                                        CHECK (store_mode IN ('online', 'dine_in', 'offline')),
  ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now();

-- Campus coordinates by default (Swinburne Sarawak)
ALTER TABLE venue
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION NOT NULL DEFAULT 1.5533,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION NOT NULL DEFAULT 110.3592;

-- ---------- DISH ----------
-- dish.food_type is used as the menu category; dish_tag holds dietary labels
-- (vegetarian, plant_based, spicy, allergy_free).
ALTER TABLE dish
  ADD COLUMN IF NOT EXISTS description    TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image          TEXT          NOT NULL DEFAULT '🍽️',
  ADD COLUMN IF NOT EXISTS calories       INTEGER       NOT NULL DEFAULT 0 CHECK (calories >= 0),
  ADD COLUMN IF NOT EXISTS style          TEXT          CHECK (style IN ('dry', 'wet')),
  ADD COLUMN IF NOT EXISTS customisations TEXT[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stock          INTEGER       CHECK (stock >= 0),   -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS cost           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ;                        -- soft delete keeps order history

-- ---------- VOUCHER ----------
ALTER TABLE voucher
  ADD COLUMN IF NOT EXISTS description      TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS require_category TEXT,
  ADD COLUMN IF NOT EXISTS active           BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------- FOOD_ORDER ----------
ALTER TABLE food_order
  ADD COLUMN IF NOT EXISTS delivery_fee     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  ADD COLUMN IF NOT EXISTS refunded         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (refunded >= 0),
  ADD COLUMN IF NOT EXISTS pay_by           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason    TEXT CHECK (cancel_reason IN ('no_reply', 'not_paid', 'customer', 'merchant')),
  ADD COLUMN IF NOT EXISTS decision         TEXT CHECK (decision IN ('pending', 'accepted_partial', 'cancelled')),
  ADD COLUMN IF NOT EXISTS delivery_address JSONB;

-- The total now includes the delivery fee: replace the old "total = subtotal - discount" check.
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'food_order'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) LIKE '%total%'
  LOOP
    EXECUTE format('ALTER TABLE food_order DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE food_order
  ADD CONSTRAINT food_order_total_check    CHECK (total = subtotal + delivery_fee - discount),
  ADD CONSTRAINT food_order_refunded_max_check CHECK (refunded <= total);

-- ---------- ORDER_ITEM ----------
-- One order can mix dine-in, takeaway and delivery items, each with its own status.
ALTER TABLE order_item
  ADD COLUMN IF NOT EXISTS mode    fulfilment_mode,
  ADD COLUMN IF NOT EXISTS options TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status  TEXT   NOT NULL DEFAULT 'preparing';

UPDATE order_item oi SET mode = fo.fulfilment_mode
  FROM food_order fo WHERE fo.order_id = oi.order_id AND oi.mode IS NULL;
UPDATE order_item SET status = 'collected'
 WHERE order_id IN (SELECT order_id FROM food_order WHERE status = 'COMPLETED');
UPDATE order_item SET status = 'cancelled'
 WHERE order_id IN (SELECT order_id FROM food_order WHERE status IN ('REJECTED', 'CANCELLED', 'EXPIRED'));

ALTER TABLE order_item ALTER COLUMN mode SET NOT NULL;
ALTER TABLE order_item ADD CONSTRAINT order_item_status_check
  CHECK (status IN ('preparing', 'ready', 'collected', 'handed_over', 'delivered', 'out_of_stock', 'cancelled'));

-- ---------- DELIVERY ----------
ALTER TABLE delivery
  ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ;

-- ---------- RESERVATION ----------
ALTER TABLE reservation
  ADD COLUMN IF NOT EXISTS special_request TEXT,
  ADD COLUMN IF NOT EXISTS pay_now         BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
  ADD COLUMN IF NOT EXISTS refunded        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (refunded >= 0),
  ADD COLUMN IF NOT EXISTS allocated_table TEXT;

-- ---------- NEW: NOTIFICATION ----------
CREATE TABLE IF NOT EXISTS notification (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    type            TEXT        NOT NULL,
    title           TEXT        NOT NULL,
    body            TEXT        NOT NULL DEFAULT '',
    data            JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    acked_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notification_unread_idx ON notification (user_id) WHERE acked_at IS NULL;

-- ---------- NEW: CHAT_MESSAGE (per order or reservation) ----------
CREATE TABLE IF NOT EXISTS chat_message (
    message_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       BIGINT REFERENCES food_order (order_id) ON DELETE CASCADE,
    reservation_id BIGINT REFERENCES reservation (reservation_id) ON DELETE CASCADE,
    sender_user_id BIGINT REFERENCES users (user_id) ON DELETE SET NULL,
    sender_role    TEXT        NOT NULL CHECK (sender_role IN ('customer', 'merchant', 'system')),
    text           TEXT        NOT NULL CHECK (length(text) BETWEEN 1 AND 1000),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(order_id, reservation_id) = 1)
);
CREATE INDEX IF NOT EXISTS chat_message_order_idx ON chat_message (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS chat_message_res_idx   ON chat_message (reservation_id) WHERE reservation_id IS NOT NULL;

-- ---------- NEW: VOICE_CALL + CALL_SIGNAL (in-app calls, WebRTC handshake relay) ----------
CREATE TABLE IF NOT EXISTS voice_call (
    call_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       BIGINT REFERENCES food_order (order_id) ON DELETE CASCADE,
    reservation_id BIGINT REFERENCES reservation (reservation_id) ON DELETE CASCADE,
    caller_user_id BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    callee_user_id BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    status         TEXT   NOT NULL DEFAULT 'ringing'
                   CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at    TIMESTAMPTZ,
    ended_at       TIMESTAMPTZ,
    CHECK (num_nonnulls(order_id, reservation_id) = 1)
);
CREATE INDEX IF NOT EXISTS voice_call_live_idx ON voice_call (status) WHERE status IN ('ringing', 'active');

CREATE TABLE IF NOT EXISTS call_signal (
    signal_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    call_id      BIGINT NOT NULL REFERENCES voice_call (call_id) ON DELETE CASCADE,
    from_user_id BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    type         TEXT   NOT NULL,
    data         JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS call_signal_call_idx ON call_signal (call_id, signal_id);

-- ---------- NEW: JOB (F&B job board) ----------
CREATE TABLE IF NOT EXISTS job (
    job_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id BIGINT  NOT NULL REFERENCES merchant (merchant_id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'Staff',
    type        TEXT    NOT NULL DEFAULT 'Part-Time',
    pay         TEXT    NOT NULL DEFAULT '',
    openings    INTEGER NOT NULL DEFAULT 1 CHECK (openings > 0),
    description TEXT    NOT NULL DEFAULT '',
    perks       TEXT    NOT NULL DEFAULT '',
    is_open     BOOLEAN NOT NULL DEFAULT TRUE,
    applicants  INTEGER NOT NULL DEFAULT 0 CHECK (applicants >= 0),
    posted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_merchant_idx ON job (merchant_id);
