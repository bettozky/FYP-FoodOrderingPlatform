# ScootMeal — Frontend (React Native / Expo)

Dish-first food ordering app for university canteen vendors. This is the
frontend only, wired up with mock data so every screen and flow works
end-to-end without a backend.

## What's included

**Customer app**
- Login / Signup
- Home — dish-first search & category browse (the core differentiator)
- Dish detail — quantity selector, add to cart
- Cart — Dine-in / Takeaway / Delivery mode switch
- Checkout — payment method picker (mock Stripe/TnG/Cash), order summary
- Order tracking — live status stepper with ETA
- Orders — active + past order history
- Loyalty — points, tier progress, redeemable vouchers
- Account — profile, and a "Switch to merchant view" entry point

**Merchant app (thin slice)**
- Dashboard — today's orders/revenue/prep-time stats
- Incoming order queue — advance orders through placed → preparing → ready → out for delivery
- Menu management — toggle dishes sold out/available

All data lives in `src/data/mockData.ts` — swap that for real API calls
when the backend is ready; the screens themselves don't need to change.

## Running it

```bash
npm install
npm run web       # opens in a browser — fastest way to check it
npm run android    # requires Android Studio / emulator or a device with Expo Go
npm run ios        # requires a Mac
```

Any email/password logs you in (no real auth yet — that's backend work).

## Project structure

```
src/
  screens/customer/   customer-facing screens
  screens/merchant/    merchant-facing screens
  navigation/          React Navigation stack + tabs wiring
  context/             CartContext, AuthContext (in-memory app state)
  data/mockData.ts      mock dishes, merchants, orders, loyalty data
  theme/theme.ts        shared colours, spacing, typography tokens
  components/          shared UI: buttons, cards, badges, headers
```

## Next steps

- Replace `mockData.ts` reads with real API calls (the Node.js/Express
  backend mentioned in the project plan)
- Wire real Stripe payment element into Checkout
- Wire real Lalamove tracking into Order Tracking
- Add persistent auth (JWT/session) in AuthContext
