# PeerTest Hub (Tester) — Demo Recording Guide
_Last updated: 2026-06-04_

## 1. What This Demo Shows

A clean, end-to-end walkthrough of the **PeerTest Hub** marketplace loop — the half that works with zero external keys:

- A **Builder** self-registers, passes the 6-digit email-verification gate, and publishes a **v2 Structured Job** (roles → items → service types → proposed prices). v2 job creation is **free** (no Stripe charge).
- A **Tester** self-registers, passes the same gate, browses **Available Jobs**, opens the builder's job, and **places a bid**.
- The video ends with the builder seeing the incoming bid in the **Bid Review** panel.

What it deliberately does NOT show (see §5): v1 "Quick Jobs" creation and bid **acceptance/payment** — both require Stripe keys that are empty in this environment and will error on camera.

Stack (confirmed from repo): FastAPI + Motor/MongoDB backend on **5108**; React + Vite + Tailwind frontend on **5008** (proxies `/api` → 5108). Single-file backend `backend/main.py`; flat React pages in `frontend/src/pages/`.

---

## 2. Pre-Recording Setup

You will create **two real accounts** (one builder, one tester) and read their verification codes from MongoDB, because email (Resend) is disabled. There is **no seed script** and the login page's "Dev Accounts" buttons only pre-fill the form — they do **not** log in.

### A. Start services
```bash
# MongoDB must already be running on localhost:27017 (db: peertesthub)
cd /mnt/data/Production/3_community/8_Tester
pm2 start ecosystem.config.js
pm2 status            # expect testmkt-frontend + backend ONLINE
```
Or run dev processes directly:
```bash
# backend
cd backend && source venv/bin/activate && uvicorn main:app --port 5108 --reload
# frontend (separate shell)
cd frontend && npm run dev      # http://localhost:5008
```

### B. Health check (note the path — root, NOT /api)
```bash
curl -s http://127.0.0.1:5108/health
# expect HTTP 200 + {"status":"healthy", users, projects, jobs, timestamp}
```

### C. Pre-create BOTH accounts before you hit record
Do the full register → read-code → verify cycle for the builder, then the tester, **off camera**, so the on-camera take is smooth. (You can also record the register/verify steps live — your call — but having a known-good code in hand prevents lockouts: 3 wrong tries = HTTP 429.)

To read a verification code from Mongo (substitute the email you registered):
```bash
mongosh peertesthub --quiet --eval \
  'db.users.findOne({email:"builder.demo@example.com"},{email_verification_code:1,_id:0})'
# -> { email_verification_code: '482915' }
```
Codes expire 10 minutes after issue and resend is throttled to once / 60s — read the code immediately after registering, or re-trigger "Resend code" on the verify screen and re-read.

### D. Browser / recorder
- Fresh browser profile or incognito, **1920×1080**, 100% zoom, bookmarks bar hidden, OS notifications off.
- Use **two separate browser contexts** (e.g. one normal window for the builder, one incognito for the tester) so both stay logged in simultaneously and you can cut between them.
- Cursor highlighting on; deliberate movements; pause ~1s on each key screen for clean cuts.

---

## 3. Demo Credentials

**Self-register both accounts.** Passwords are your choice (min 8 chars). Verify each via the MongoDB code (email is off). The dev-account buttons below are listed only so you don't waste time on them — they will NOT log in.

| Role | Email (you create) | Password | Verify code source | Works? |
|------|--------------------|----------|--------------------|--------|
| Builder | builder.demo@example.com (self-register, pick **Builder**) | you choose, ≥8 | `db.users.findOne({email:…}).email_verification_code` | ✅ |
| Tester | tester.demo@example.com (self-register, pick **Tester**) | you choose, ≥8 | same query, tester's email | ✅ |
| Dev "Builder" | alice@builder-demo.com / bob@builder-demo.com | TestPass123 | — | ❌ not seeded — pre-fills form only |
| Dev "Tester" | carol@/dave@/emma@tester-demo.com | TestPass123 | — | ❌ not seeded — pre-fills form only |

Tip: use a real address you control or a `+tag` alias if you ever enable email; it's never sent in this config regardless.

---

## 4. Recording Flow

Routes are real and confirmed against `frontend/src/App.jsx`. Builder nav = Dashboard / Projects / My Jobs / Pricing. Tester nav = Dashboard / Available Jobs / Settings. Both "My Jobs" and "Available Jobs" point at `/jobs`.

### Scene 1 — Builder registers (~25s)
- **Action:** Go to `http://localhost:5008/register`. The split-panel "Create your account" form renders with role defaulting to **Builder**. Confirm **Builder** is selected ("Get my app tested"). Fill first/last name, the builder email, password ≥8, matching confirm. Click **Create account**.
- **Narration:** "Builders come to PeerTest Hub to get their apps tested. I'll sign up as a builder."
- **Expected:** Account created; the app immediately drops onto the **"Verify your email"** onboarding screen (every route is gated until `onboarding_completed` is true).

### Scene 2 — Builder passes the email-verification gate (~20s)
- **Action:** (Code already read from Mongo in §2C — or read it now via the mongosh command.) Type the 6 digits, click **Verify**.
- **Narration:** "Every account confirms a 6-digit code before the marketplace unlocks."
- **Expected:** Verification succeeds; full nav appears (**Dashboard, Projects, My Jobs, Pricing**); you land on `/dashboard` showing builder stats (projects / jobs / spend / pending bids).
- *(On camera, do NOT demonstrate a wrong code — 3 misses triggers a 429 lockout. See §5.)*

### Scene 3 — Builder creates a project (~25s)
- **Action:** Click **Projects** → **Create Project**. Enter a name (≥3 chars, e.g. "Acme Checkout App"), a short description, a hosted URL, pick a category. Submit.
- **Narration:** "First I register the app I want tested as a project."
- **Expected:** `POST /api/projects` → 201; the project appears in the builder's project list.

### Scene 4 — Builder publishes a v2 Structured Job — Step 1 Basics (~30s)
- **Action:** Click **My Jobs**, then start the create flow at **`/jobs/create`**. On **Step 1 (Basics)**: select the project from the dropdown, give the job a **Title** (e.g. "Full App Test Suite"), add a description, and choose an **assignment type** — pick **One tester per role** (`per_role`). Click **Next: Build Test Plan**.
- **Narration:** "I'll post a structured test job and let testers bid on it."
- **Expected:** Step indicator advances to **Test Plan**; Next was enabled only after project + title + assignment type were set.

### Scene 5 — Builder builds the Test Plan — Step 2 (~35s)
- **Action:** On **Step 2 (Test Plan)**: name the first role (e.g. "Admin"). It comes with one item — set the item title (e.g. "Checkout Flow"), a short "what to do" description, leave/choose **service type = Test**, set **estimated hours** (e.g. 0.5) and a **proposed price** (e.g. $25). Optionally **Add Item** or **Add Role**. Click **Next: Review**.
- **Narration:** "Each role holds testable items — test, record, document, or voiceover — each with my proposed price."
- **Expected:** Running **proposed total** and total hours update live; Next: Review enabled once every role has a name and every item has a title, price > 0, and hours > 0.

### Scene 6 — Builder reviews & publishes — Step 3 (~20s)
- **Action:** On **Step 3 (Review)**, confirm the roles/items/prices summary, then click **Publish Job**.
- **Narration:** "Publishing a structured job is free — builders only pay when they accept a bid."
- **Expected:** `POST /api/v2/jobs` → 201 (`version:2`, `status:"open"`, computed `proposed_total`). **No payment screen appears.** You return to **My Jobs** and the job shows role/item/price badges.

### Scene 7 — Tester registers & verifies (~30s)
- **Action:** Switch to the second browser context. Go to `/register`, choose **Tester** ("Test apps & earn"), fill name/email/password, **Create account**. On the verify screen, enter the **tester's** 6-digit code (from Mongo, §2C) and **Verify**.
- **Narration:** "Now the other side of the market — a tester signs up."
- **Expected:** App unlocks; tester nav shows **Dashboard, Available Jobs, Settings**; lands on tester dashboard (claimed / completed / earnings / active bids).

### Scene 8 — Tester browses Available Jobs (~20s)
- **Action:** Click **Available Jobs** (`/jobs`). The open jobs from all builders list; locate the v2 job published in Scene 6 and open it (`/jobs/{id}`).
- **Narration:** "Testers browse open jobs across every builder."
- **Expected:** `GET /api/jobs` (tester view) returns open/in_progress jobs; the new job is visible with its roles and price ranges.

### Scene 9 — Tester places a bid (~30s)
- **Action:** On the job detail, in the **Tester Bid Interface**: for the `per_role` job, choose the role scope, click **Place Bid**, enter a **bid price** (match or undercut the proposed price), type a short message ("Why should the builder pick you?"), then **Submit Bid**.
- **Narration:** "The tester bids on a role, with a price and a pitch."
- **Expected:** `POST /api/jobs/{id}/bids` → bid created with `status:"pending"`; it shows under **Your Bids**. (`is_counter` flags if the price differs from proposed by >$0.01. A duplicate pending bid on the same scope is rejected.)

### Scene 10 — Builder sees the incoming bid (close) (~20s)
- **Action:** Switch back to the builder window, open **My Jobs** → the job → the **Bid Review** panel (`GET /api/jobs/{id}/bids`). Hover the new bid (price + message + tester) but **do not click Accept**.
- **Narration:** "And the builder instantly sees the bid land, ready to review and accept — closing the marketplace loop."
- **Expected:** The pending bid is listed newest-first with Accept/Reject controls. **End the recording here.** Do NOT click **Accept** — it calls Stripe and will error (see §5).
- **Close:** Optional cut to **Home** / logo for the outro.

---

## 5. Fragile Areas / Do NOT Show On Camera

- **Stripe keys are EMPTY** (`backend/.env STRIPE_SECRET_KEY=`). Therefore, never demo these — they fail live:
  - **Accepting a bid** (`POST /api/bids/{id}/accept`) — tries to create a PaymentIntent and errors. Stop Scene 10 at "review," do not accept.
  - **v1 "Quick Job" creation** (`POST /api/jobs` from the inline form in `Jobs.jsx`) — charges Stripe up front and opens a payment step that errors. **Demo v2 jobs only.**
  - Bid payment confirmation and Stripe Connect payouts — same reason.
- **Verification codes only come from the DB.** Resend is off (`RESEND_API_KEY` empty); no email is ever sent. Don't film waiting for an inbox. Read the code via `db.users.findOne({email:…}).email_verification_code`.
- **Don't film a wrong verification code.** 3 wrong attempts → HTTP 429 "Too many attempts," and resend is throttled to 60s. Pre-stage the correct code.
- **`/forgot-password` is a DEAD link** (rendered as "Forgot?" on the login page, no route exists). It falls through to a blank/Onboarding screen. Keep it off camera.
- **Health is at `/health`, NOT `/api/health`** — pointing a check at `/api/health` 404s. Use root `/health`.
- **Dev Account buttons don't log in** — they only pre-fill the form (accounts aren't seeded). Don't click them on camera expecting a login.
- **pm2 serves the prebuilt `dist/`** (`serve -s dist -l 5008`). If you edited frontend source, run `npm run build` or use `npm run dev`, or the recording shows stale UI.
- **Decorative "PeerTest Support" chat bubble** always shows a fake "Message sent!" and sends nothing — avoid implying it's real support.

---

## 6. Post-Recording Cleanup

```
□ Trim dead air at start/end; verify audio levels consistent
□ Export master .mp4 (H.264, 1920×1080); keep raw clips
□ File name: Tester_Marketplace_Demo_20260604.mp4
□ Store under frontend/docs/artifacts/demos/ (create if absent)
```
Optional environment teardown (so the next take starts clean):
```bash
# remove the two demo accounts + their data created during recording
mongosh peertesthub --quiet --eval '
  db.users.deleteMany({email:{$in:["builder.demo@example.com","tester.demo@example.com"]}});
  db.projects.deleteMany({}); db.jobs.deleteMany({}); db.bids.deleteMany({});'
pm2 stop ecosystem.config.js   # if you started via pm2
```
(Adjust the email list / collection scope to match exactly what you created; the broad `deleteMany({})` lines assume a throwaway demo DB.)
