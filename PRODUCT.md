# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

One ScootMeal look across iOS, Android and web (Expo / React Native builds), designed first against iPhone conventions. The web admin is a browser tool for staff and follows ordinary web conventions.

## Users

- **Customers (primary):** diners in Malaysia ordering from local restaurants and food stalls. Students are the first audience, but the product is for any diner, on or off campus. Customers must be 18 or older and signed in; there is no guest mode. They order for pickup, dine-in, takeaway or delivery, and book tables.
- **Merchants:** restaurant and stall owners and staff, usually working a busy counter. They confirm or reject incoming orders against a 10-minute timer, mark items out of stock, mark orders ready, run reservations, menus, vouchers, jobs and announcements.
- **Platform admins:** operations staff approving merchant applications and moderating orders, reviews, vouchers, announcements and the watchlist from the web admin.

## Product Purpose

ScootMeal connects diners with restaurants and stalls so ordering is fast and nobody pays for food that can't be made. Built as a COS40005 Final Year Project for the client Quest Marketing (Mr. Felix Ling), supervised by Dr. Sim Kwan Hua. Success means a customer can find food, order, pay and collect with no surprises, and a merchant can handle orders on a busy counter without missing one.

## Positioning

**Confirm-then-pay.** The customer sends an order request with no payment. The merchant has 10 minutes to confirm or reject; the customer pays only after confirmation, within 10 minutes. Nothing is charged for a request that is rejected, unanswered, unpaid or cancelled, and out-of-stock items get a continue-or-cancel choice with automatic refunds. Customer and merchant can chat and call in-app before payment.

## Operating Context

- Customers order on their phones, often between other things (classes, work), and collect at the counter. Pickup is supported by a phone buzzer, "ready when you arrive" timing, and a canteen map.
- Merchants run the merchant app on a phone or tablet at the counter, with full-screen pop-ups, alert sounds and vibration for new requests and ready orders.
- Order lifecycle: awaiting_merchant → awaiting_payment → preparing → ready → completed, or cancelled.
- Mixed fulfilment per item (delivery, dine-in, takeaway) in one payment; one merchant per cart.

## Capabilities and Constraints

- **Customer:** search and filters (dietary, dry/wet, distance, open/closed), diet and allergy profile, allergen info on shops and dishes, cart and checkout with vouchers, order tracking, chat and voice calls, table reservations with pre-order and RM5 deposit, reviews, favourites, saved addresses, loyalty points, order again, spending tracker and weekly budget, jobs (apply with CV), announcements, notifications, AI assistant (menu, vouchers and own orders).
- **Merchant:** sign-up with admin approval, order queue, per-day opening hours, menu and photos, out-of-stock, busy mode / auto-pause, last-hour deals, prep forecast, reservations and table assignment, vouchers, analytics, reviews and replies, jobs and applicants inbox, announcements.
- **Simulated, not real:** payments (Stripe test cards only, no real money) and delivery riders/GPS (paused; Lalamove or PandaGo planned). Chat uses ~2 s polling; calls use WebRTC with STUN only.
- **Undecided:** POS entry and "Send to Kitchen" steps (awaiting the client); SMTP for password-reset email.
- **Terminology:** "order request" (before confirmation), "stall" / "shop" / "merchant", "pickup", "dine-in", "takeaway".
- **Team ownership:** each member owns specific module folders (see readme). Design changes outside Nathan's folders go through their owners.

## Brand Commitments

- Name: **ScootMeal**. Tagline: *Sedap, sampai cepat!* ("Tasty, arrives fast!").
- Mascot: a nasi lemak parcel in a banana leaf riding a Vespa-style scooter, with steam and speed lines. Malaysian food, delivered fast.
- Brand colour tokens are fixed in `docs/brand/README.md` and `apps/*/src/shared/theme/theme.ts`: turmeric `#F5A623` (customer app icon and splash), chili `#E8483A`, ink `#15130F` (merchant app background), herb `#2F6F4E`, turmericLight `#FFC24D`, paper `#FFFFFF`.
- Wordmark: Plus Jakarta Sans ExtraBold (in the logo files only). App UI font: the platform's system font (SF Pro on iPhone, Roboto on Android), chosen in the Nov 2026 premium pass.
- Customer app identity is turmeric; merchant app identity is ink.

## Evidence on Hand

- Logo, lockups and icon: `docs/brand/` (`lockup-yellow.svg`, `lockup-dark.svg`, `scootmeal-icon.svg`, PNGs); app icons in `apps/*/assets`.
- Requirements v2 and coverage: `docs/requirements/`. Diagrams (architecture, order and reservation flows, user flow, ERD, order lifecycle): `docs/diagrams/`.
- Demo data and test accounts only. There are no real customers, testimonials, ratings, partner restaurants, usage figures or press. Do not invent them.

## Product Principles

1. **Never charge for food that can't be made.** Payment always follows merchant confirmation; every cancel path is visibly free or refunded.
2. **Time is visible.** Every countdown (merchant response, payment window, prep, pickup) is shown plainly to whoever it affects.
3. **The counter is busy.** Merchant screens must be readable and actionable at a glance, with alerts that can't be missed.
4. **Local, not generic.** Malaysian food, prices in RM, and the ScootMeal brand show up in the details.
5. **Honest prototype.** Simulated parts (payments, delivery) are never presented as real.

## Accessibility & Inclusion

- Diet and allergy needs are first-class: allergen information must stay accurate and visible where customers decide.
- Alerts rely on sound and vibration as well as visuals; sound needs a user gesture on web, and vibration works on native only.
