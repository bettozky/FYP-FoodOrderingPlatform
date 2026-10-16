# dine-in (customer)

Table reservation (venue categories, date, slot, party size), optional pre-order, Pay now / Pay later,
"Awaiting restaurant" status with a server-side 30-minute countdown, cancel / modify before the cut-off.

- `screens/ReservationsScreen.tsx` - venue browser + "My bookings"
- `screens/BookTableScreen.tsx` - booking form (also used to modify a booking)

The "Your food is ready" pop-up with phone buzz lives in `../notifications/GlobalPopups.tsx`.

Requirements: FR-2.7, FR-3.1 to FR-3.5.
