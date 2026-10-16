# ScootMeal Customer App (Expo / React Native)

Dish-first food ordering app for customers, running on mock data until the backend is connected.

## Run

```bash
npm install
npm run web        # browser
npm start          # Expo Go on a phone
npm run android
```

The AI assistant calls the backend at `EXPO_PUBLIC_API_URL` (default `http://localhost:3001`). On a real phone set it to your PC's LAN IP.

## Structure

```
App.tsx, index.ts          Expo entry
src/
  navigation/              RootNavigator, MainTabs
  modules/
    auth/                  login, signup, AuthContext
    discovery/             home, dish detail, DishCard (search, browse, reviews later)
    ordering/              cart, checkout, orders, order tracking, CartContext
    dine-in/               reservations, pre-order, food-ready pop-up (to build)
    delivery/              live tracking screens, delivery provider API
    payment/               Stripe, vouchers (to build)
    loyalty/               points and vouchers
    ai-assistant/          chat screen
    account/               profile
  shared/                  components, theme, mock data, config
```

Put new work in the module it belongs to. Shared pieces used by several modules go in `shared/`.

## Next steps

- Replace `shared/data/mockData.ts` reads with backend API calls.
- Real auth (JWT) and Stripe payment in checkout.
- Dine-in: reservation with pre-order, "food ready" pop-up with phone buzz (FR-2.7, FR-3.x).
- Per-item Delivery / Dine-in mode in the cart (FR-2.3).

## Backend required
This app talks to the real backend. Start it first (`backend`, port 3001) and set `EXPO_PUBLIC_API_URL` to its address. Live updates use 2 s polling and server time for all countdowns. See `docs/RUNNING.md` for demo logins.
