# ScootMeal Merchant App (Expo / React Native)

App for restaurants and stalls: dashboard, orders, reservations, menu with dish photos, promotions, analytics, customer reviews, job posts with an applicants inbox, announcements and shop photos. It talks to the ScootMeal backend at `EXPO_PUBLIC_API_URL` (on a real phone use your PC's LAN IP).

## Run

```bash
npm install
npm run web        # browser
npm start          # Expo Go on a phone
npm run android
```

Demo login: `ahseng@scootmeal.test` / `merchant123`. New shops register in the app and wait for admin approval. A slide-out menu (the ☰ button on the dashboard, or swipe from the left edge) opens every page, with a red count for unread notifications and new applicants.

## Structure

```
App.tsx, index.ts          Expo entry
src/
  navigation/              RootNavigator, AppDrawer (slide-out menu)
  modules/
    auth/                  merchant login, forgot password, AuthContext
    onboarding/            shop sign-up (8 steps) and approval status
    dashboard/             store status, opening hours, rating, shortcuts
    orders/                incoming order pop-up (10 min), order queue, live data polling
    reservations/          reservations, 30-minute countdown, Call customer
    menu/                  menu management and dish photo upload
    promotions/            vouchers and deals
    analytics/             sales analytics
    jobs/                  job board, applicants inbox and applicant detail (CV, interview, hire)
    announcements/         notices for customers
    reviews/               customer reviews and replies
    shop/                  shop logo and banner photos
    notifications/         notifications page and pop-ups
    chat/, calls/          chat and in-app voice calls
  shared/                  api client, components (Avatar, PhotoField, SideDrawer), theme, util
```

Each module keeps its own screens (and `styles.ts` where a screen has large styles).

## Next steps

- Test photo upload, camera and CV opening on real phones against a live Supabase project.
