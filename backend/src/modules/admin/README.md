# admin

Web Admin APIs (all need an admin login, `Authorization: Bearer <token>`). Requirements: FR-6.1 to FR-6.6.

| Area | Endpoints |
| --- | --- |
| Merchants | `GET /admin/merchants`, `PATCH /admin/merchants/:id` (approve, reject, suspend), `POST /admin/merchants/:id/warn` |
| Watchlist | `GET /admin/watchlist`: shops with low ratings, missed orders or slow confirmations (see `shopHealth` in `admin.service.ts`) |
| Reviews | `GET /admin/reviews?filter=queue\|low\|hidden\|all`, `PATCH /admin/reviews/:id` (hide, restore, flag, note). Rude or spammy reviews are auto-flagged (`moderation.ts`). Hidden reviews do not count towards ratings (`lib/ratings.ts`). |
| Orders | `GET /admin/orders?q=&status=&merchantId=`, `GET /admin/orders/:id`, `POST /admin/orders/:id/refund` |
| Dashboard | `GET /admin/overview` (KPIs, 14-day trend, busiest hours, payment split, top shops and dishes, alerts), `GET /admin/stats` |
| Users | `GET /admin/users?role=customer\|merchant`, `PATCH /admin/users/:id` (suspend / restore; suspended users are logged out) |
| Reservations | `GET /admin/reservations` |
| Vouchers | `GET/POST /admin/vouchers`, `PATCH /admin/vouchers/:id` |
| Announcements | `POST /admin/announcements` (customers, merchants or all) |
| Activity log | `GET /admin/audit` (every admin action is recorded) |

The demo data (other shops, reviews, customers, reservations) is seeded in `store/db.ts` so the dashboard has something to show.
