-- Run: psql -U postgres -h localhost -d foodapp -f proof.sql

-- 1. Rows in the 15 ERD tables (+ app tables)
SELECT 'users' AS table_name, count(*) FROM users
UNION ALL SELECT 'merchant', count(*) FROM merchant
UNION ALL SELECT 'venue', count(*) FROM venue
UNION ALL SELECT 'operating_hours', count(*) FROM operating_hours
UNION ALL SELECT 'dish', count(*) FROM dish
UNION ALL SELECT 'dish_tag', count(*) FROM dish_tag
UNION ALL SELECT 'voucher', count(*) FROM voucher
UNION ALL SELECT 'food_order', count(*) FROM food_order
UNION ALL SELECT 'order_item', count(*) FROM order_item
UNION ALL SELECT 'voucher_redemption', count(*) FROM voucher_redemption
UNION ALL SELECT 'delivery', count(*) FROM delivery
UNION ALL SELECT 'review', count(*) FROM review
UNION ALL SELECT 'reservation', count(*) FROM reservation
UNION ALL SELECT 'preorder_item', count(*) FROM preorder_item
UNION ALL SELECT 'payment', count(*) FROM payment
UNION ALL SELECT '(app) notification', count(*) FROM notification
UNION ALL SELECT '(app) chat_message', count(*) FROM chat_message
UNION ALL SELECT '(app) job', count(*) FROM job;

-- 2. Users (password is a bcrypt hash, not plain text)
SELECT user_id, name, email, role, loyalty_points, left(password_hash, 25) AS password_hash
  FROM users ORDER BY user_id;

-- 3. Merchant -> owner -> venue
SELECT m.name AS merchant, u.name AS owner, m.approval_status, v.address, v.category
  FROM merchant m JOIN users u ON u.user_id = m.owner_user_id
  LEFT JOIN venue v ON v.merchant_id = m.merchant_id ORDER BY m.merchant_id;

-- 4. Latest orders with items
SELECT fo.order_id, u.name AS customer, m.name AS restaurant, d.name AS dish, oi.mode, oi.qty,
       oi.status AS item_status, fo.total, fo.refunded, fo.status
  FROM food_order fo
  JOIN users u ON u.user_id = fo.user_id
  JOIN venue v ON v.venue_id = fo.venue_id
  JOIN merchant m ON m.merchant_id = v.merchant_id
  JOIN order_item oi ON oi.order_id = fo.order_id
  JOIN dish d ON d.dish_id = oi.dish_id
 ORDER BY fo.order_id DESC LIMIT 20;

-- 5. Reservations
SELECT r.reservation_id, u.name AS customer, m.name AS restaurant, r.reserved_for, r.party_size,
       r.status, r.allocated_table
  FROM reservation r
  JOIN users u ON u.user_id = r.user_id
  JOIN venue v ON v.venue_id = r.venue_id
  JOIN merchant m ON m.merchant_id = v.merchant_id
 ORDER BY r.reservation_id DESC LIMIT 20;

-- 6. Payments and reviews
SELECT payment_id, order_id, reservation_id, method, amount, status, paid_at FROM payment ORDER BY payment_id DESC LIMIT 20;
SELECT review_id, order_item_id, rating, comment FROM review ORDER BY review_id DESC LIMIT 20;
