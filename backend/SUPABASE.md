# Using Supabase with the ScootMeal backend

You need a free Supabase account. This takes about 5 minutes. Nothing in the apps changes: they keep calling this backend.

## 1. Create the project
1. supabase.com -> **New project**. Pick the region closest to you (e.g. Singapore) and set a **database password** (save it).
2. Wait until the project is ready.

## 2. Connect the database
1. In the project: **Connect** (top bar) or **Project Settings -> Database -> Connection string**.
2. Choose **Session pooler** (works on every network, including home Wi-Fi). Copy the string; it looks like  
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
3. In `backend/.env` add (with your real password in place of `[YOUR-PASSWORD]`):
   ```
   DATABASE_URL=postgresql://postgres.abcdefgh:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
   If the password contains characters like `@ # / ?`, write them URL-encoded (`@` = `%40`, `#` = `%23`, `/` = `%2F`).
4. `npm run dev`. The console should say `Database connected` and `Data: PostgreSQL / Supabase (saved)`.
   The tables are created automatically and, because the database is empty, the demo shops and logins are added.
5. Open **Table Editor** in Supabase: you will see `users`, `merchants`, `dishes`, `orders` ... Place an order in the app and watch it appear in `orders`.

Direct connection (`db.<ref>.supabase.co`) only works over IPv6; if you see `ENOTFOUND` or timeouts use the Session pooler string above.
The Transaction pooler (port 6543) works too.

## 3. Photos and shop documents (optional but recommended)
1. **Project Settings -> API Keys**: copy the project URL and the **secret** key (`sb_secret_...` or the `service_role` key). Not the publishable / anon key.
2. Add to `backend/.env`:
   ```
   SUPABASE_URL=https://abcdefgh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```
3. Restart. The first upload creates the buckets `menu-photos`, `shop-photos`, `avatars` (public) and `merchant-documents`, `job-applications` (private) automatically.
   `avatars` holds customer and merchant profile photos, `shop-photos` the shop logo and banner, `menu-photos` the dish photos, and `job-applications` the CVs students send with a job application (only the shop that received it can open them, through links that expire after an hour).
   The start-up message says `Files: Supabase Storage`.

## 3b. Forgot-password emails (optional)
Without email settings the reset code is printed in the backend console, which is fine for testing. For real emails add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` (see `.env.example`). A Gmail account with an app password works for a demo.

## 4. Real launch (no demo data)
```
SEED_DEMO_DATA=false
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=a-long-password
```
On an empty database this creates only that admin account. Merchants and customers sign up through the apps.
To wipe a test database and start again, delete the rows in the Table Editor (or `TRUNCATE` the tables in the SQL Editor) and restart.

## Good to know
- New tables (for example job applications and announcements) are created automatically when the backend starts: it applies any new file in `backend/database/migrations`. Nothing to run by hand.
- The backend connects with the database owner role and every table has Row Level Security on with no policies, so the public Supabase API (anon key) cannot read your data. Only this backend can. Edit data from the dashboard or through the backend.
- Do not change `id` columns or the `data` JSON shape by hand unless you know what you are doing; the backend reads them back on start-up.
- Run **one** backend instance. It keeps data in memory and writes changes to Supabase within about a second.
- Backups: Supabase free projects keep daily backups for a short time only; for the demo day, export from **Database -> Backups** or `pg_dump` before you present.

## If something goes wrong
| Message | Meaning |
|---|---|
| `Could not start the database: ENOTFOUND ...` | wrong host or you used the direct connection on an IPv4 network: use the Session pooler string |
| `password authentication failed` | wrong password in `DATABASE_URL` (check URL-encoding) |
| `Database: could not save orders: ...` | temporary connection problem; the server keeps running and retries every 2 seconds |
| `SUPABASE_SERVICE_ROLE_KEY ... is the publishable key` | use the secret key |
| Uploads return 503/502 | `SUPABASE_URL` or the key is wrong; remove both to use local storage meanwhile |
