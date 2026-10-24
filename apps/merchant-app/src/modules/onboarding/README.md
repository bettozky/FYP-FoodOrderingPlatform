# onboarding (merchant)

Shop sign-up and approval status (FR-5.1). Owner: Nathan (screens). Server side: David.

- `screens/ShopSignupWizard.tsx` — the 8-step sign-up from the task plan, section 7 (Figma frames M02–M09). Shown from `MerchantLoginScreen` when "Create shop account" is chosen.
- `screens/PendingApprovalScreen.tsx` — shown until a web admin approves the shop.
- `signup/types.ts` — the form state and `toSignupRequest()`, which builds the request body.
- `signup/validate.ts` — checks for each step (Malaysian phone, SSM number, 24-hour times, JPG/PNG/PDF up to 2 MB, at least 3 dishes).
- `signup/steps.tsx`, `signup/fields.tsx` — the step screens and form pieces (theme.ts tokens only).
- `signup/pickFile*.ts` — choosing photos and documents (web works now; phones need one command, below).
- `signup/upload.ts` — sends the files after the account is created.

## Request body (for David)

`POST /api/auth/register-merchant`. The top-level fields are the ones the current route already reads, so sign-up works today without backend changes. The new answers are under `application`; until David stores them they are ignored.

| Step | Field in the request | Suggested table / column |
| --- | --- | --- |
| 1 Account | `ownerName`, `email`, `phone` (always `+60…`), `password` | users |
| 2 Business | `businessName`; `application.business.type` (`stall` / `cafe` / `restaurant` / `home_kitchen`), `.ssmNumber`, `.description` | merchants |
| 2 Business | `application.files.ssmCertificate` (`{ name, size, mimeType }`) | merchant_documents (private bucket `merchant-documents`) |
| 3 Location | `stallNo` (= address); `application.location.address`, `.landmark`, `.lat`, `.lng` | merchants |
| 4 Food | `cuisine` (comma list); `application.food.cuisines[]`, `.priceRange` (1–3), `.vegetarianOptions`, `.halal` | merchants |
| 4 Food | `application.files.halalCertificate` (only when halal) | merchant_documents |
| 5 Hours and service | `open`, `close` (first open day, for the old route); `application.service.hours[]` (`{ day: "mon"…"sun", open, close, closed }`) | merchant_hours |
| 5 Hours and service | `application.service.delivery`, `.pickup`, `.dineIn`, `.seats` (null unless dine-in), `.prepMinutes`, `.minOrder` (RM, 0 = none) | merchants |
| 6 Allergens and hygiene | `application.hygiene.allergens[]`, `.licenceNo` | merchants |
| 7 Pictures | `application.files.logo`, `.cover`; `application.menuItems[]` (`{ name, price, description, photo }`) | merchant_photos (bucket `shop-photos`), menu_items (bucket `menu-photos`) |
| 8 Review | `application.agreedTermsAt` (ISO time); `application.filesPending` (true = signed up on a phone without file choosing) | merchants |

We never ask for IC numbers or bank details (privacy, task plan section 7).

## File uploads (for David)

After the account is created, `upload.ts` sends each file with the new token:

```
POST /api/merchant/uploads   multipart/form-data   Authorization: Bearer <token>
kind  = ssm_certificate | halal_certificate | logo | cover | menu_photo
index = 0..n            (menu_photo only, matches application.menuItems[index])
file  = JPG / PNG / PDF, max 2 MB
reply = { url }
```

Until that route exists the server answers 404, the uploads are skipped, and sign-up still completes. Please confirm or change the path and field names in the group chat; only `UPLOAD_PATH` in `upload.ts` needs to change.

## Photos on phones (one command)

File choosing works in the web build now. On phones it needs two Expo packages. Adding them to `package.json` by hand would break `npm ci` for everyone, so run this from `apps/merchant-app` (it updates `package.json` and `package-lock.json` together):

```
npx expo install expo-image-picker expo-document-picker
```

Then, in `signup/pickFile.native.ts`, delete the stub, uncomment the real `pickFile`, and set `canPickFiles = true`. Until then phone sign-ups skip the uploads, the review step says the admin will ask for the files, and the request carries `filesPending: true`.
