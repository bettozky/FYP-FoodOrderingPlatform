# ScootMeal Merchant App (Expo / React Native)

App for restaurants and stalls: dashboard, orders, reservations, menu, promotions, analytics and job posts. Runs on mock data until the backend is connected.

## Run

```bash
npm install
npm run web        # browser
npm start          # Expo Go on a phone
npm run android
```

Sign in with any email and password for now.

## Structure

```
App.tsx, index.ts          Expo entry
src/
  navigation/              RootNavigator
  modules/
    auth/                  merchant login, AuthContext
    onboarding/            registration and approval status (to build)
    dashboard/             store status, shortcuts
    orders/                incoming order queue (10-minute pop-up to build)
    reservations/          reservations, 30-minute countdown, Call customer
    menu/                  menu management
    promotions/            vouchers and deals
    analytics/             sales analytics
    jobs/                  F&B job board
  shared/                  components, theme, mock data
```

Each module keeps its own screens (and `styles.ts` where a screen has large styles).

## Next steps

- Full-screen order pop-up with alert sound, Accept / Reject and a 10-minute countdown (FR-5.5).
- Dine-in "Ready to collect" action (FR-5.7).
- Backend connection and real auth.

## Backend required
This app talks to the real backend. Start it first (`backend`, port 3001) and set `EXPO_PUBLIC_API_URL` to its address. Live updates use 2 s polling and server time for all countdowns. See `docs/RUNNING.md` for demo logins.
