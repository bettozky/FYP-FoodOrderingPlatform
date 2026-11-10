# ScootMeal Customer App (Expo / React Native)

Dish-first food ordering app for customers. It talks to the ScootMeal backend (orders, reservations, reviews, jobs, announcements, favourites, addresses and loyalty are all saved there).

## Run

```bash
npm install
npm run web        # browser
npm start          # Expo Go on a phone
npm run android
```

The app calls the backend at `EXPO_PUBLIC_API_URL` (default `http://localhost:3001`). On a real phone set it to your PC's LAN IP, for example in `.env`: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3001`.

Demo login: `demo@scootmeal.test` / `demo123`. A slide-out menu (the ☰ button on Home, or swipe from the left edge) opens Jobs, Announcements, notifications, favourites, reviews and your profile.

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

- Test every screen on real phones against a live Supabase project.
- Real payment (Stripe) and delivery tracking once the client confirms the providers.
