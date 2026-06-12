# PeerTest Hub - Demo Plan

A two-sided peer-testing marketplace where builders post funded test jobs and testers claim, bid, and submit feedback for pay.

**Built from:** HUMAN_TESTING_PLAN.md (2026-06-04) + ARCHITECTURE.md.

**Live URL:** https://tester.bialkowned.com

## Demo accounts

There is NO seed script and NO provisioned accounts in this repo. Self-register one account per role before the demo:

- **Builder:** go to `/register`, choose email + password (min 8 chars), select the **Builder** role.
- **Tester:** repeat at `/register` with a second email, select the **Tester** role.

Resend email is disabled by default, so the 6-digit verification code is never emailed. Read it from MongoDB to clear the verify gate:

```
db.users.findOne({email:"<your email>"}).email_verification_code
```

Codes expire 10 minutes after issue (max 3 wrong attempts; resend throttled to once per 60s).

The login page also shows 5 "Dev Accounts" buttons (alice/bob@builder-demo.com, carol/dave/emma@tester-demo.com, TestPass123). These only PRE-FILL the form and FAIL to authenticate unless manually inserted into MongoDB. Do not rely on them. Never present invented credentials.

## Demo flow (step-by-step)

### Step 1 - Builder registers and clears the verify gate
- **Who:** builder
- **Path:** `/register` -> select Builder, enter name/email/password (>=8 chars) -> redirected to `/dashboard` which traps you on the "Verify your email" screen. Read the code from MongoDB (`email_verification_code`), enter the 6 digits, click Verify.
- **Shows:** clean split-panel registration, role choice baked into the JWT, and the email-code gate that blocks the entire app until verified.

### Step 2 - Builder creates a project and a free v2 structured job
- **Who:** builder
- **Path:** `/projects` -> Create Project (name >=3 chars, description, hosted URL, category, `POST /api/projects`). Then `/jobs/create` -> multi-step `CreateJob.jsx`: pick the project, add a title, define at least one role with at least one item (each item has a service type - test/record/document/voiceover - and a proposed price > 0), set estimated minutes -> submit (`POST /api/v2/jobs`).
- **Shows:** the core builder value prop. v2 returns 201 with `version:2`, `status:"open"`, and a computed `proposed_total`. Creating a v2 job is FREE - no payment requested - so this works even with empty Stripe keys.

### Step 3 - Tester registers, browses the marketplace, and bids
- **Who:** tester
- **Path:** `/register` as Tester, verify via the DB code (same gate as Step 1). Open **Available Jobs** (`/jobs`, `GET /api/jobs` returns open/in_progress jobs across all builders) -> open the Step 2 job -> submit a bid (`POST /api/jobs/{id}/bids`) with price + message; for per_role/per_item jobs select the scope.
- **Shows:** the two-sided marketplace from the tester side. Bid is created `status:"pending"`, flagged `is_counter` when the price differs from the proposed price by >$0.01; duplicate pending bids for the same scope are rejected.

### Step 4 - Tester submits feedback with recordings
- **Who:** tester
- **Path:** open the claimed work in `/jobs/:jobId`. Fill overall feedback + a usability score (1-5), and attach deliverables: video clip (`upload-video`, <=500MB), screenshot annotated via `ScreenshotAnnotator` (`upload-screenshot`, <=10MB png/jpeg/webp), and a recorded rrweb session (`upload-rrweb`, <=50MB) captured by `useRrwebRecorder`.
- **Shows:** the richness of tester deliverables - bug reports, UX notes, screenshot annotation, and full session replay. Note: submission drafts and uploads work without Stripe; a "test"-type submission requires feedback + score or returns a 400.

### Step 5 - Builder reviews bids and submissions
- **Who:** builder
- **Path:** `/jobs/:jobId` -> review bids newest-first (`GET /api/jobs/{id}/bids`). **Accept** (`POST /api/bids/{id}/accept`) creates a Stripe PaymentIntent. **Honest note:** with the default empty Stripe keys, acceptance is BLOCKED (Stripe API error); with test keys set, accepting charges the builder, spawns one draft submission per in-scope item, and moves the job to in_progress. Builder then Approves/Rejects submissions (`POST /api/submissions/{id}/approve` or `/reject`) with an optional rating.
- **Shows:** the builder oversight surface - bid review, payment-gated acceptance, and approve/reject review of tester work, with auto-completion once all submissions resolve.

### Step 6 - Public tester profile and payout onboarding
- **Who:** tester (profile public to anyone)
- **Path:** visit `/testers/:slug` (`GET /api/testers/{slug}`) - works for any browser, no auth - to show name, bio, specialties, average rating, completed-tests count, and up to 10 recent reviews (a profile with `profile_visible:false` returns 404). Then in `/settings`, start Stripe Connect payout onboarding (`POST /api/stripe/connect/onboard`, `GET /api/stripe/connect/status`).
- **Shows:** the public reputation layer that markets each tester, plus the payout rail. There is no separate admin role - role-aware dashboards are the only oversight surface - so the demo ends on builder review/approval (Step 5) and tester payout onboarding. **Honest note:** Connect onboarding requires Stripe keys and is blocked in the default config.

## Talking points

- **Free to post, pay on acceptance.** The v2 structured-job model lets builders post detailed, role-and-item test plans at zero cost and only pay when they accept a bid - the entire post -> browse -> bid -> review loop demos end-to-end without touching Stripe.
- **Feedback is rich and verifiable.** Testers deliver more than text: annotated screenshots, video clips, and full rrweb session replays, all gated behind a real email-verification flow and role-scoped JWT permissions.
- **Honest config gaps.** Stripe keys are empty by default, so v1 job creation, bid acceptance, payment confirmation, and Connect payouts are blocked; Resend is off, so verification codes come from the DB; and `/forgot-password` is a known dead link (reset not implemented). Everything else demos live today.
