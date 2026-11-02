# ScootMeal backend

Node.js + TypeScript + Express API for the customer app, the merchant app and the web admin.
It runs **with no setup** (in-memory demo data) and switches to **Supabase / PostgreSQL** by adding one line to `.env`.

```bash
cd backend
cp .env.example .env     # everything is optional
npm install
npm run dev              # http://localhost:3001   (try http://localhost:3001/api/health)
```

| Command | What it does |
|---|---|
| `npm run dev` | start with auto-reload |
| `npm test` | start a fresh server per test file and run every test in `tests/` (about 160 checks) |
| `npm run typecheck` | TypeScript check |
| `npm run build` then `npm start` | production build |
| `npm run db:migrate` | create / update the database tables (also runs automatically at start-up) |
| `npm run db:check` | proves the database keeps data across a restart (use a **test** database) |
| `npm run routes` | list every URL (`npm run routes > API.md` regenerates [API.md](API.md)) |

Demo logins (when demo data is on): customer `demo@scootmeal.test / demo123`, merchant `ahseng@scootmeal.test / merchant123`, admin `admin@scootmeal.test / admin123`.

## Using Supabase

Short version: put `DATABASE_URL=...` (Supabase session-pooler string) in `.env` and restart. The tables are created and the
demo data is added automatically. For photos, also add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
Step by step with screenshots-in-words: **[SUPABASE.md](SUPABASE.md)**.

## How it is organised

```
src/
  server.ts            start-up: open the database, start the timers, listen, save on shutdown
  app.ts               the Express app: middleware, then ONE line per module (the list of all modules)
  config/env.ts        every setting, with its default (all can be set in .env)
  middleware/          auth (login + role), rateLimit, persist (save after writes)
  lib/                 small helpers: http errors + validation, ids + passwords, time, geo, ratings, storage (files)
  store/
    types.ts           the shapes of all records (User, Merchant, Dish, Order ...)
    db.ts              the working data set, plain Maps and arrays that every module reads and writes
    seed.ts            demo shops, dishes, users and a month of order history
    persistence/       saves `db` to PostgreSQL / Supabase and loads it back (see below)
  modules/             one folder per feature, each has <name>.routes.ts (URLs) and <name>.service.ts (rules)
    auth/ account/ (addresses, favourites, loyalty) merchants/ (catalog, portal, analytics)
    uploads/ ordering/ payment/ dine-in/ delivery/ notifications/ chat/ calls/ reviews/ admin/ ai-assistant/
  jobs/                the 1-second timer: expire unanswered orders (10 min) and bookings (30 min), cancel unpaid
                       orders, advance deliveries, send reminders; plus photo download for the demo dishes
database/migrations/   SQL that creates the tables (applied automatically, in order, once)
scripts/               routes lister, test runner, database check
tests/                 end-to-end tests that call the real HTTP API
```

To add a feature: create `src/modules/<name>/<name>.routes.ts`, add one `app.use(...)` line in `src/app.ts`, then run `npm run routes`.

## How data is saved

Business rules work on the in-memory `db` (fast and simple). With `DATABASE_URL` set:

1. **Start-up**: tables are created (`database/migrations`), every table is loaded into `db`; an empty database gets the demo data.
2. **While running**: after every API call that changes something, and every 2 seconds for timer-driven changes (expired
   orders, deliveries), only the records that changed are written (`store/persistence/sync.ts`). A failed save is retried automatically.
3. **Shutdown** (Ctrl+C / redeploy): pending changes are saved first. Login tokens are saved too, so users stay signed in across restarts.

Each table has the columns you filter on (ids, status, owner, dates) plus a `data` JSONB column with the full record, so you can
browse and edit everything in the Supabase Table Editor. Row Level Security is switched on for every table, so the public Supabase API
cannot read them; only this server (which connects directly) can.

Trade-off to know about: the server holds all data in memory, so run **one** server instance (fine for the FYP and a small launch).
To scale to several instances later, replace the in-memory reads with per-request queries module by module.

## Files and photos

- With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: Supabase Storage. Photos go to public buckets (`menu-photos`, `shop-photos`); SSM / halal certificates go to the private `merchant-documents` bucket and the admin opens them with a one-hour link. Buckets are created automatically.
- Without them: photos are saved in `backend/public/uploads` and served at `/media/uploads/...`; certificates in `backend/private-uploads` (never served).
- Limits: JPG / PNG / WebP photos and PDF certificates, 2 MB each.

## Security notes

- Passwords are hashed (scrypt). Logins expire after `SESSION_DAYS` (30). Suspended users are signed out at once.
- Login, sign-up and password change are limited to 30 requests / minute / address; the AI assistant to 20 (change in `.env`).
- Customers never receive a dish's ingredient `cost` or `stock`.
- The service-role key only lives in `backend/.env` (git-ignored). Never put it in an app.
- `POST /api/dev/reset` exists only when `NODE_ENV` is not `production`.

## Order, reservation and delivery flows

`src/modules/{ordering,dine-in,delivery}`: customer requests, the restaurant has 10 minutes to confirm, the customer then has 10 minutes to pay; out-of-stock after payment lets the customer continue (partial refund) or cancel (full refund). Bookings get 30 minutes. Details and requirement coverage: `docs/requirements/REQUIREMENT_COVERAGE.md`.
