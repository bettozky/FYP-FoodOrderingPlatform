# dine-in

Table reservations, pre-order, restaurant approval, 30-minute response deadline, food-ready alert.

Requirements: FR-2.7, FR-3.1 to FR-3.5, FR-5.7 to FR-5.10 (see `docs/requirements`).

Suggested files: `dine-in.routes.ts`, `dine-in.service.ts`, `dine-in.repository.ts`, `dine-in.schema.ts`, `dine-in.test.ts`.

## Confirm-then-pay (same rule as orders)

1. The customer books. Nothing is charged, even for **Pay online**.
2. The restaurant confirms and gives a table. A Pay Now booking becomes `awaiting_payment` and holds the table for `PAYMENT_WINDOW_MS`.
3. The customer pays with `POST /api/reservations/:id/pay`. The booking becomes `confirmed`.
4. If the window ends unpaid, the sweeper sets `expired` (`cancelReason: not_paid`), the table is free again and nothing was charged.

Pay Later bookings skip step 3 and are confirmed straight away.
