# middleware

- `auth.ts`: login check and role check (`auth("merchant")`), plus `approvedMerchant()` for shops an admin has approved.
- `rateLimit.ts`: per-IP request limit, used on login/sign-up and the AI assistant.
- `persist.ts`: saves data to the database soon after any request that changes it.
- Error handling lives in `../lib/http.ts` (`HttpError`, `errorHandler`).
