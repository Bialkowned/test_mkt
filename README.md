# PeerTest Hub

A peer-testing marketplace where builders post structured test jobs and testers earn money providing feedback, bug reports, screen recordings, and documentation.

## What's Built

**Backend** — FastAPI (Python 3.10+) with Motor async MongoDB driver

- JWT auth with httpOnly refresh tokens and in-memory access tokens
- GitHub OAuth for tester onboarding
- Stripe Payments — builders pay on job creation (v1) or bid acceptance (v2)
- Stripe Connect — testers receive payouts on submission approval
- Resend transactional emails (job claimed, submission received, approved/rejected, bid notifications)
- Two job models:
  - **v1 (Quick Jobs):** flat payout, testers claim slots, builder reviews
  - **v2 (Structured Jobs):** roles + items + service types, bid/counter-bid pricing, per-item submissions
- Service types: test, record, document, voiceover — each with different submission requirements
- Video upload support for screen recordings

**Frontend** — React 18 + Vite + Tailwind CSS

- Pages: Home, Login, Register, Onboarding, Dashboard, Projects, Jobs, CreateJob, JobDetail, Settings, Pricing, TesterProfile, GitHubCallback
- Role-based views (builder vs tester) throughout
- Stripe Elements integration for payments
- Structured job builder (multi-step form with roles, items, service types)
- Interactive pricing page with test plan configurator
- Bid management UI (submit, review, accept, reject, counter-offer)
- Per-item submission forms by service type

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Pydantic, Motor |
| Database | MongoDB (async via Motor) |
| Auth | JWT (access + refresh tokens), bcrypt, GitHub OAuth |
| Payments | Stripe (PaymentIntents + Connect) |
| Email | Resend |
| Video | File uploads to local storage |

## Project Structure

```
test_mkt/
├── backend/
│   ├── main.py              # All API endpoints, models, auth, email templates
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/             # Video upload storage (gitignored)
├── frontend/
│   ├── src/
│   │   ├── api.js           # Axios interceptor + token refresh
│   │   ├── App.jsx          # Router, nav, auth state
│   │   └── pages/
│   │       ├── Home.jsx         # Public landing + job board
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Onboarding.jsx   # Post-signup flow (GitHub, Stripe Connect)
│   │       ├── Dashboard.jsx    # Role-based stats
│   │       ├── Projects.jsx     # Builder project management
│   │       ├── Jobs.jsx         # Job list (builder + tester views)
│   │       ├── CreateJob.jsx    # Multi-step v2 job builder
│   │       ├── JobDetail.jsx    # Full job view, submissions, bids
│   │       ├── Settings.jsx     # Stripe Connect setup
│   │       ├── Pricing.jsx      # Service showcase + configurator
│   │       ├── TesterProfile.jsx
│   │       └── GitHubCallback.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── TODO.md
├── CLAUDE.md
└── README.md
```

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)
- Stripe account (test mode)
- Resend account
- GitHub OAuth app

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Fill in real values
uvicorn main:app --host 127.0.0.1 --port 5108 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # Runs on port 5008 with proxy to backend
```

### Environment Variables

See `backend/.env.example` for all required config:
- `MONGO_URI` — MongoDB connection string
- `SECRET_KEY` — JWT signing key
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_REDIRECT_URI`
- `FRONTEND_URL` — used in email links

Frontend uses `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`.

## Deployment

1. Build frontend: `cd frontend && npm run build`
2. Serve `frontend/dist/` via Nginx
3. Proxy `/api` requests to backend on port 5108
4. Run backend: `uvicorn main:app --host 127.0.0.1 --port 5108`
5. Use systemd or PM2 for process management

See `TODO.md` for the full production checklist.
