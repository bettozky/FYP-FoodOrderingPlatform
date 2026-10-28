# Backend

Node.js + TypeScript + Express API for ScootMeal, organised into modules.

```bash
cp .env.example .env     # then add OPENAI_API_KEY
npm install
npm run dev              # http://localhost:3001  (tsx watch)
npm run typecheck
npm run build && npm start
```

## Database (PostgreSQL)

Without `DATABASE_URL` the server runs on in-memory demo data that resets on restart (this is what `tests/smoke.mjs` expects).
With it, merchant data is saved in PostgreSQL:

1. Install PostgreSQL 16+ for Windows (https://www.postgresql.org/download/windows/), remember the `postgres` password.
2. Create the database: `"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres foodapp` (or right-click Databases → Create in pgAdmin).
3. Add to `backend/.env`: `DATABASE_URL=postgres://postgres:<password>@localhost:5432/foodapp`
4. `npm run dev`. On start the server applies new files from `database/migrations/` and creates the demo accounts once.
   (`npm run db:migrate` / `npm run db:seed` do the same by hand.)

Or use the Supabase project's own database (nothing to install): Supabase → **Connect** → **Session pooler** → copy the URI, put the database password in place of `[YOUR-PASSWORD]`, and set it as `DATABASE_URL`. SSL is turned on automatically for non-local databases.

What is saved: users and logins, merchant sign-up (with the full `application` answers), approval status, shop mode / hours / prep time, menu (dishes, tags, sold out, stock), vouchers and jobs.
Still in memory only (lost on restart): orders, reservations, payments, notifications, chat and calls, and login sessions (log in again after a restart).
Database ids are numbers sent as strings (`"12"`), so the demo ids `m1` / `d1` only exist in in-memory mode.

## Dish photos (Supabase Storage)

The merchant app's Menu screen uploads dish photos to `POST /api/merchant/dishes/:id/image` (multipart, field `file`, JPG / PNG / WebP up to 2 MB).
The server puts them in a public Supabase Storage bucket and saves the public URL as `dish.imageUrl` (`dish.image_url`). `DELETE /api/merchant/dishes/:id/image` removes it.

1. Create a project at https://supabase.com (free tier is fine).
2. Project Settings → API: copy the Project URL and the `service_role` key into `backend/.env`:
   `SUPABASE_URL=https://xxxx.supabase.co` and `SUPABASE_SERVICE_ROLE_KEY=...`
   The service role key can do anything in the project: keep it only in `backend/.env`, never in an app or in git.
3. Restart the server. The public bucket `menu-photos` is created on the first upload (or create it yourself in Storage, marked Public).

Without these settings the upload answers 503 and dishes keep their emoji.

The shop sign-up files use the same settings: `POST /api/merchant/uploads` (multipart: `kind`, optional `index`, `file`; max 2 MB).
SSM and halal certificates go to the PRIVATE bucket `merchant-documents` (the admin's merchant page opens them with a signed link that lasts 1 hour);
logo and cover go to the public bucket `shop-photos`; sign-up menu photos go to `menu-photos`. Buckets are created on first use.

## Structure

```
src/
  app.ts                 Express app; mounts one router per module
  server.ts              starts the server
  config/                env settings
  middleware/            auth, errors, rate limiting
  modules/
    ai-assistant/        POST /api/ai/chat (built)
    auth/ merchants/ ordering/ dine-in/ payment/
    delivery/ notifications/ admin/    (folders with notes, not built yet)
  jobs/                  timers for order and reservation deadlines
tests/
```

Each module follows the same shape: `<name>.routes.ts` (URLs), `<name>.service.ts` (business rules), `<name>.repository.ts` (database queries), `<name>.schema.ts` (validation), `<name>.test.ts`.

To add a module, create its router and mount it in `src/app.ts`.

## Notes

- The AI endpoint has no login or rate limit yet. Add both before exposing it publicly.
- `AI_MODEL` can be set in `.env` (default is the model name the project already used).

## Order, reservation and delivery flows
Implemented in `src/modules/{ordering,dine-in,delivery}`; a 1 s sweeper (`src/jobs/deadlines.ts`) expires unanswered orders (10 min) and reservations (30 min), cancels unpaid orders (10 min payment window), auto-refunds, advances delivery stages and sends reservation reminders. Run `node tests/smoke.mjs` against a running server. Coverage: `docs/requirements/REQUIREMENT_COVERAGE.md`.
