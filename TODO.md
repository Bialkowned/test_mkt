# PeerTest Hub — Production Checklist

## Infrastructure
- [ ] MongoDB instance running (local or Atlas)
- [ ] Domain purchased and DNS configured
- [ ] SSL certificate (Let's Encrypt / Certbot)
- [ ] Nginx reverse proxy configured
  - Serve frontend build from `/var/www/peertesthub/` (or similar)
  - Proxy `/api` to `localhost:5108`
  - Force HTTPS redirect
- [ ] Systemd service for uvicorn backend
- [ ] Firewall — only expose ports 80/443 publicly, backend port internal only

## Backend
- [x] MongoDB integration (Motor async driver)
- [x] Auth — httpOnly refresh token cookies, short-lived access tokens
- [x] GitHub OAuth for tester onboarding
- [x] All config extracted to `.env`
- [x] CORS configured (production + localhost)
- [x] Password hashing via bcrypt
- [x] MongoDB indexes (users, jobs, submissions, bids)
- [x] Structured jobs v2 — roles, items, service types
- [x] Bid/counter-bid system with full lifecycle
- [ ] Rate limiting on auth endpoints (slowapi or similar)
- [ ] Request logging (structured JSON logs)
- [ ] HTTPS-only cookie flags verified in production

## Frontend
- [x] Access token in memory only (no localStorage)
- [x] Refresh token flow via httpOnly cookie
- [x] Axios interceptor for auto-refresh on 401
- [x] All hardcoded URLs removed — uses relative `/api` paths
- [x] Production build tested (`npm run build`)
- [x] Multi-step structured job builder (CreateJob.jsx)
- [x] Bid management UI (submit, review, accept/reject)
- [x] Per-item submission forms by service type
- [x] Interactive pricing page with test plan configurator

## Payments
- [x] Stripe account + Connect setup
- [x] v1: Builder pays on job creation → funds held
- [x] v2: Builder pays on bid acceptance → Stripe PI created
- [x] Release to tester on submission approval (Stripe Connect transfer)
- [x] Stripe webhook handler for async events (job + bid payments)
- [ ] Refund flow on rejection (manual for now)

## Email
- [x] Resend integration
- [x] Notification: job claimed (to builder)
- [x] Notification: submission received (to builder)
- [x] Notification: submission approved/rejected (to tester)
- [x] Notification: new bid received (to builder)
- [x] Notification: bid accepted (to tester)
- [x] Notification: bid rejected (to tester)
- [ ] Email verification on signup (currently skipped)

## Polish / Remaining
- [ ] Error boundary on frontend (global catch for React errors)
- [ ] Loading states for all async actions
- [ ] Mobile responsive audit across all pages
- [ ] Tester profile page — show completed jobs, ratings, bio
- [ ] Admin panel for dispute resolution
- [ ] Video upload to cloud storage (currently local filesystem)
- [ ] Screen recording integration (browser MediaRecorder API)

## Deployment Steps
1. SSH into server
2. Clone repo: `git clone git@github.com:Bialkowned/test_mkt.git`
3. Backend setup:
   ```
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env    # Edit with real values
   ```
4. Frontend build:
   ```
   cd frontend
   npm install
   npm run build           # Output in dist/
   ```
5. Copy `frontend/dist/` to nginx web root
6. Configure nginx (proxy `/api` to backend, serve SPA with try_files)
7. Start backend: `uvicorn main:app --host 127.0.0.1 --port 5108`
8. Enable systemd service for auto-restart
9. Test end-to-end:
   - Register builder + tester
   - Create project
   - Create v1 job → pay → tester claims → submits → builder approves
   - Create v2 structured job → tester bids → builder accepts → pays → tester submits per item → builder approves
