# Running ScootMeal locally

1. Backend: `cd backend && npm install && npm run dev` (port 3001).
   Short timers for demos: `ORDER_RESPONSE_MS=40000 RESERVATION_RESPONSE_MS=40000 DELIVERY_STAGE_MS=2500 npm run dev`.
2. Customer app: `cd apps/customer-app && npm install && EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3001 npx expo start`
   (web: add `--web`). Demo login: `demo@scootmeal.test` / `demo123`.
3. Merchant app: same with `apps/merchant-app`. Demo login: `ahseng@scootmeal.test` / `merchant123`.
   New businesses register and stay "pending" until approved (admin `admin@scootmeal.test` / `admin123`, `POST /api/admin/merchants/:id/approve`).
4. Tests: `cd backend && API_URL=http://localhost:3001 node tests/smoke.mjs`.
5. Test card: 4242 4242 4242 4242 succeeds; 4000 0000 0000 0002 is declined.

Phones need the PC's LAN IP in `EXPO_PUBLIC_API_URL`, not localhost.
