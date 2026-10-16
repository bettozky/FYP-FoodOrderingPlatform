# Database

PostgreSQL schema and sample data for the backend.

```
database/
  migrations/   one SQL file per change, in order (tables from the ERD in docs/diagrams/erd.png)
  seeds/        sample merchants, dishes and users for development
```

Start from the ERD (11 entities: User, Merchant, Venue, Dish, Order, OrderItem, Reservation, PreorderItem, Delivery, Voucher, Review). Two details matter:

- `OrderItem.fulfilment_mode` (DELIVERY / DINE_IN / TAKEAWAY) lets one order mix dine-in and delivery.
- `Order.respond_by` and `Reservation.respond_by` store the response deadline (10 and 30 minutes) so the timers are enforced on the server.
