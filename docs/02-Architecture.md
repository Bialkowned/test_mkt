# System Architecture
## PeerTest Hub - Technical Architecture Document

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Implementation-Ready

---

## 1. High-Level Architecture Overview

### 1.1 Architecture Diagram (Text Description)

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         React + Vite Frontend (SPA)                      │  │
│  │  - Builder Dashboard  - Tester Dashboard  - Admin Panel  │  │
│  │  - Tailwind CSS (Design System)                          │  │
│  │  - State Management (Context API / Zustand)              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │ HTTPS / REST + WebSocket                │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│                       │      APPLICATION LAYER                  │
├───────────────────────┴─────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              FastAPI Backend (Python)                     │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Auth Service │  │ Job Service  │  │Payment Service│   │  │
│  │  │  - JWT       │  │  - CRUD      │  │ - Escrow      │   │  │
│  │  │  - RBAC      │  │  - Matching  │  │ - Stripe Int. │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │Submission Svc│  │Dispute Service│  │ Notification │   │  │
│  │  │ - Validation │  │ - Resolution  │  │  - Email     │   │  │
│  │  │ - Telemetry  │  │ - Admin Tools │  │  - In-app    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐                      │  │
│  │  │  AI Service  │  │File/CDN Proxy│                      │  │
│  │  │ - Templates  │  │ - Screenshots │                      │  │
│  │  │ - (V1: LLM)  │  │ - Storage     │                      │  │
│  │  └──────────────┘  └──────────────┘                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Background Workers (Celery / RQ)                  │  │
│  │  - Email sending  - Escrow auto-release  - AI processing │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└───────────────────────┬──────────────────┬──────────────────────┘
                        │                  │
┌───────────────────────┼──────────────────┼──────────────────────┐
│                       │   DATA LAYER     │                      │
├───────────────────────┴──────────────────┴──────────────────────┤
│                                                                  │
│  ┌───────────────────────────┐  ┌────────────────────────────┐ │
│  │      MongoDB (Primary)    │  │    Redis (Cache/Queue)     │ │
│  │  - users                  │  │  - Session cache           │ │
│  │  - projects               │  │  - Job queue (Celery)      │ │
│  │  - jobs                   │  │  - Rate limiting           │ │
│  │  - submissions            │  │                            │ │
│  │  - escrow_transactions    │  │                            │ │
│  │  - disputes               │  │                            │ │
│  └───────────────────────────┘  └────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────┐  ┌────────────────────────────┐ │
│  │     S3 / Object Storage   │  │   CDN (CloudFlare/AWS)     │ │
│  │  - Screenshots            │  │  - Static assets           │ │
│  │  - Annotated images       │  │  - Uploaded images         │ │
│  │  - (V1: Screen recordings)│  │                            │ │
│  └───────────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│                       │  EXTERNAL SERVICES                      │
├───────────────────────┴─────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Stripe    │  │   SendGrid   │  │ (V1: OpenAI) │         │
│  │ - Membership │  │ - Email      │  │ - AI rewrites│         │
│  │ - Escrow     │  │ - Notifs     │  │ - Summaries  │         │
│  │ - Connect    │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         (V1: GitHub API)                                  │  │
│  │  - OAuth  - Repo metadata  - Webhook triggers             │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Architecture Principles

1. **Separation of Concerns:** Clear boundaries between frontend, backend services, and data layer
2. **Stateless Backend:** API servers are stateless to enable horizontal scaling
3. **Event-Driven:** Background workers handle async tasks (emails, escrow auto-release)
4. **Security-First:** All sensitive data encrypted, JWT auth, RBAC enforced
5. **Scalability:** MongoDB + Redis + CDN enable horizontal scaling
6. **Fail-Safe:** Escrow auto-release protects testers; validation prevents bad submissions

---

## 2. Component Breakdown

### 2.1 Frontend (React + Vite + Tailwind)

#### Technology Stack
- **Framework:** React 18+ with Vite for fast builds
- **Routing:** React Router v6
- **State Management:** Context API (MVP) or Zustand (if complexity grows)
- **Styling:** Tailwind CSS with custom design tokens
- **HTTP Client:** Axios with interceptors for JWT
- **Real-time:** WebSocket (for notifications, optional in MVP)
- **Screenshot Annotation:** Fabric.js or Konva
- **Form Validation:** React Hook Form + Zod
- **Testing:** Vitest + React Testing Library

#### Key Modules
1. **Auth Module:** Login, register, email verification, password reset
2. **Builder Module:** Projects, jobs, inbox, budget dashboard
3. **Tester Module:** Job browse, test runner, submission form
4. **Admin Module:** Dispute resolution, platform metrics
5. **Shared Components:** Button, Card, Modal, Form inputs (design system)

#### Design System Enforcement
- **Tailwind Config:** Centralized theme (colors, spacing, typography)
- **CSS Variables:** `--color-primary`, `--color-secondary`, etc.
- **Component Library:** Reusable components with strict prop types
- **Linting:** ESLint with Tailwind plugin to enforce design tokens

### 2.2 Backend (FastAPI + Python)

#### Technology Stack
- **Framework:** FastAPI 0.100+
- **ORM/ODM:** Motor (async MongoDB driver) or Beanie (async ODM)
- **Auth:** python-jose (JWT), passlib (bcrypt)
- **Validation:** Pydantic models (built into FastAPI)
- **Background Tasks:** Celery with Redis broker (or RQ for simplicity)
- **Email:** SendGrid API or SMTP
- **Payment:** Stripe Python SDK
- **Testing:** pytest + pytest-asyncio

#### Service Architecture (Modular)

**1. Auth Service (`/api/auth`)**
- User registration (email/password)
- Email verification (send token, verify)
- Login (JWT issuance)
- Token refresh
- Password reset
- RBAC middleware (check role: Builder, Tester, Admin)

**2. User Service (`/api/users`)**
- Get user profile
- Update profile
- Get tester stats (earnings, ratings, completed jobs)
- Get builder stats (spending, active jobs)

**3. Project Service (`/api/projects`)**
- CRUD projects (builder only)
- Get project details
- Get project history (jobs, submissions)

**4. Job Service (`/api/jobs`)**
- Create job (builder only, requires active membership)
- Get job details
- List jobs (for builders: their jobs; for testers: available jobs)
- Filter/search jobs (testers)
- Accept job (tester, reserves escrow)
- Update job status (in-progress, completed, cancelled)

**5. Journey Service (embedded in Job)**
- Define user journeys (step-by-step tasks)
- Attach to jobs

**6. Submission Service (`/api/submissions`)**
- Submit feedback (tester only)
- Validate submission (minimum evidence requirements)
- Get submission details (builder or admin)
- List submissions (for builder: inbox; for tester: my submissions)
- Request clarification (builder)
- Approve submission (builder, releases escrow)
- Dispute submission (builder, within 24 hours)

**7. Escrow Service (`/api/escrow`)**
- Reserve funds (when tester accepts job)
- Release funds (on approval or auto-release)
- Refund (on dispute resolution)
- Get transaction history

**8. Dispute Service (`/api/disputes`)**
- File dispute (builder)
- Get dispute details (admin)
- List disputes (admin)
- Resolve dispute (admin: full payout / partial / refund)
- Flag user for fraud (admin)

**9. Notification Service (`/api/notifications`)**
- Send email (via SendGrid)
- In-app notifications (stored in DB, fetched by frontend)
- Mark notification as read

**10. AI Service (`/api/ai`) - MVP: Template-Based**
- Get standardized templates (list)
- Customize template for job
- (V1: AI rewrite user journeys, AI summarize submissions)

**11. File Service (`/api/files`)**
- Upload screenshot (presigned S3 URL or direct upload)
- Get file URL (from CDN)
- Delete file

**12. Telemetry Service (Internal)**
- Log page visits (URL, timestamp)
- Log journey completion (tester's self-reporting)
- Used for dispute evidence (not exposed to users directly)

**13. Payment Service (Internal)**
- Stripe membership subscription (create, cancel, update)
- Stripe Connect onboarding (for testers)
- Process payouts

**14. Qualification Service (`/api/qualification`)**
- Get qualification test questions
- Submit qualification test answers
- Calculate tester score

### 2.3 Background Workers (Celery + Redis)

#### Tasks
1. **Email Sending:** Async email dispatch (verification, notifications)
2. **Escrow Auto-Release:** Cron job runs every hour, auto-releases escrow after 72 hours
3. **Dispute Expiry:** Mark disputes as needing admin attention after 24 hours
4. **Telemetry Aggregation:** Summarize telemetry for dispute review
5. **(V1) AI Processing:** Call OpenAI API for journey rewrite / submission summary

#### Queue Setup
- **High Priority Queue:** Escrow operations, payments
- **Medium Priority Queue:** Notifications
- **Low Priority Queue:** AI processing, analytics

### 2.4 Database (MongoDB)

#### Why MongoDB?
- **Flexible schema:** Jobs and journeys have variable structure (different test types)
- **Embedded documents:** Journeys can be embedded in jobs (reduces joins)
- **Scalability:** Horizontal scaling via sharding
- **JSON-native:** Easy integration with FastAPI (Pydantic models map directly)

#### Collections (see Data Model doc for detailed schemas)
1. `users` - All users (builders, testers, admins)
2. `projects` - Builder projects
3. `jobs` - Test jobs (with embedded journeys)
4. `submissions` - Tester submissions (with feedback, screenshots)
5. `escrow_transactions` - Payment tracking
6. `disputes` - Dispute records
7. `ratings` - Tester/builder ratings
8. `notifications` - In-app notifications
9. `ai_test_templates` - Standardized test scripts
10. `telemetry` - Page visit logs (for disputes)
11. `qualification_tests` - Tester qualification test attempts

### 2.5 Storage (S3 + CDN)

#### S3 Buckets
1. **Screenshots:** `peertesthub-screenshots-prod`
   - Uploaded by testers during submission
   - Annotated images stored here
   - Lifecycle policy: delete after 90 days
2. **Static Assets:** `peertesthub-static-prod`
   - Frontend build files
   - Served via CDN

#### CDN (CloudFlare or AWS CloudFront)
- Caches static assets and uploaded images
- Reduces latency for global testers
- SSL termination

### 2.6 External Services

#### Stripe
- **Builder Membership:** Subscription product (monthly billing)
- **Escrow:** Payment intents with hold/capture
- **Tester Payouts:** Stripe Connect (Express accounts)

#### SendGrid
- **Transactional Emails:** Verification, password reset
- **Notification Emails:** New submission, payment released

#### (V1) OpenAI API
- **AI Rewrite:** Given user journeys, generate clearer tester instructions
- **AI Summarize:** Given multiple submissions, group themes and prioritize

#### (V1) GitHub API
- **OAuth:** Connect GitHub account
- **Repo Metadata:** Fetch README, commits, branches
- **Webhooks:** Trigger builds on new commits

---

## 3. Data Flow Diagrams

### 3.1 Builder Creates Test Job

```
Builder → Frontend → FastAPI → MongoDB
1. Builder fills job creation form (project, journeys, payout, deadline)
2. Frontend validates form (client-side)
3. Frontend sends POST /api/jobs with JWT token
4. FastAPI validates JWT, checks builder has active membership
5. FastAPI checks budget caps (weekly/monthly limits)
6. FastAPI creates job document in MongoDB (status: "draft")
7. Builder reviews and publishes job
8. FastAPI updates job status to "open"
9. Job appears in tester job browse
```

### 3.2 Tester Accepts Job & Completes Test

```
Tester → Frontend → FastAPI → MongoDB → Stripe → Background Worker
1. Tester browses jobs, clicks "Accept Job"
2. Frontend sends POST /api/jobs/{id}/accept with JWT token
3. FastAPI validates JWT, checks tester qualification score
4. FastAPI reserves escrow (Stripe payment intent hold)
5. FastAPI updates job status to "in-progress", creates escrow_transaction record
6. Tester accesses Test Runner (iframe or new tab)
7. Tester completes journeys, logs telemetry (client-side JS sends to /api/telemetry)
8. Tester fills submission form (feedback, screenshots, annotations)
9. Frontend uploads screenshots to S3 (presigned URL)
10. Frontend sends POST /api/submissions with form data
11. FastAPI validates submission (minimum evidence requirements)
12. FastAPI stores submission in MongoDB (status: "pending")
13. FastAPI sends notification to builder (background task)
14. Builder receives email + in-app notification
```

### 3.3 Builder Reviews & Approves Submission

```
Builder → Frontend → FastAPI → MongoDB → Stripe → Tester Notification
1. Builder views submission in inbox
2. Builder clicks "Approve"
3. Frontend sends POST /api/submissions/{id}/approve
4. FastAPI validates JWT, checks builder owns job
5. FastAPI updates submission status to "approved"
6. FastAPI captures Stripe payment intent (releases escrow)
7. FastAPI creates payout to tester (Stripe Connect transfer)
8. FastAPI sends notification to tester (background task)
9. Tester receives email + in-app notification
10. Tester sees earnings updated in dashboard
```

### 3.4 Escrow Auto-Release (No Builder Response)

```
Celery Worker (Cron Every Hour)
1. Worker queries submissions where:
   - status = "pending"
   - created_at > 72 hours ago
   - not disputed
2. For each submission:
   - Worker calls /api/submissions/{id}/auto-release (internal endpoint)
   - FastAPI updates submission status to "approved"
   - FastAPI captures Stripe payment intent
   - FastAPI creates payout to tester
   - FastAPI sends notification to builder (auto-released)
   - FastAPI sends notification to tester (payment released)
```

### 3.5 Dispute Resolution

```
Builder → Admin → FastAPI → MongoDB → Stripe
1. Builder clicks "Dispute" (within 24 hours of submission)
2. Frontend sends POST /api/disputes with reason
3. FastAPI creates dispute record (status: "open")
4. FastAPI notifies admin (email)
5. Admin views dispute in admin panel
6. Admin reviews submission, telemetry, both parties' claims
7. Admin decides: full payout, partial payout, or refund
8. Admin sends POST /api/disputes/{id}/resolve with decision
9. FastAPI updates dispute status to "resolved"
10. FastAPI executes payment action (capture full/partial, or refund)
11. FastAPI sends notifications to builder and tester
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

**Registration:**
1. User submits email + password
2. Backend hashes password (bcrypt, 10 rounds)
3. Backend generates email verification token (JWT, 24-hour expiry)
4. Backend sends verification email
5. User clicks link, backend verifies token, activates account

**Login:**
1. User submits email + password
2. Backend verifies password hash
3. Backend generates access token (JWT, 1-hour expiry) + refresh token (7-day expiry)
4. Frontend stores tokens (httpOnly cookies or localStorage with XSS protection)

**Token Refresh:**
1. Access token expires, frontend detects 401
2. Frontend sends refresh token to /api/auth/refresh
3. Backend validates refresh token, issues new access token
4. Frontend retries original request

### 4.2 Authorization (RBAC)

**Roles:**
- `builder` - Can create projects, jobs, review submissions
- `tester` - Can browse jobs, submit feedback
- `admin` - Can resolve disputes, view all platform data

**Middleware:**
- Each endpoint has `@requires_role(['builder'])` decorator
- Middleware checks JWT claims for user role
- Returns 403 if unauthorized

**Resource Ownership:**
- Builders can only access their own projects/jobs
- Testers can only submit for jobs they've accepted
- Admins can access all resources

### 4.3 Data Encryption

**At Rest:**
- Test account credentials: AES-256 encryption
- MongoDB encryption at rest (AWS EBS encryption or Atlas encryption)
- S3 server-side encryption (SSE-S3 or SSE-KMS)

**In Transit:**
- HTTPS only (TLS 1.2+)
- API calls: HTTPS
- Stripe API: HTTPS
- S3 uploads: HTTPS

**Secrets Management:**
- Environment variables (`.env` file in dev, secrets manager in prod)
- Never commit secrets to Git
- Rotate keys every 90 days

### 4.4 Rate Limiting

**API Endpoints:**
- Global: 100 requests/minute per user
- Login: 5 attempts/minute per IP (prevent brute force)
- File upload: 10 uploads/hour per user

**Implementation:**
- Redis-based rate limiting (track request counts)
- Return 429 Too Many Requests if exceeded

### 4.5 Input Validation

**All endpoints:**
- Pydantic models validate request body structure
- Reject invalid JSON
- Sanitize strings (prevent XSS, NoSQL injection)
- Validate file uploads (max size 10MB, allowed types: PNG, JPEG)

### 4.6 Telemetry Privacy

**What we log:**
- Page URLs visited (not including query params with sensitive data)
- Timestamps
- Journey completion ticks (boolean flags)

**What we DON'T log:**
- Form input values (no passwords, PII)
- Full page HTML
- Cookies or local storage
- User IP addresses (anonymized)

---

## 5. Scalability & Performance

### 5.1 Horizontal Scaling

**Stateless API Servers:**
- FastAPI servers don't store session state
- JWT tokens are self-contained
- Can spin up multiple API instances behind a load balancer

**Load Balancer:**
- AWS ALB or Nginx
- Round-robin or least-connections algorithm
- Health checks on /health endpoint

**MongoDB Scaling:**
- Replica set for read scaling (read from secondaries)
- Sharding by user_id for write scaling

**Redis Scaling:**
- Master-replica setup for cache
- Separate Redis instance for Celery queue

### 5.2 Caching Strategy

**Redis Cache:**
- User profile (TTL: 5 minutes)
- Job listings (TTL: 1 minute)
- Standardized templates (TTL: 1 hour)

**CDN Cache:**
- Static assets (TTL: 7 days)
- Uploaded images (TTL: 24 hours)

**Cache Invalidation:**
- On data update, invalidate relevant cache keys
- Use cache-aside pattern (check cache first, then DB)

### 5.3 Database Optimization

**Indexes:**
- `users.email` (unique)
- `jobs.status` (for tester job browse)
- `jobs.builder_id` (for builder's job list)
- `submissions.job_id` (for inbox)
- `submissions.created_at` (for escrow auto-release query)

**Query Patterns:**
- Use projection to fetch only needed fields
- Paginate results (limit 20 per page)

**Aggregation:**
- Use MongoDB aggregation pipeline for analytics (avoid fetching all docs)

### 5.4 CDN & Static Assets

**CloudFlare or AWS CloudFront:**
- Serve React build files
- Cache uploaded screenshots
- Reduces backend load

**Lazy Loading:**
- Frontend lazy-loads components (React.lazy)
- Images lazy-load (Intersection Observer)

---

## 6. Deployment Architecture

### 6.1 Development Environment (Docker Compose)

**Services:**
1. `frontend` - React dev server (Vite, port 5173)
2. `backend` - FastAPI (Uvicorn, port 8000)
3. `mongodb` - MongoDB (port 27017)
4. `redis` - Redis (port 6379)
5. `celery` - Background worker
6. `mailhog` - Email testing (SMTP server, port 1025, web UI on 8025)

**Docker Compose File:**
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
    environment:
      - VITE_API_URL=http://localhost:8000

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - MONGO_URI=mongodb://mongodb:27017/peertesthub
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret
      - STRIPE_SECRET_KEY=sk_test_...
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery:
    build: ./backend
    command: celery -A app.celery worker --loglevel=info
    environment:
      - MONGO_URI=mongodb://mongodb:27017/peertesthub
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - mongodb

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  mongo_data:
```

### 6.2 Production Environment (Linux Server)

**Option 1: Single Server (MVP)**
- **Server:** Ubuntu 22.04 LTS, 4 CPU, 8GB RAM
- **Deployment:** Docker Compose with production configs
- **Reverse Proxy:** Nginx (SSL via Let's Encrypt)
- **Monitoring:** Uptime monitoring (UptimeRobot or similar)
- **Backups:** MongoDB daily backup to S3

**Option 2: Multi-Server (V1)**
- **Frontend:** Served from CDN (CloudFlare)
- **Backend:** 2+ API servers behind load balancer
- **Database:** MongoDB Atlas (managed)
- **Redis:** AWS ElastiCache or DigitalOcean Managed Redis
- **Workers:** Separate server for Celery workers
- **Monitoring:** DataDog or New Relic

**CI/CD:**
- **GitHub Actions:** Run tests, build Docker images
- **Deployment:** Push to Docker Hub, SSH to server, pull and restart containers
- **Zero-Downtime:** Rolling updates (docker-compose up -d --no-deps)

### 6.3 Nginx Configuration (Production)

```nginx
server {
    listen 80;
    server_name peertesthub.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name peertesthub.com;

    ssl_certificate /etc/letsencrypt/live/peertesthub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/peertesthub.com/privkey.pem;

    # Frontend (served from CDN in production, but fallback here)
    location / {
        root /var/www/peertesthub/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (for real-time notifications, optional)
    location /ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 7. Monitoring & Observability

### 7.1 Logging

**Backend Logs:**
- Structured logging (JSON format)
- Log levels: DEBUG (dev), INFO (prod), ERROR
- Log to stdout (Docker captures logs)

**What to log:**
- API requests (method, path, status, duration)
- Errors (stack traces)
- Escrow operations (for audit trail)
- Dispute actions
- Payment transactions

**Log Aggregation:**
- (MVP) Docker logs + `docker-compose logs`
- (V1) Centralized logging (AWS CloudWatch, Logtail, or self-hosted Loki)

### 7.2 Metrics

**Key Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (5xx errors)
- Database query time
- Escrow operations (success/failure rate)

**Tools:**
- (MVP) Built-in FastAPI `/metrics` endpoint (Prometheus format)
- (V1) DataDog, New Relic, or Grafana

### 7.3 Health Checks

**Endpoints:**
- `GET /health` - Returns 200 if API is up
- `GET /health/db` - Checks MongoDB connection
- `GET /health/redis` - Checks Redis connection

**Load Balancer:**
- Health check endpoint: `/health`
- Interval: 30 seconds
- Unhealthy threshold: 3 consecutive failures

### 7.4 Alerting

**Critical Alerts (Page On-Call):**
- API down (5+ minutes)
- Database down
- Escrow payment failure (money at risk)

**Warning Alerts (Email):**
- High error rate (> 5% of requests)
- Slow response time (p95 > 2 seconds)
- High dispute rate (> 20%)

**Tools:**
- (MVP) UptimeRobot for uptime monitoring
- (V1) PagerDuty or Opsgenie for on-call

---

## 8. Disaster Recovery

### 8.1 Backup Strategy

**MongoDB:**
- Daily automated backups to S3
- Retention: 30 days
- Restore time: < 1 hour

**S3 (Screenshots):**
- Versioning enabled
- Cross-region replication (for V1)

**Configuration:**
- Git repository (all code and configs)
- `.env` backup (encrypted, stored securely)

### 8.2 Failure Scenarios

**Scenario 1: API Server Down**
- **Impact:** Users can't access platform
- **Detection:** Health check fails
- **Recovery:** Load balancer routes traffic to healthy server (if multi-server), or restart container (if single server)
- **Time:** < 5 minutes

**Scenario 2: Database Down**
- **Impact:** All operations fail
- **Detection:** Health check fails, errors in logs
- **Recovery:** Restore from backup (if corruption), or restart MongoDB (if temporary)
- **Time:** 10-60 minutes

**Scenario 3: Escrow Payment Failure**
- **Impact:** Tester not paid, builder not charged
- **Detection:** Stripe webhook failure, error in logs
- **Recovery:** Manual intervention by admin (re-process payment)
- **Time:** < 24 hours (SLA to tester)

**Scenario 4: S3 Down**
- **Impact:** Can't view screenshots
- **Detection:** Upload/download failures
- **Recovery:** Wait for S3 recovery (AWS SLA 99.9%)
- **Mitigation:** Cache frequently accessed images in CDN

---

## 9. V1 Architecture Changes

### 9.1 GitHub Integration

**New Components:**
1. **GitHub OAuth Service:** Handle OAuth flow, store access tokens
2. **Build Service:** Trigger Docker builds for repos
3. **Sandbox Manager:** Manage isolated preview environments

**Architecture:**
```
Builder → Frontend → FastAPI → GitHub OAuth
1. Builder connects GitHub account
2. FastAPI redirects to GitHub OAuth
3. GitHub redirects back with code
4. FastAPI exchanges code for access token (stored encrypted)

Builder → Frontend → FastAPI → Build Service → Docker
1. Builder selects repo + branch
2. FastAPI fetches repo metadata (README, Dockerfile)
3. Build Service clones repo in isolated container
4. Build Service runs docker build (with timeout, resource limits)
5. Build Service exposes preview URL (e.g., https://preview-abc123.peertesthub.com)
6. Tester accesses preview URL (instead of iframe)
```

**Security:**
- Sandboxed builds (Docker-in-Docker with resource limits)
- Network isolation (no outbound connections except whitelisted APIs)
- Timeout: 5 minutes for build, 1 hour for preview lifetime
- Auto-delete preview after job completion

### 9.2 OpenAI Integration

**New Component:**
1. **AI Service (Enhanced):** Call OpenAI API

**Endpoints:**
- `POST /api/ai/rewrite-journey` - Given user journey, return clearer instructions
- `POST /api/ai/summarize-submissions` - Given submissions, return grouped themes

**Architecture:**
```
Builder → Frontend → FastAPI → OpenAI API
1. Builder writes rough user journey
2. Frontend sends to /api/ai/rewrite-journey
3. FastAPI calls OpenAI with prompt (see AI Feature Plan doc)
4. FastAPI returns rewritten journey
5. Builder reviews and edits
```

### 9.3 Organization Accounts (V2)

**New Collections:**
- `organizations` - Org details, billing
- `org_memberships` - User-org relationships (role: owner, admin, member)

**Architecture:**
- Organizations have multiple builders
- Billing at org level (not per user)
- Projects belong to org (shared access)
- Permissions: RBAC with org-level roles

---

## 10. Technology Alternatives

### Assumption: FastAPI as Backend Framework
**Alternatives:**
- **Alt A:** Django + Django REST Framework (more batteries-included, but slower performance)
- **Alt B:** Node.js + Express (JavaScript full-stack, but less type-safe)

**Rationale:** FastAPI is fast, type-safe (Pydantic), and has great docs. Async support is crucial for I/O-bound operations (Stripe, MongoDB).

### Assumption: MongoDB as Primary Database
**Alternatives:**
- **Alt A:** PostgreSQL (more mature, ACID, but rigid schema)
- **Alt B:** DynamoDB (fully managed, but complex queries harder)

**Rationale:** MongoDB's flexible schema fits our variable job/journey structures. Embedded documents reduce joins.

### Assumption: Stripe for Payments
**Alternatives:**
- **Alt A:** PayPal (wider global support, but worse developer experience)
- **Alt B:** Braintree (owned by PayPal, similar to Stripe)

**Rationale:** Stripe has best docs, Stripe Connect handles payouts, and most developers already use it.

---

**END OF ARCHITECTURE DOCUMENT**
