# ScootMeal - Food Ordering Platform

Centralized food ordering platform connecting consumers, restaurants/merchants, and delivery riders, built as a Final Year Project for **Quest Marketing**.

It is made of three applications that share one backend:

| Application | Folder | Used by |
|---|---|---|
| Customer App (Expo / React Native) | `apps/customer-app` | Customers (iOS + Android) |
| Merchant App (Expo / React Native) | `apps/merchant-app` | Restaurants and stalls (iOS + Android) |
| Web Admin (React + Vite) | `apps/web-admin` | Platform administrators (browser) |
| Backend API (Node.js + TypeScript + Express) | `backend` | All three apps |

---

## Client & Supervisor

| Role | Name |
|---|---|
| Client | Mr. Felix Ling, Quest Marketing |
| Supervisor | Dr. Sim Kwan Hua |

---

## Team

| Member | Module |
|---|---|
| Nathan | Consumer Ordering & Delivery Portal |
| David | Merchant & Restaurant Management Portal |
| Michael | Food Discovery & Information Portal (incl. Job Board) |
| Badrul | Logistics & GPS |
| Harris | AI Assistant (Speech-to-Text, Text-to-Speech, LLM) |


---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile apps | Expo / React Native, TypeScript |
| Web admin | React + Vite, TypeScript |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (planned) |
| Maps / GPS | react-native-maps (OpenStreetMap tiles) |
| Payments | Stripe, test mode (planned) |
| Delivery | Simulated rider provider now; Lalamove planned |
| LLM / Chatbot | OpenAI, called from the backend |
| Speech-to-Text / Text-to-Speech | TBD |

---

## Repository Structure

Each app and the backend are split into **modules** (one folder per feature area), so teammates can work in different folders without clashing.

```
FYP-FoodOrderingPlatform/
├── apps/
│   ├── customer-app/            Expo app for customers
│   │   └── src/
│   │       ├── navigation/      root navigator + home tabs
│   │       ├── modules/         auth, discovery, ordering, dine-in, delivery,
│   │       │                    payment, loyalty, ai-assistant, account
│   │       └── shared/          components, theme, mock data, config
│   ├── merchant-app/            Expo app for merchants
│   │   └── src/
│   │       ├── navigation/
│   │       ├── modules/         auth, onboarding, dashboard, orders, reservations,
│   │       │                    menu, promotions, analytics, jobs
│   │       └── shared/
│   └── web-admin/               React + Vite admin dashboard
│       └── src/
│           ├── app/             routes and layout
│           ├── modules/         auth, dashboard, merchants, users, orders,
│           │                    disputes, moderation, analytics
│           └── shared/
├── backend/                     Node + TypeScript + Express API
│   ├── src/
│   │   ├── app.ts, server.ts
│   │   ├── config/              environment settings
│   │   ├── middleware/          auth, error handling, rate limiting
│   │   ├── modules/             auth, merchants, ordering, dine-in, payment,
│   │   │                        delivery, notifications, ai-assistant, admin
│   │   └── jobs/                timers (order and reservation deadlines)
│   └── tests/
├── database/                    migrations and seed data
└── docs/                        requirements, diagrams, planning, meeting notes, admin forms
```

Modules named the same across the apps and backend belong together. For example, ordering lives in `apps/customer-app/src/modules/ordering` and `backend/src/modules/ordering`.

---

## Getting Started

Each folder is installed and run on its own.

```bash
git clone https://github.com/bettozky/FYP-FoodOrderingPlatform.git
cd FYP-FoodOrderingPlatform
```

**Backend** (needs a `.env`; copy `backend/.env.example`)
```bash
cd backend
npm install
npm run dev          # http://localhost:3001
```

**Customer App**
```bash
cd apps/customer-app
npm install
npm run web          # fastest check, or: npm start (Expo Go), npm run android
```
To reach the backend from a real phone, use your PC's LAN IP instead of localhost:
`EXPO_PUBLIC_API_URL=http://192.168.x.x:3001 npm start`

**Merchant App**
```bash
cd apps/merchant-app
npm install
npm run web
```

**Web Admin**
```bash
cd apps/web-admin
npm install
npm run dev
```

Both mobile apps accept any email and password for now (no real auth yet).

---

## Branching Strategy

- `main` — stable, always working
- `dev` — integration branch; merge feature work here first
- `feature/<module>-<task>` — one branch per feature (e.g. `feature/consumer-checkout`)

Workflow:
```bash
git checkout dev
git pull
git checkout -b feature/your-task-name
# ...make changes...
git add .
git commit -m "Describe your change"
git push -u origin feature/your-task-name
```
Open a Pull Request into `dev` for review before merging.

---

---

## Project Status

- [x] Project brief reviewed
- [x] Repository initialized
- [ ] Client scoping meeting completed
- [ ] Project proposal submitted
- [ ] System design (ER diagram, architecture, wireframes)
- [ ] Core backend & database
- [ ] Portal development
- [ ] AI assistant integration
- [ ] Testing & final report

---

---

## Documentation

- `docs/requirements/` - requirements specification and module relationship diagram
- `docs/diagrams/` - architecture, flowcharts, user flow, ERD, module diagram (PNG)
- `docs/planning/` - FYP plan and team plan
- `docs/meeting-notes/` - client and supervisor meeting notes
- `docs/admin/` - claim forms and project agreement

---

## Running and requirement coverage
See [docs/RUNNING.md](docs/RUNNING.md) and [docs/requirements/REQUIREMENT_COVERAGE.md](docs/requirements/REQUIREMENT_COVERAGE.md).
