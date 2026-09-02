# Food Ordering Platform

Centralized food ordering platform connecting consumers, restaurants/merchants, and delivery riders — built as a Final Year Project for **Quest Marketing**.

The platform includes:
- **Consumer Ordering & Delivery Portal** — browsing, ordering, reservations, payments, loyalty rewards
- **Merchant & Restaurant Management Portal** — menu management, order handling, analytics
- **Food Discovery & Information Portal** — restaurant directory, crowdsourced reviews, F&B job board
- **Logistics & GPS Module** — live delivery tracking and rider assignment
- **AI Assistant** — multilingual (English, Malay, Mandarin) chatbot with speech-to-text and text-to-speech

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

> To be confirmed after client scoping meeting. Placeholder based on current plan:

| Layer | Technology |
|---|---|
| Frontend | *TBD (e.g. React / Next.js)* |
| Mobile | *TBD (e.g. Flutter / React Native)* |
| Backend | *TBD (e.g. Node.js / Django / FastAPI)* |
| Database | *TBD (e.g. PostgreSQL)* |
| Maps / GPS | *TBD (e.g. Google Maps / Mapbox)* |
| Payments | *TBD (sandbox/test mode)* |
| Speech-to-Text | *TBD (e.g. Whisper / Google Cloud STT)* |
| Text-to-Speech | *TBD (e.g. Google Cloud TTS / Azure TTS)* |
| LLM / Chatbot | *TBD* |

---

## Features

### Consumer Ordering & Delivery Portal
- Browse restaurants and menus
- Cart, checkout, mobile payments
- Order-ahead, dine-in, and takeaway
- Table reservations
- Vouchers and loyalty rewards
- Real-time order tracking

### Merchant & Restaurant Management Portal
- Menu management (CRUD)
- Order management dashboard
- Promotion and voucher tools
- Business analytics reporting
- F&B job board posting

### Food Discovery & Information Portal
- Restaurant directory with search and filters
- Crowdsourced reviews and ratings
- F&B job board browsing

### Logistics & GPS
- Live delivery tracking
- Rider assignment
- ETA calculation

### AI Assistant
- Multilingual chatbot (English, Malay, Mandarin)
- Speech-to-text input
- Text-to-speech output
- Order help, FAQs, and recommendations

---

## Repository Structure

```
FYP-FoodOrderingPlatform/
├── docs/                   # Proposal, design diagrams, wireframes, meeting notes
├── backend/                # Backend services/modules
│   ├── consumer-service/
│   ├── merchant-service/
│   ├── discovery-service/
│   ├── logistics-service/
│   └── ai-assistant-service/
├── frontend/                # Web and/or mobile frontend
├── database/                 # Schema and migrations
└── README.md
```

---

## Getting Started

> Setup instructions will be added once the tech stack is finalized.

```bash
git clone https://github.com/bettozky/FYP-FoodOrderingPlatform.git
cd FYP-FoodOrderingPlatform
```

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

## Documentation

- `docs/design/` — ER diagrams, architecture diagrams, wireframes
- `docs/meeting-notes/` — Client and supervisor meeting notes
