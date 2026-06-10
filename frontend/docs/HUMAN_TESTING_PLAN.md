# PeerTest Hub (Tester) — Human Test Plan
_Last updated: 2026-06-04_

> This plan was rewritten from a direct read of the source. The app's repo folder is named `8_Tester` and several stale root docs call it "Tester" / "test scaffold," but the **real product is "PeerTest Hub"** — a two-sided peer-testing marketplace (FastAPI + MongoDB backend, React + Vite frontend). It is NOT a minimal scaffold; the backend is ~1,968 lines with full auth, jobs (v1 + v2), bidding, submissions, Stripe payments/Connect, and Resend email.

## 1. What You're Testing

**PeerTest Hub** — a marketplace where **builders** post test jobs for their apps and **testers** complete them for pay.

Two job models exist in code:
- **v1 "Quick Jobs"** (`POST /api/jobs`): flat payout, fixed number of tester slots. Testers *claim* a slot, submit feedback, builder reviews/approves. **Creating a v1 job charges the builder up front via Stripe.**
- **v2 "Structured Jobs"** (`POST /api/v2/jobs`): roles → items, each item has a service type (`test` / `record` / `document` / `voiceover`) and a proposed price. Testers *bid* (per_job / per_role / per_item). Builder accepts a bid (Stripe charge), tester works each item, builder reviews. **Creating a v2 job is free; payment happens only when a bid is accepted.**

Supporting features in code: email-code onboarding, dashboards with role-specific stats, public tester profiles + ratings, video/screenshot/rrweb session-recording uploads, Stripe Connect tester payouts, platform stats, a non-functional decorative "PeerTest Support" chat bubble.

Source of truth: `backend/main.py`, `frontend/src/App.jsx`, `frontend/src/pages/*`.

## 2. Environment & URLs

| Item | Value | Source |
|------|-------|--------|
| Frontend (local dev) | http://localhost:5008 | `frontend/vite.config.js`, `frontend/.env` (`VITE_DEV_PORT=5008`) |
| Frontend (pm2 / built) | http://localhost:5008 (`serve -s dist`) | `ecosystem.config.js` (app `testmkt-frontend`) |
| Backend API | http://localhost:5108 | `backend/.env` (`BACKEND_PORT=5108`), `ecosystem.config.js` |
| Health check | http://localhost:5108/health (returns `{status, timestamp, users, projects, jobs}`) | `backend/main.py` `@app.get("/health")` — note: **not** under `/api` |
| API root | http://localhost:5108/ → `{"message":"PeerTest Hub API",...}` | `backend/main.py` |
| API proxy | Frontend proxies `/api` and `/uploads` → `http://localhost:5108` | `frontend/vite.config.js` |
| Database | MongoDB, db `peertesthub` (`mongodb://localhost:27017/peertesthub`) | `backend/.env` (`MONGO_URI`) |
| Production host (config) | https://tester.bialkowned.com (CORS + FRONTEND_URL) | `backend/.env` |
| Payments | Stripe — **keys are EMPTY in `backend/.env`** (`STRIPE_SECRET_KEY=`) | `backend/.env` |
| Email | Resend — **`RESEND_API_KEY` is EMPTY**; emails are silently skipped | `backend/.env`, `send_email()` |

> ⚠️ Ignore the stale root docs (`README_CODE.md`, `GETTING_STARTED.md`, `QUICK_START.md`, `WHAT_HAPPENED.md`, `backend/README.md`): they variously claim "no code exists," "in-memory storage," and port **8000**. All three are wrong for the current code (MongoDB, port 5108).

## 3. Setup Before You Start

1. **MongoDB must be running** on `localhost:27017`. The backend connects on startup and creates indexes; with no DB the app will not function.
2. **Start the backend:**
   ```
   cd backend && source venv/bin/activate && uvicorn main:app --port 5108 --reload
   ```
   (or `pm2 start ecosystem.config.js` from repo root to run both the built frontend on 5008 and backend on 5108).
   - **Expected:** `GET http://localhost:5108/health` returns HTTP 200 with a JSON body containing `"status":"healthy"`.
3. **Start the frontend (dev):** `cd frontend && npm run dev` → http://localhost:5008.
4. **Decide your Stripe stance** (see §7). With empty Stripe keys you can still test: register/login, onboarding, dashboards, projects, **v2 job creation**, browsing, tester profiles, and submission *drafts*. You **cannot** complete: v1 job creation, bid acceptance, or any real payment/payout.
5. **Plan how you'll read verification codes.** Because Resend is not configured, the 6-digit email code is **never emailed and never printed**. You must read it from MongoDB:
   `db.users.findOne({email:"<your email>"}).email_verification_code`
   (Codes expire 10 minutes after issue; max 3 wrong attempts; resend throttled to once per 60s.)
6. **There is NO seed script** in this repo (none in `backend/`, no `seed*.py`, no npm seed). The "Dev Accounts" buttons on the login page (alice/bob@builder-demo.com, carol/dave/emma@tester-demo.com, password `TestPass123`) **only pre-fill the form** — they will FAIL to log in unless those users were created manually. Treat self-registration as the real path.

## 4. Test Credentials

| Role | Email | Password | Source |
|------|-------|----------|--------|
| Builder | _self-register, choose "Builder"_ | (you choose, min 8 chars) | `Register.jsx` / `POST /api/auth/register` |
| Tester | _self-register, choose "Tester"_ | (you choose, min 8 chars) | `Register.jsx` / `POST /api/auth/register` |
| Builder (dev, **unverified**) | alice@builder-demo.com / bob@builder-demo.com | TestPass123 | `Login.jsx` "Dev Accounts" — **NOT seeded; login fails unless manually created** |
| Tester (dev, **unverified**) | carol@tester-demo.com / dave@tester-demo.com / emma@tester-demo.com | TestPass123 | `Login.jsx` "Dev Accounts" — **NOT seeded; login fails unless manually created** |

> If you want the dev accounts to work, insert them into MongoDB manually with a bcrypt hash of `TestPass123`, `role` set correctly, and `email_verified:true` + `onboarding_completed:true` so they skip the verification gate.

## 5. User Journeys

### Journey 1 — Builder registration & onboarding (email-code gate)
1. Go to http://localhost:5008/register. **Expected:** split-panel "Create your account" form renders; role defaults to "Builder."
2. Pick **Builder**, fill first/last name, a unique email, password ≥8 chars, matching confirm; submit. **Expected:** account created, you are taken to `/dashboard` but immediately land on the **"Verify your email"** screen (App.jsx routes all paths to Onboarding while `onboarding_completed` is false).
3. Retrieve the code from MongoDB (`db.users.findOne({email:"..."}).email_verification_code`). **Expected:** a 6-digit numeric code is stored; no email arrives (Resend disabled).
4. Enter the 6 digits, click **Verify**. **Expected:** verification succeeds, `onboarding_completed` becomes true, and the full app (nav: Dashboard, Projects, My Jobs, Pricing) becomes accessible.
5. Enter a wrong code first to check guardrails. **Expected:** error "Invalid code. N attempt(s) remaining."; after 3 failures, HTTP 429 "Too many attempts."

### Journey 2 — Builder creates a project
1. As a verified builder, click **Projects** → "Create Project". **Expected:** project form appears.
2. Submit name (≥3 chars), description, hosted URL, category. **Expected:** project created (`POST /api/projects` → 201) and shown in the builder's project list.
3. As a tester, you would see only `status:"active"` projects; as a builder you see your own. **Expected:** project visible to its builder immediately.

### Journey 3 — Builder creates a **v2 Structured Job** (no Stripe needed)
1. Click **My Jobs** then go to the job-creation flow (`/jobs/create`, multi-step builder in `CreateJob.jsx`). **Expected:** step 1 (basics + assignment type: per_job / per_role / per_item) renders.
2. Pick a project, add a title, at least one role with at least one item (each item needs a service type and a proposed price > 0), set estimated minutes; submit. **Expected:** `POST /api/v2/jobs` returns 201 with `version:2`, `status:"open"`, computed `proposed_total`. **No payment is requested.**
3. Open **My Jobs**. **Expected:** the new v2 job appears with role/item/price-range badges.

### Journey 4 — Tester browses and bids on a v2 job
1. Register/verify a second account as **Tester**. **Expected:** tester nav shows "Available Jobs" and "Settings."
2. Open **Available Jobs**. **Expected:** open jobs from all builders are listed (`GET /api/jobs` for testers returns open/in_progress jobs); the v2 job from Journey 3 is visible.
3. Open the v2 job and submit a bid (`POST /api/jobs/{id}/bids`) with a price and message; for per_role/per_item jobs you must select the role/item scope. **Expected:** bid created with `status:"pending"`; `is_counter` is true if your price differs from the proposed price by >$0.01. A duplicate pending bid for the same scope is rejected with "You already have a pending bid for this scope."
4. (Tester) Withdraw the bid. **Expected:** `POST /api/bids/{id}/withdraw` sets status to "withdrawn" (only allowed while pending).

### Journey 5 — Builder reviews bids and accepts (Stripe required — see §7)
1. As the builder, open the v2 job's bids (`GET /api/jobs/{id}/bids`). **Expected:** all bids on the job are listed newest-first.
2. Click **Accept** on a bid. **Expected with Stripe configured:** `POST /api/bids/{id}/accept` creates a PaymentIntent, returns a `client_secret`, bid → "accepted" / `payment_status:"pending"`. **Expected with empty Stripe keys (default):** request fails (Stripe API error) — accepting is blocked.
3. (If Stripe configured) complete payment, then `POST /api/bids/{id}/confirm-payment`. **Expected:** payment marked paid, one draft submission per in-scope item is created, job → "in_progress," tester emailed (email skipped if Resend off).

### Journey 6 — Tester completes a v1 job by claiming (Stripe required to even create the job)
1. As a builder, create a **v1 Quick Job** from the **My Jobs** inline form (`Jobs.jsx`, `POST /api/jobs`). **Expected with empty Stripe keys (default):** creation FAILS — the endpoint creates a Stripe PaymentIntent immediately and a Stripe payment step opens in the UI. Record this as blocked unless Stripe test keys are set.
2. (If Stripe configured) pay, confirm; job → "open." As a tester, open it and **Claim** (`POST /api/jobs/{id}/claim`). **Expected:** a draft submission is created, you're added to `assigned_testers`, job → "in_progress."
3. As the tester, fill overall feedback + a usability score (1–5) on the submission and **Submit** (`POST /api/submissions/{id}/submit`). **Expected:** "test"-type submission requires feedback + score or it returns a 400 validation error; on success status → "submitted."
4. As the builder, **Approve** (`POST /api/submissions/{id}/approve`) with optional rating. **Expected:** status → "approved"; if the tester completed Stripe Connect onboarding and a payout exists, a transfer is attempted; once all submissions are resolved the job auto-completes.

### Journey 7 — Public tester profile & rating
1. After a builder approves a tester's submission **with a rating**, visit `/testers/{public_slug}` (slug is on the tester's user record). **Expected:** `GET /api/testers/{slug}` returns name, bio, specialties, average rating, completed-tests count, and up to 10 recent reviews. A profile with `profile_visible:false` returns 404.

### Journey 8 — Session & auth handling
1. Log in, then leave the tab idle past the 15-minute access-token expiry and trigger any API call. **Expected:** the axios interceptor silently calls `POST /api/auth/refresh` (httpOnly refresh cookie, 7-day) and retries; you stay logged in.
2. Click **Logout**. **Expected:** `POST /api/auth/logout` clears the refresh cookie; UI returns to logged-out nav.
3. While logged out, hit a protected route (e.g. `/dashboard`). **Expected:** redirect to `/login` (App.jsx route guards).
4. Click **Forgot?** on the login page. **Expected (KNOWN BUG):** it links to `/forgot-password`, which has **no route** — you get a blank/Onboarding fallback, not a reset flow. Password reset is NOT implemented.

## 6. Functional Coverage Checklist

| # | Area | What to verify | Endpoint / file |
|---|------|----------------|-----------------|
| 1 | Register | Builder & tester sign-up, password ≥8, confirm-match, duplicate-email 400 | `POST /api/auth/register`, `Register.jsx` |
| 2 | Email verify gate | Unverified user is trapped on Onboarding; correct code unlocks app; 3-attempt lockout; 60s resend throttle | `POST /api/auth/verify-email-code`, `resend-verification-code`, `App.jsx` |
| 3 | Login / Logout | Valid login, wrong-password 401, logout clears cookie | `POST /api/auth/login`, `/logout` |
| 4 | Token refresh | Silent refresh on 401, refresh-token rotation | `POST /api/auth/refresh`, `api.js` |
| 5 | Dashboard | Builder stats (projects/jobs/reviews/spend/pending bids) vs tester stats (claimed/completed/earnings/active bids) | `GET /api/dashboard`, `Dashboard.jsx` |
| 6 | Projects | Create / list / get / update; tester sees only active | `/api/projects*`, `Projects.jsx` |
| 7 | v1 job create | Charges Stripe up front (blocked w/o keys) | `POST /api/jobs`, `Jobs.jsx` |
| 8 | v2 job create | Free; status open; proposed_total computed | `POST /api/v2/jobs`, `CreateJob.jsx` |
| 9 | Job browse | Tester sees open jobs; `/api/jobs/public` & `/api/stats` are public | `GET /api/jobs`, `/api/jobs/public` |
| 10 | Claim (v1) | Slot limits, duplicate-claim guard, v2 rejected | `POST /api/jobs/{id}/claim` |
| 11 | Bids (v2) | Create/list/accept/reject/withdraw; scope validation; counter detection | `/api/jobs/{id}/bids`, `/api/bids/*` |
| 12 | Submissions | Draft update, per-service-type submit validation, approve/reject | `/api/submissions/*` |
| 13 | Uploads | Video (≤500MB), screenshot (≤10MB, png/jpeg/webp), rrweb (≤50MB), video tags | `/api/submissions/{id}/upload-*`, `/video-tags` |
| 14 | Tester profile | Public profile, ratings/reviews, visibility toggle | `GET /api/testers/{slug}`, `PUT /api/profile` |
| 15 | Stripe Connect | Tester onboarding link, status check | `/api/stripe/connect/onboard`, `/status`, `Settings.jsx` |
| 16 | Pricing | Service-type showcase / configurator | `GET /api/pricing/service-types`, `Pricing.jsx` |
| 17 | Health/stats | `/health` 200, `/api/stats` counts | `main.py` |
| 18 | Chat bubble | Decorative only — "Send" shows a fake success, sends nothing | `App.jsx` `ChatBubble` |

## 7. Known Limitations / Things That May Break

- **Stripe keys are empty by default** (`backend/.env`). With no keys: **v1 job creation, bid acceptance, payment confirmation, and Connect payouts all fail.** To exercise payments, set `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` (test mode `sk_test_…`/`pk_test_…`) in `backend/.env` and `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend/.env`, then use test card `4242 4242 4242 4242` (success) / `4000 0000 0000 0002` (decline). Untested until you do.
- **Email is disabled** (`RESEND_API_KEY` empty). All transactional emails (verification code, claim/bid/approval notices) are silently skipped. The only way to obtain a verification code is reading `email_verification_code` from MongoDB. **No live emails are sent in this default config.**
- **No seed script.** The login page's 5 "Dev Accounts" (TestPass123) are not created by anything; they will fail to log in unless manually inserted. Self-registration is the only reliable path.
- **`/forgot-password` is a dead link** — password reset/forgot is not implemented despite the link in `Login.jsx`. The previous test plan's "Forgot/Reset password flows" claim is false.
- **Email verification blocks the entire app**, including dashboards and jobs — you cannot test any authed feature until you verify, which (per above) requires DB access.
- **Stale/contradictory root docs.** `GETTING_STARTED.md`/`QUICK_START.md`/`WHAT_HAPPENED.md` say the code doesn't exist; `README_CODE.md`/`backend/README.md` describe in-memory storage and port 8000. Ignore them — real code is MongoDB-backed on ports 5108/5008.
- **`/health` is at root, not `/api/health`.** Any monitor pointed at `/api/health` will 404.
- **pm2 frontend serves the prebuilt `dist/`** (`serve -s dist -l 5008`) — if you change frontend source, rebuild (`npm run build`) or use `npm run dev`, or pm2 will keep serving stale assets.
- The decorative **chat bubble** ("PeerTest Support") sends nothing and always shows a fake "Message sent!" — not a real support channel.

## 8. Sign-off

| Tester | Date | Journeys passed | Issues found | Overall |
|--------|------|-----------------|--------------|---------|
|        |      |                 |              | ☐ Pass ☐ Fail |
|        |      |                 |              | ☐ Pass ☐ Fail |
