-- =====================================================================
-- Food ordering & reservation platform — PostgreSQL schema
-- Implements the ERD (15 tables). Run with:
--   psql -d foodapp -f schema.sql
-- Requires PostgreSQL 13+ (uses GENERATED ... AS IDENTITY, num_nonnulls)
-- =====================================================================


-- ---------------------------------------------------------------------
-- Enum types (values match the ERD where it specifies them)
-- ---------------------------------------------------------------------
CREATE TYPE user_role          AS ENUM ('CUSTOMER', 'MERCHANT', 'ADMIN');
CREATE TYPE approval_status    AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE discount_type      AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE fulfilment_mode    AS ENUM ('DELIVERY', 'DINE_IN', 'TAKEAWAY');
CREATE TYPE order_status       AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING',
                                        'READY', 'OUT_FOR_DELIVERY', 'COMPLETED',
                                        'CANCELLED', 'EXPIRED');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED',
                                        'COMPLETED', 'NO_SHOW', 'EXPIRED');
CREATE TYPE delivery_status    AS ENUM ('SEARCHING', 'ASSIGNED', 'PICKED_UP',
                                        'DELIVERED', 'FAILED');
CREATE TYPE payment_method     AS ENUM ('CARD', 'E_WALLET', 'ONLINE_BANKING', 'CASH');
CREATE TYPE payment_status     AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- ---------------------------------------------------------------------
-- USER  ("user" is a reserved word in PostgreSQL, so the table is "users")
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT        NOT NULL,
    email           TEXT        NOT NULL,
    password_hash   TEXT        NOT NULL,          -- not in ERD; needed for login
    phone           TEXT,
    date_of_birth   DATE,
    role            user_role   NOT NULL DEFAULT 'CUSTOMER',
    loyalty_points  INTEGER     NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Case-insensitive uniqueness: Foo@x.com and foo@x.com are the same account
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- ---------------------------------------------------------------------
-- MERCHANT
-- ---------------------------------------------------------------------
CREATE TABLE merchant (
    merchant_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id    BIGINT          NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    name             TEXT            NOT NULL,
    approval_status  approval_status NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX ON merchant (owner_user_id);

-- ---------------------------------------------------------------------
-- VENUE
-- ---------------------------------------------------------------------
CREATE TABLE venue (
    venue_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id          BIGINT  NOT NULL REFERENCES merchant (merchant_id) ON DELETE CASCADE,
    name                 TEXT    NOT NULL,
    address              TEXT    NOT NULL,
    category             TEXT,
    price_per_pax        NUMERIC(10,2) CHECK (price_per_pax >= 0),
    is_accepting_orders  BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ON venue (merchant_id);

-- ---------------------------------------------------------------------
-- OPERATING_HOURS
-- day_of_week: 0 = Sunday ... 6 = Saturday (matches EXTRACT(DOW ...))
-- close_time < open_time means the venue closes after midnight.
-- ---------------------------------------------------------------------
CREATE TABLE operating_hours (
    hours_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id     BIGINT   NOT NULL REFERENCES venue (venue_id) ON DELETE CASCADE,
    day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time    TIME     NOT NULL,
    close_time   TIME     NOT NULL,
    CHECK (open_time <> close_time)
);
CREATE INDEX ON operating_hours (venue_id, day_of_week);

-- ---------------------------------------------------------------------
-- VOUCHER
-- ---------------------------------------------------------------------
CREATE TABLE voucher (
    voucher_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id     BIGINT        NOT NULL REFERENCES merchant (merchant_id) ON DELETE CASCADE,
    code            TEXT          NOT NULL UNIQUE,
    discount_type   discount_type NOT NULL,
    discount_value  NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_spend       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_spend >= 0),
    usage_limit     INTEGER       CHECK (usage_limit > 0),   -- NULL = unlimited
    expiry          TIMESTAMPTZ,                             -- NULL = never expires
    CHECK (discount_type <> 'PERCENT' OR discount_value <= 100)
);
CREATE INDEX ON voucher (merchant_id);

-- ---------------------------------------------------------------------
-- DISH and DISH_TAG
-- ---------------------------------------------------------------------
CREATE TABLE dish (
    dish_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    merchant_id   BIGINT        NOT NULL REFERENCES merchant (merchant_id) ON DELETE CASCADE,
    name          TEXT          NOT NULL,
    food_type     TEXT,
    price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_available  BOOLEAN       NOT NULL DEFAULT TRUE
);
CREATE INDEX ON dish (merchant_id);

CREATE TABLE dish_tag (
    dish_id  BIGINT NOT NULL REFERENCES dish (dish_id) ON DELETE CASCADE,
    tag      TEXT   NOT NULL,
    PRIMARY KEY (dish_id, tag)
);
CREATE INDEX ON dish_tag (tag);   -- "find all dishes tagged 'halal'"

-- ---------------------------------------------------------------------
-- FOOD_ORDER
-- respond_by defaults to 10 minutes after creation.
-- ---------------------------------------------------------------------
CREATE TABLE food_order (
    order_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT          NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    venue_id         BIGINT          NOT NULL REFERENCES venue (venue_id) ON DELETE RESTRICT,
    fulfilment_mode  fulfilment_mode NOT NULL,
    status           order_status    NOT NULL DEFAULT 'PENDING',
    subtotal         NUMERIC(10,2)   NOT NULL CHECK (subtotal >= 0),
    discount         NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total            NUMERIC(10,2)   NOT NULL,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    respond_by       TIMESTAMPTZ     NOT NULL DEFAULT now() + INTERVAL '10 minutes',
    CHECK (discount <= subtotal),
    CHECK (total = subtotal - discount)
);
CREATE INDEX ON food_order (user_id, created_at DESC);
CREATE INDEX ON food_order (venue_id, status);
CREATE INDEX food_order_pending_idx ON food_order (respond_by) WHERE status = 'PENDING';

-- ---------------------------------------------------------------------
-- ORDER_ITEM
-- ---------------------------------------------------------------------
CREATE TABLE order_item (
    order_item_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       BIGINT        NOT NULL REFERENCES food_order (order_id) ON DELETE CASCADE,
    dish_id        BIGINT        NOT NULL REFERENCES dish (dish_id) ON DELETE RESTRICT,
    qty            INTEGER       NOT NULL CHECK (qty > 0),
    unit_price     NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),  -- price snapshot at order time
    customisation  TEXT
);
CREATE INDEX ON order_item (order_id);
CREATE INDEX ON order_item (dish_id);

-- ---------------------------------------------------------------------
-- REVIEW (1 : 0..1 with ORDER_ITEM)
-- ---------------------------------------------------------------------
CREATE TABLE review (
    review_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_item_id  BIGINT      NOT NULL UNIQUE REFERENCES order_item (order_item_id) ON DELETE CASCADE,
    rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- VOUCHER_REDEMPTION (1 : 0..1 with FOOD_ORDER)
-- ---------------------------------------------------------------------
CREATE TABLE voucher_redemption (
    redemption_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id     BIGINT      NOT NULL REFERENCES voucher (voucher_id) ON DELETE RESTRICT,
    order_id       BIGINT      NOT NULL UNIQUE REFERENCES food_order (order_id) ON DELETE CASCADE,
    redeemed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON voucher_redemption (voucher_id);

-- ---------------------------------------------------------------------
-- DELIVERY (1 : 0..1 with FOOD_ORDER)
-- rider_location is a POINT: (longitude, latitude)
-- ---------------------------------------------------------------------
CREATE TABLE delivery (
    delivery_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        BIGINT          NOT NULL UNIQUE REFERENCES food_order (order_id) ON DELETE CASCADE,
    provider        TEXT            NOT NULL,
    rider_name      TEXT,
    rider_location  POINT,
    status          delivery_status NOT NULL DEFAULT 'SEARCHING'
);

-- ---------------------------------------------------------------------
-- RESERVATION
-- respond_by defaults to 30 minutes after creation.
-- ---------------------------------------------------------------------
CREATE TABLE reservation (
    reservation_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT             NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
    venue_id        BIGINT             NOT NULL REFERENCES venue (venue_id) ON DELETE RESTRICT,
    reserved_for    TIMESTAMPTZ        NOT NULL,
    party_size      INTEGER            NOT NULL CHECK (party_size > 0),
    status          reservation_status NOT NULL DEFAULT 'PENDING',
    contact_phone   TEXT               NOT NULL,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
    respond_by      TIMESTAMPTZ        NOT NULL DEFAULT now() + INTERVAL '30 minutes'
);
CREATE INDEX ON reservation (user_id, reserved_for DESC);
CREATE INDEX ON reservation (venue_id, reserved_for);
CREATE INDEX reservation_pending_idx ON reservation (respond_by) WHERE status = 'PENDING';

-- ---------------------------------------------------------------------
-- PREORDER_ITEM
-- ---------------------------------------------------------------------
CREATE TABLE preorder_item (
    preorder_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reservation_id   BIGINT          NOT NULL REFERENCES reservation (reservation_id) ON DELETE CASCADE,
    dish_id          BIGINT          NOT NULL REFERENCES dish (dish_id) ON DELETE RESTRICT,
    qty              INTEGER         NOT NULL CHECK (qty > 0),
    unit_price       NUMERIC(10,2)   NOT NULL CHECK (unit_price >= 0),
    approval_status  approval_status NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX ON preorder_item (reservation_id);
CREATE INDEX ON preorder_item (dish_id);

-- ---------------------------------------------------------------------
-- PAYMENT — belongs to exactly one of: a food order OR a reservation
-- ---------------------------------------------------------------------
CREATE TABLE payment (
    payment_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        BIGINT         REFERENCES food_order (order_id) ON DELETE RESTRICT,
    reservation_id  BIGINT         REFERENCES reservation (reservation_id) ON DELETE RESTRICT,
    method          payment_method NOT NULL,
    amount          NUMERIC(10,2)  NOT NULL CHECK (amount > 0),
    status          payment_status NOT NULL DEFAULT 'PENDING',
    paid_at         TIMESTAMPTZ,
    CHECK (num_nonnulls(order_id, reservation_id) = 1),
    CHECK (status <> 'SUCCEEDED' OR paid_at IS NOT NULL)
);
CREATE INDEX ON payment (order_id)       WHERE order_id IS NOT NULL;
CREATE INDEX ON payment (reservation_id) WHERE reservation_id IS NOT NULL;

-- =====================================================================
-- Business-rule triggers (rules a plain foreign key can't express)
-- =====================================================================

-- A voucher can only be used on an order from the same merchant, before
-- expiry, when min_spend is met, and while under its usage_limit.
-- Locking the voucher row stops two simultaneous redemptions from both
-- squeezing past the limit.
CREATE FUNCTION check_voucher_redemption() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v               voucher%ROWTYPE;
    order_merchant  BIGINT;
    order_subtotal  NUMERIC;
    times_used      INTEGER;
BEGIN
    SELECT * INTO v FROM voucher WHERE voucher_id = NEW.voucher_id FOR UPDATE;

    IF v.expiry IS NOT NULL AND NEW.redeemed_at > v.expiry THEN
        RAISE EXCEPTION 'Voucher % has expired', v.code;
    END IF;

    SELECT ve.merchant_id, fo.subtotal
      INTO order_merchant, order_subtotal
      FROM food_order fo
      JOIN venue ve ON ve.venue_id = fo.venue_id
     WHERE fo.order_id = NEW.order_id;

    IF order_merchant <> v.merchant_id THEN
        RAISE EXCEPTION 'Voucher % does not belong to this order''s merchant', v.code;
    END IF;

    IF order_subtotal < v.min_spend THEN
        RAISE EXCEPTION 'Order subtotal % is below voucher minimum spend %',
                        order_subtotal, v.min_spend;
    END IF;

    IF v.usage_limit IS NOT NULL THEN
        SELECT count(*) INTO times_used
          FROM voucher_redemption WHERE voucher_id = NEW.voucher_id;
        IF times_used >= v.usage_limit THEN
            RAISE EXCEPTION 'Voucher % has reached its usage limit', v.code;
        END IF;
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER trg_check_voucher_redemption
    BEFORE INSERT ON voucher_redemption
    FOR EACH ROW EXECUTE FUNCTION check_voucher_redemption();

-- Dishes on an order must come from the merchant that owns the venue.
CREATE FUNCTION check_order_item_dish() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM food_order fo
          JOIN venue ve ON ve.venue_id = fo.venue_id
          JOIN dish d   ON d.merchant_id = ve.merchant_id
         WHERE fo.order_id = NEW.order_id
           AND d.dish_id   = NEW.dish_id
    ) THEN
        RAISE EXCEPTION 'Dish % is not sold at this order''s venue', NEW.dish_id;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_check_order_item_dish
    BEFORE INSERT OR UPDATE OF order_id, dish_id ON order_item
    FOR EACH ROW EXECUTE FUNCTION check_order_item_dish();

-- Same rule for pre-ordered dishes on a reservation.
CREATE FUNCTION check_preorder_item_dish() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM reservation r
          JOIN venue ve ON ve.venue_id = r.venue_id
          JOIN dish d   ON d.merchant_id = ve.merchant_id
         WHERE r.reservation_id = NEW.reservation_id
           AND d.dish_id        = NEW.dish_id
    ) THEN
        RAISE EXCEPTION 'Dish % is not sold at this reservation''s venue', NEW.dish_id;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_check_preorder_item_dish
    BEFORE INSERT OR UPDATE OF reservation_id, dish_id ON preorder_item
    FOR EACH ROW EXECUTE FUNCTION check_preorder_item_dish();

-- A delivery record only makes sense for DELIVERY orders.
CREATE FUNCTION check_delivery_mode() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT fulfilment_mode FROM food_order WHERE order_id = NEW.order_id) <> 'DELIVERY' THEN
        RAISE EXCEPTION 'Order % is not a delivery order', NEW.order_id;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_check_delivery_mode
    BEFORE INSERT OR UPDATE OF order_id ON delivery
    FOR EACH ROW EXECUTE FUNCTION check_delivery_mode();

-- =====================================================================
-- Helper: expire requests the merchant didn't answer in time.
-- Call it every minute from your backend (or pg_cron):
--   SELECT * FROM expire_stale_requests();
-- =====================================================================
CREATE FUNCTION expire_stale_requests(
    OUT orders_expired INTEGER,
    OUT reservations_expired INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE food_order SET status = 'EXPIRED'
     WHERE status = 'PENDING' AND respond_by < now();
    GET DIAGNOSTICS orders_expired = ROW_COUNT;

    UPDATE reservation SET status = 'EXPIRED'
     WHERE status = 'PENDING' AND respond_by < now();
    GET DIAGNOSTICS reservations_expired = ROW_COUNT;
END $$;

