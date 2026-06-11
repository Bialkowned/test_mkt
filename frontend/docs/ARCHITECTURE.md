# PeerTestHub - Architecture

Junior-dev orientation doc, generated from the codebase. No secrets.

PeerTestHub is a two-sided marketplace: builders post testing jobs; testers claim them, submit feedback (bugs, UX issues, recorded sessions, screenshots, clips), and get paid.

## 1. Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS, React Router. Static build served via `serve -s dist`. |
| Backend | FastAPI, single file `backend/main.py` (~1970 lines), Uvicorn ASGI server. |
| Database | MongoDB, database `peertesthub` (via `MONGO_URI`), Motor async driver. |
| Auth | JWT access token (in-memory on client) + refresh token (httpOnly cookie); bcrypt password hashing. |
| Email | Resend (transactional email). |
| Payments | Stripe (Payment Intents, Stripe Connect tester payouts, webhooks). |
| Process | PM2 (frontend and backend). |
| Ingress | Cloudflare Tunnel to https://tester.bialkowned.com |

## 2. Topology

The public URL https://tester.bialkowned.com is fronted by a Cloudflare Tunnel that splits traffic: requests matching `^/api/.*` go to the backend on `localhost:5108`; everything else goes to the frontend static server on `localhost:5008`.

| Component | Port | PM2 process | How it runs |
|-----------|------|-------------|-------------|
| Backend | 5108 | `testmkt-backend` | `venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 5108` |
| Frontend | 5008 | `testmkt-frontend` | `npx serve -s dist -l 5008` (static build output) |

- Project root (server): `/home/user1/Production/3_community/8_Tester`
- PM2 config: `ecosystem.config.js`
- `frontend/public/serve.json` is copied into `dist/` at build time and sets security headers for the static server.

## 3. Roles

Two roles, chosen at registration and stored on the user document. Validated by the regex `^(builder|tester)$`.

- **builder** - posts projects and test jobs, funds them via Stripe, reviews tester submissions (approve / reject).
- **tester** - browses public jobs, claims or bids on them, submits feedback (bugs, UX issues, recordings, screenshots, clips), and receives payouts via Stripe Connect.

The role is embedded in the JWT payload (`sub` = email, `role` = role) and gates which API actions a user may perform.

## 4. Backend route groups (`backend/main.py`)

Single-file FastAPI app. Routes grouped by area:

**System**
- `GET /` - root
- `GET /health` - health check

**Auth** (`/api/auth/*`)
- `POST /register` - create user (builder or tester); sends a 6-digit email verification code
- `POST /login` - email + password; returns access token (JSON body) + refresh token (cookie)
- `POST /refresh` - rotate access token using the refresh cookie
- `POST /logout` - invalidate the refresh token
- `GET /me` - current user (password_hash stripped)
- `POST /verify-email-code` - confirm the code (checks match + expiry)
- `POST /resend-verification-code` - re-issue the code

**Dashboard**
- `GET /api/dashboard` - role-aware summary

**Projects** (`/api/projects*`)
- `POST /`, `GET /`, `GET /{project_id}`, `PUT /{project_id}`

**Pricing**
- `GET /api/pricing/service-types`

**Jobs** (`/api/jobs*`)
- `POST /api/jobs`, `POST /api/v2/jobs` - create job (v2 = role-scoped test plans)
- `GET /api/jobs` (mine), `GET /api/jobs/public` (marketplace), `GET /api/jobs/{job_id}`
- `POST /{job_id}/payment-intent`, `POST /{job_id}/confirm-payment` - Stripe funding
- `POST /{job_id}/claim` - tester claims a job
- `POST /{job_id}/bids`, `GET /{job_id}/bids` - bidding

**Bids** (`/api/bids*`)
- `GET /`, `GET /{bid_id}`
- `POST /{bid_id}/accept`, `/reject`, `/withdraw`, `/confirm-payment`

**Submissions** (`/api/submissions*`)
- `GET /`, `GET /{sub_id}`, `PUT /{sub_id}`
- `POST /{sub_id}/submit`, `/approve`, `/reject`
- `POST /{sub_id}/upload-video`, `/upload-screenshot`, `/upload-rrweb`
- `PUT /{sub_id}/session-timing`, `/video-tags`

**Testers / Profile**
- `GET /api/testers/{slug}` - public tester profile
- `PUT /api/profile`

**Stripe** (`/api/stripe/*`)
- `POST /connect/onboard`, `GET /connect/status` - tester payout onboarding
- `POST /webhook` - Stripe events
- `GET /config` - publishable key for the client

**Stats**
- `GET /api/stats`

## 5. Data model (MongoDB collections)

| Collection | Purpose |
|------------|---------|
| `users` | Accounts. Includes `email`, `password_hash` (bcrypt), `role` (builder/tester), `first_name`, `is_verified`, `email_verification_code` (+ expiry), profile/slug, Stripe customer/connect ids. |
| `projects` | A builder product/app under test. Indexed on `builder_email`. |
| `jobs` | Test jobs posted against a project. Indexed on `builder_email`. Holds service types, roles, pricing, payment status. |
| `bids` | Tester bids on jobs. Indexed on `tester_email` and `(job_id, tester_email)`. |
| `submissions` | Tester feedback / deliverables for a claimed job. Indexed on `tester_email` and `builder_email`. Holds bug reports, UX issues, uploaded video/screenshot/rrweb session, timings, tags. |
| `refresh_tokens` | Active refresh tokens (token, email, expiry) for rotation / logout invalidation. |

## 6. Authentication flow

1. **Register** (`POST /api/auth/register`): password hashed with bcrypt (`bcrypt.hashpw` + `bcrypt.gensalt`); a 6-digit verification code is generated and emailed via Resend. The account starts unverified.
2. **Verify email** (`POST /api/auth/verify-email-code`): the client submits the code; the server checks it matches and has not expired, marks the account verified, and clears the code fields. `resend-verification-code` re-issues if needed.
3. **Login** (`POST /api/auth/login`): looks up the user by `email`, verifies the password with `bcrypt.checkpw`. On success it issues:
   - **access token** - short-lived JWT (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 15), payload `sub`=email and `role`=role, returned in the JSON body (kept in memory client-side).
   - **refresh token** - long-lived (`REFRESH_TOKEN_EXPIRE_DAYS`, default 7), stored in `refresh_tokens` and set as an httpOnly cookie.
4. **Refresh** (`POST /api/auth/refresh`): exchanges the refresh cookie for a new access token.
5. **Logout** (`POST /api/auth/logout`): deletes the refresh token server-side.
6. `GET /api/auth/me` returns the current user with `password_hash` removed.

## 7. Integrations and configuration (env vars)

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection (db `peertesthub`). |
| `SECRET_KEY` | JWT signing secret. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Token lifetimes (15 / 7). |
| `BACKEND_PORT` | Default 5108. |
| `FRONTEND_URL` / `CORS_ORIGINS` | Allowed origins / link base. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email (verification, job claimed, submission, new bid, bid accepted/rejected, approval/rejection). |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments, Connect payouts, webhook verification. |
| `UPLOAD_DIR` | Local storage for uploaded videos/screenshots/rrweb sessions (default `./uploads`). |

Real values live in `.env` (not committed). See `.env.example` for placeholders.

## 8. Frontend page map (`frontend/src`)

Routing lives in `App.jsx` (React Router).

**Public**
- `/` - `Home.jsx`
- `/pricing` - `Pricing.jsx`
- `/testers/:slug` - `TesterProfile.jsx`
- `/login` - `Login.jsx`
- `/register` - `Register.jsx`
- `*` (unmatched) - `Onboarding.jsx`

**Authenticated (app)**
- `/dashboard` - `Dashboard.jsx`
- `/projects` - `Projects.jsx`
- `/jobs` - `Jobs.jsx` (marketplace / my jobs)
- `/jobs/create` - `CreateJob.jsx`
- `/jobs/:jobId` - `JobDetail.jsx` (bids, submissions, review)
- `/settings` - `Settings.jsx`

**Reusable pieces**
- `components/ScreenshotAnnotator.jsx` - annotate uploaded screenshots
- `components/RrwebReplayPlayer.jsx` - replay recorded sessions
- `hooks/useRrwebRecorder.js` - record tester sessions (rrweb)
- `api.js` - API client (token handling)

## 9. Design palette

The brand color is defined in `frontend/tailwind.config.js` as the `primary` scale (a blue family, `primary-500` = #3b82f6, full 50-900 ramp).

Conventions:
- **`primary-*`** - the brand color. Used for all primary actions, links, and accents, and across every public-facing page so the product reads as one cohesive brand.
- **`red-*`** - errors and destructive actions (reject, delete).
- **`amber-*`** - warnings and in-progress states.
- **`purple-*` / `indigo-*`** - kept ONLY inside admin/dashboard surfaces (Jobs, CreateJob, Dashboard, JobDetail, ScreenshotAnnotator) as categorical distinctions for service types and badges, where several distinct hues carry meaning. Not used on public pages.
- **`gray-*`** - text, borders, surfaces.

When adding UI, default to `primary-*` for brand accents; reach for the status colors only for their specific semantic meaning.
