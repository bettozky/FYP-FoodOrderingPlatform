# ScootMeal brand

**Mascot:** a nasi lemak parcel (banana-leaf pyramid) riding a Vespa-style scooter, with steam and speed lines.
It says what the app does in one picture: Malaysian food, delivered fast. Drawn for this project.

**Tagline:** *Sedap, sampai cepat!* ("Tasty, arrives fast!")

**Colours:** the same tokens as the apps (`apps/*/src/shared/theme/theme.ts`), so the logo matches every screen.

| Token | Hex | Used for |
|---|---|---|
| `turmeric` | `#F5A623` | customer app icon and splash background |
| `chili` | `#E8483A` | the scooter |
| `ink` | `#15130F` | outlines, wheels, merchant app background, "Scoot" in the wordmark |
| `herb` | `#2F6F4E` | the nasi lemak parcel (banana leaf) |
| `turmericLight` | `#FFC24D` | wheel hubs and headlight |
| `paper` | `#FFFFFF` | "Meal" in the wordmark, steam on dark backgrounds |

**Files**
- `scootmeal-logo.png` / `lockup-yellow.svg`: mascot + wordmark on turmeric (slides, README, reports)
- `scootmeal-logo-dark.png` / `lockup-dark.svg`: the same on ink (dark backgrounds)
- `scootmeal-icon.svg`: the square app icon
- App icons live in `apps/customer-app/assets` (turmeric) and `apps/merchant-app/assets` (ink).

The wordmark uses Plus Jakarta Sans ExtraBold (the app font), with Inter as the fallback.
