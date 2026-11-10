# Database

PostgreSQL / Supabase schema for the backend. The SQL lives with the backend so it ships with it:

- `backend/database/migrations/` : one SQL file per change, applied automatically in order when the backend starts (`npm run db:migrate` does it by hand).
- How data gets in and out: `backend/src/store/persistence/` (see `backend/readme.md`, "How data is saved").
- Connecting to Supabase: `backend/SUPABASE.md`.

Two details from the ERD (docs/diagrams/erd.png) still matter:

- `OrderItem.fulfilment_mode` (DELIVERY / DINE_IN / TAKEAWAY) lets one order mix dine-in and delivery. In the database each order's `data` JSON holds its items with a `mode`.
- Orders and reservations store their response deadlines (`respondBy`, `payBy`) so the 10 / 30 minute timers are enforced by the server, not the apps.
