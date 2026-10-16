# Backend

Node.js + TypeScript + Express API for ScootMeal, organised into modules.

```bash
cp .env.example .env     # then add OPENAI_API_KEY
npm install
npm run dev              # http://localhost:3001  (tsx watch)
npm run typecheck
npm run build && npm start
```

## Structure

```
src/
  app.ts                 Express app; mounts one router per module
  server.ts              starts the server
  config/                env settings
  middleware/            auth, errors, rate limiting
  modules/
    ai-assistant/        POST /api/ai/chat (built)
    auth/ merchants/ ordering/ dine-in/ payment/
    delivery/ notifications/ admin/    (folders with notes, not built yet)
  jobs/                  timers for order and reservation deadlines
tests/
```

Each module follows the same shape: `<name>.routes.ts` (URLs), `<name>.service.ts` (business rules), `<name>.repository.ts` (database queries), `<name>.schema.ts` (validation), `<name>.test.ts`.

To add a module, create its router and mount it in `src/app.ts`.

## Notes

- The AI endpoint has no login or rate limit yet. Add both before exposing it publicly.
- `AI_MODEL` can be set in `.env` (default is the model name the project already used).

## Order, reservation and delivery flows
Implemented in `src/modules/{ordering,dine-in,delivery}`; a 1 s sweeper (`src/jobs/deadlines.ts`) expires unanswered orders (10 min) and reservations (30 min), auto-refunds, advances delivery stages and sends reservation reminders. Run `node tests/smoke.mjs` against a running server. Coverage: `docs/requirements/REQUIREMENT_COVERAGE.md`.
