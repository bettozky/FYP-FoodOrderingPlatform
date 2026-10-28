# Database

PostgreSQL schema for the backend. Setup steps are in `../readme.md` (section "Database").

```
database/
  migrations/   one SQL file per change, applied in order by src/store/postgres/migrate.ts
  proof.sql     queries that show what is stored (psql -U postgres -h localhost -d foodapp -f proof.sql)
```

Demo data is in `src/store/postgres/seed.ts`. To change the schema, add the next numbered file (e.g. `006_....sql`); never edit a file that has already been applied.

Start from the ERD (11 entities: User, Merchant, Venue, Dish, Order, OrderItem, Reservation, PreorderItem, Delivery, Voucher, Review). Two details matter:

- `OrderItem.fulfilment_mode` (DELIVERY / DINE_IN / TAKEAWAY) lets one order mix dine-in and delivery.
- `Order.respond_by` and `Reservation.respond_by` store the response deadline (10 and 30 minutes) so the timers are enforced on the server.
