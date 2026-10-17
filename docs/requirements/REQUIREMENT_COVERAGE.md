# Requirement coverage (apps vs. ScootMeal requirements)

Status: **Done** = implemented against the real backend and covered by `backend/tests/smoke.mjs` and/or the browser e2e. **Simulated** = behaviour is real, the third party is stubbed.

| ID | Requirement | Where | Status |
|---|---|---|---|
| FR-1.1 | Login required, no guest | customer `AuthScreen`, backend `auth` | Done |
| FR-1.2 | Date of birth, age block (18+) | `AuthScreen`, `auth.routes` (`MIN_AGE`) | Done |
| FR-1.3-1.6 | Search, dietary + dry/wet filters, distance, open/closed | `HomeScreen`, `merchants.routes` | Done |
| FR-2.2/2.3 | Per-item mode (delivery / dine-in / takeaway) in one payment | `DishDetailScreen`, `CartScreen`, `placeOrder` | Done |
| FR-2.4 | Payment (after merchant confirms) | `payOrder`, `OrderTrackingScreen` pay panel | Simulated Stripe (4242… ok, …0002 declined) |
| Change request | Live chat + in-app call customer <-> merchant | `modules/chat`, `modules/calls`, `ChatPanel`, `CallContext` | Done (WebRTC, polling signalling) |
| FR-2.5 | Out-of-stock: partial continue or cancel, auto refund | `markOutOfStock`, `GlobalPopups` | Done |
| FR-2.7 | Food-ready pop-up with vibration until confirmed | `GlobalPopups` | Done (vibration on native only) |
| FR-2.8 | Item reviews | `OrderTrackingScreen`, `reviewItem` | Done |
| FR-2.9 | Vouchers | `CheckoutScreen`, `merchants.routes` | Done |
| FR-3.x | Reservations, pre-order, Pay Now/Later, Awaiting restaurant, cancel/modify, reminder | `BookTableScreen`, `ReservationsScreen`, `reservations.service` | Done |
| FR-4.1 | Jobs | `JobsScreen` (both apps) | Done |
| FR-4.2 | AI assistant | `AIScreen` (live context) + backend | Needs `OPENAI_API_KEY` |
| FR-5.1 | Merchant onboarding with admin approval | `MerchantLoginScreen`, `PendingApprovalScreen`, `admin.routes` | Done |
| FR-5.5 | 10-minute order request pop-up with alert sound (before payment) | `PopupHost`, `deadlines.ts` | Done (sound needs a user gesture on web) |
| FR-5.6 | Mark item out of stock | Orders screen, Menu | Done |
| FR-5.7 | Ready / handover | Order queue | Done |
| FR-5.8 | 30-minute reservation pop-up, table assign | `PopupHost` | Done |
| FR-5.9 | Call customer | reservation popup | Done (in-app call + chat) |
| FR-5.10 | Separate pre-order approval | Reservations screen | Done |
| FR-5.11 | Vouchers | Vouchers screen | Done |
| FR-5.12 | Analytics | Analytics screen | Done |
| FR-5.13 | Jobs | Jobs screen | Done |
| FR-6.x | Web admin | `apps/web-admin` | Backend endpoints done; page wiring partial |
| FR-7.x | Delivery | `delivery.service` | Simulated stages |
| NFR-2 | Server-side timers | `jobs/deadlines.ts` (1 s sweeper) | Done |

## Assumptions
Minimum age 18; RM5 booking deposit (Pay Now = deposit + pre-order); one merchant per cart; 2 s polling instead of WebSocket/push; stock decrements on accept; data is in memory and resets on restart (`POST /api/dev/reset`).
