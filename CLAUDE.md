# PeerTest Hub — Project Context

## What This Is

A peer-testing marketplace. Builders post test jobs for their apps, testers complete them and get paid. Two job models exist:

- **v1 (Quick Jobs):** Flat payout, testers claim slots, submit feedback, builder reviews.
- **v2 (Structured Jobs):** Roles + items + service types (test/record/document/voiceover). Testers bid on scopes (per_job/per_role/per_item). Builder accepts bid, pays, tester works per-item.

## Architecture

- **Backend:** Single `backend/main.py` — all endpoints, models, auth, email templates. FastAPI + Motor (async MongoDB). No separate route/model files.
- **Frontend:** React + Vite + Tailwind. Pages are flat (content in the page file, not split into components). `frontend/src/api.js` handles axios interceptor and token refresh.
- **Auth:** JWT access tokens (in-memory, 15min) + refresh tokens (httpOnly cookie, 7 days). GitHub OAuth for tester onboarding.
- **Payments:** Stripe PaymentIntents for job/bid payments. Stripe Connect for tester payouts on approval.
- **Email:** Resend for all transactional notifications.

## Key Patterns

- `doc_to_dict()` converts MongoDB documents (`_id` → `id`, datetime handling)
- v2 jobs detected by `job.version === 2` or `job.roles` (frontend) / `job.get("version") == 2` (backend)
- Bids collection: `bids_col = db.bids`. Bid lifecycle: pending → accepted/rejected/withdrawn
- Service types: `test`, `record`, `document`, `voiceover` — each has different submission validation
- Platform fee: 15% on top of payout/bid price
- All API responses use FastAPI's default JSON (not the wrapped `{data, error, message}` format from global CLAUDE.md — this project predates that convention)

## Running Locally

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn main:app --port 5108 --reload

# Frontend
cd frontend && npm run dev   # port 5008, proxies /api to backend
```

## Important Files

- `backend/main.py` — entire backend (~1900 lines)
- `frontend/src/App.jsx` — router, nav, auth state
- `frontend/src/api.js` — axios config, token refresh
- `frontend/src/pages/JobDetail.jsx` — most complex page (v1 + v2 flows, bids, submissions)
- `frontend/src/pages/CreateJob.jsx` — multi-step v2 job builder
- `frontend/src/pages/Pricing.jsx` — service showcase + interactive configurator
