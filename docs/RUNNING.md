# Running ScootMeal locally

1. Backend: `cd backend && npm install && npm run dev` (port 3001).
   Short timers for demos: `ORDER_RESPONSE_MS=40000 PAYMENT_WINDOW_MS=40000 CALL_RING_MS=15000 RESERVATION_RESPONSE_MS=40000 DELIVERY_STAGE_MS=2500 npm run dev`.
2. Customer app: `cd apps/customer-app && npm install && EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3001 npx expo start`
   (web: add `--web`). Demo login: `demo@scootmeal.test` / `demo123`.
3. Merchant app: same with `apps/merchant-app`. Demo login: `ahseng@scootmeal.test` / `merchant123`.
   New businesses register and stay "pending" until approved (admin `admin@scootmeal.test` / `admin123`, `POST /api/admin/merchants/:id/approve`).
4. Tests: `cd backend && API_URL=http://localhost:3001 node tests/smoke.mjs`.
5. Test card: 4242 4242 4242 4242 succeeds; 4000 0000 0000 0002 is declined.

Phones need the PC's LAN IP in `EXPO_PUBLIC_API_URL`, not localhost.

## Order flow, chat and calls
- The customer sends an order request with **no payment**. The merchant gets the full-screen pop-up (10 min, `ORDER_RESPONSE_MS`). After the merchant confirms, the customer pays (`PAYMENT_WINDOW_MS`, default 10 min). Declined, no reply or unpaid = cancelled, nothing charged.
- Live chat (customer <-> merchant) is available from the merchant pop-up, the order queue, the customer order screen and bookings. It closes when an order is declined, expired or cancelled.
- Calls are in-app voice (WebRTC); the backend only relays signalling (`/api/calls`). Ring timeout `CALL_RING_MS` (30 s). On the web the browser asks for microphone permission (needs https or localhost). On phones use a development build (`npx expo run:android|ios`) because `react-native-webrtc` does not run in Expo Go; Expo Go still gets chat but calls are silent.
- Signalling and chat use polling (1.5-2.5 s). STUN only (no TURN), so calls can fail behind strict NATs.
