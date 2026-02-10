# Product Requirements Document (PRD)
## PeerTest Hub - Peer Testing Marketplace Platform

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Implementation-Ready

---

## 1. Problem Statement

### The Problem
Indie developers, side-hustle makers, and small teams shipping beta apps/websites struggle to get reliable, affordable user testing before launch. Traditional solutions are inadequate:

- **Hiring QA engineers** is expensive ($50-150/hour) and overkill for front-end UX testing
- **Friends & family testing** is free but unreliable, biased, and lacks structure
- **Automated testing (Playwright/Cypress)** requires technical expertise and custom scripts for each project
- **Traditional usability testing platforms** (UserTesting, UsabilityHub) are expensive ($40-100/test) with high per-transaction costs
- **Freelance testers** on general platforms (Fiverr, Upwork) have inconsistent quality and no escrow protection

### The Impact
- Builders ship bugs that could've been caught with simple user journey testing
- Testers willing to do this work have no trusted marketplace
- Both parties lack fair escrow protection
- No affordable way to run repeatable, standardized front-end tests

### The Opportunity
Create a specialized marketplace where:
1. **Builders** can quickly define test jobs with specific user journeys and get structured feedback
2. **Testers** (everyday users, not developers) can earn money doing real-effort testing with guaranteed payment
3. **Fair escrow** protects both parties from nonpayment and low-effort spam
4. **AI-assisted standardized scripts** eliminate the need for custom Playwright code

---

## 2. Target Personas

### 2.1 Primary Persona: Alex the Builder
- **Role:** Solo indie developer / side-hustle founder
- **Age:** 25-40
- **Technical Level:** Can code but not a testing expert
- **Pain Points:**
  - Shipped apps with obvious UX issues that users found immediately
  - Can't afford traditional QA or usability testing
  - Doesn't have time to learn Playwright/Cypress for every project
  - Uncertain if testers will actually do the work
- **Goals:**
  - Get reliable feedback on critical user journeys before launch
  - Pay only for quality work with proof of effort
  - Catch UX issues early without breaking the bank ($10-50 per test)
- **Success Criteria:** 
  - Set up a test in < 15 minutes
  - Receive actionable feedback within 24-48 hours
  - Pay only for legitimate effort

### 2.2 Secondary Persona: Jamie the Tester
- **Role:** Everyday user looking for flexible side income
- **Age:** 20-55
- **Technical Level:** Non-technical; comfortable using websites/apps
- **Pain Points:**
  - Hard to find legitimate, paying side gigs
  - Freelance platforms have unclear payment terms
  - Not sure how to get started with testing
  - Worried about not getting paid for real work
- **Goals:**
  - Earn $10-30/hour testing apps in spare time
  - Clear instructions on what to test
  - Guaranteed payment for real effort (even if no bugs found)
  - Build reputation and access to better-paying jobs
- **Success Criteria:**
  - Understand test requirements immediately
  - Complete tests in predictable time (15-60 minutes)
  - Get paid within 2-3 days

### 2.3 Tertiary Persona: Morgan the Admin
- **Role:** Platform operations / support
- **Age:** 25-45
- **Technical Level:** Moderate; understands testing concepts
- **Responsibilities:**
  - Review disputes between builders and testers
  - Monitor platform for fraud/spam
  - Ensure fair outcomes in edge cases
  - Improve tester qualification process
- **Tools Needed:**
  - Dashboard showing all disputes, telemetry, submission evidence
  - Ability to partial-pay or full-refund
  - Fraud detection signals

### 2.4 Future Persona: Taylor the Innovation Group Lead
- **Role:** Enterprise/internal innovation team lead
- **Age:** 30-50
- **Use Case:** Managing testing for a portfolio of internal apps
- **Needs:** 
  - Multi-project organization account
  - Team permissions and billing
  - Consistent testing standards across projects
- **Timeline:** v1 or v2

---

## 3. User Stories

### 3.1 MVP User Stories (Must Have)

#### Builder Stories
1. **Account & Auth**
   - As a builder, I can create an account with email/password so I can access the platform
   - As a builder, I must verify my email before creating projects
   - As a builder, I can log in with JWT-based authentication

2. **Project Setup**
   - As a builder, I can create a project representing my app/website
   - As a builder, I can provide a hosted URL for my app (MVP: hosted URL only)
   - As a builder, I can add project metadata (name, description, category)

3. **Test Job Creation**
   - As a builder, I can create a test job for my project with:
     - List of user journeys (step-by-step tasks)
     - Test account credentials (if needed)
     - Payout amount per completion
     - Maximum number of testers
     - Deadline/timeline
   - As a builder, I can use AI-generated standardized test templates to speed up job creation
   - As a builder, I can set budget caps to avoid overspending

4. **Escrow & Payment**
   - As a builder, I must have an active monthly membership to create jobs
   - As a builder, funds are reserved in escrow when a tester accepts my job
   - As a builder, I can manage my payment methods (via Stripe)

5. **Inbox & Review**
   - As a builder, I receive tester submissions in my inbox
   - As a builder, I can view structured feedback with:
     - Journey completion checklist
     - Issues found (or "no issues")
     - Screenshots with annotations
     - Reproduction steps
   - As a builder, I can rate the submission's usefulness (1-5 stars)
   - As a builder, I can request one clarification from the tester
   - As a builder, I can approve the submission to release escrow
   - As a builder, I can dispute a submission within 24 hours if it lacks effort

6. **Budget Management**
   - As a builder, I can see my spending dashboard (weekly/monthly)
   - As a builder, I get notified when approaching budget limits

#### Tester Stories
1. **Account & Qualification**
   - As a tester, I can create an account with email/password
   - As a tester, I must pass a lightweight qualification test covering:
     - Reading comprehension
     - Attention to detail checks
     - Sample "find the issue" exercise
   - As a tester, I receive a tester score/rating that affects job access

2. **Job Discovery**
   - As a tester, I can browse open test jobs filtered by:
     - Payout amount
     - Estimated time
     - Required skill level
     - Device/browser requirements
   - As a tester, I can see job details before accepting

3. **Accepting & Testing**
   - As a tester, I can accept a job (which reserves escrow)
   - As a tester, I can access the app via the Test Runner (iframe or new tab)
   - As a tester, I can view the step-by-step journey instructions
   - As a tester, I must complete all journeys with evidence

4. **Submission**
   - As a tester, I submit feedback including:
     - Journey completion checklist
     - Time spent
     - Issues found (with severity, repro steps)
     - Screenshots (with annotations showing problem areas)
     - "No issues found" is valid if I provide proof of completion
   - As a tester, the system logs basic telemetry (page visits, timestamps) for dispute protection

5. **Earnings & Reputation**
   - As a tester, I can track my earnings, completed jobs, and ratings
   - As a tester, I receive payment within 2-3 days after approval
   - As a tester, if the builder doesn't respond within 72 hours, escrow auto-releases (unless disputed)
   - As a tester, I can see improvement tips based on my ratings

#### Admin Stories
1. **Dispute Management**
   - As an admin, I can view all active disputes
   - As an admin, I can review submission evidence, telemetry, and both parties' claims
   - As an admin, I can issue partial payments, full payments, or refunds
   - As an admin, I can flag users for fraud/spam

2. **Platform Monitoring**
   - As an admin, I can view platform health metrics (jobs created, completion rates, dispute rates)
   - As an admin, I can adjust tester qualification difficulty

### 3.2 V1 User Stories (Should Have)

#### Builder Stories
1. **GitHub Integration**
   - As a builder, I can connect my GitHub repository via OAuth
   - As a builder, the platform pulls metadata (README, latest commit, repo name)
   - As a builder, I can trigger a preview environment build (sandboxed container)
   - As a builder, testers access my app via a secure preview URL

2. **Advanced Job Features**
   - As a builder, I can offer bonus payments for exceptional submissions
   - As a builder, I can save test job templates for reuse
   - As a builder, I can request screen recordings (in addition to screenshots)

3. **AI Enhancements**
   - As a builder, I can use AI to rewrite my user journeys into clearer tester instructions
   - As a builder, I can view AI-generated summaries of submissions (grouped themes, prioritized issues)

#### Tester Stories
1. **Advanced Testing Tools**
   - As a tester, I can record my screen during testing (optional, for higher pay)
   - As a tester, I can earn badges/achievements for consistent quality

#### Admin Stories
1. **Analytics**
   - As an admin, I can view detailed analytics on user behavior, job completion, quality trends

### 3.3 V2 User Stories (Nice to Have)

#### Organization/Innovation Group Stories
1. **Multi-Tenant Org Support**
   - As an org admin, I can create an organization account
   - As an org admin, I can invite team members with role-based permissions
   - As an org admin, I can manage multiple projects under one billing account
   - As an org admin, I can enforce standardized testing scripts across all projects
   - As an org admin, I can view consolidated reporting across all projects

---

## 4. Functional Requirements

### 4.1 MVP Functional Requirements

#### FR-1: Authentication & Authorization
- FR-1.1: Email/password registration with email verification
- FR-1.2: JWT-based authentication with role-based access control (Builder, Tester, Admin)
- FR-1.3: Password reset via email
- FR-1.4: Session management (JWT refresh tokens)

#### FR-2: User Profiles
- FR-2.1: Builder profile: name, email, payment methods, membership tier
- FR-2.2: Tester profile: name, email, qualification score, rating, earnings
- FR-2.3: Admin profile: name, email, admin permissions

#### FR-3: Project Management (Builder)
- FR-3.1: Create project with name, description, category, hosted URL
- FR-3.2: Edit project details
- FR-3.3: Archive/delete project (with safety checks)
- FR-3.4: View project history (jobs created, submissions received)

#### FR-4: Test Job Creation (Builder)
- FR-4.1: Create test job with:
  - Project selection
  - List of user journeys (step-by-step instructions)
  - Test account credentials (encrypted storage)
  - Device/browser requirements
  - Payout per completion
  - Max number of testers
  - Deadline
- FR-4.2: Use standardized test templates (AI-generated, template-based in MVP)
- FR-4.3: Set budget caps (weekly/monthly limits)
- FR-4.4: Preview job as a tester would see it
- FR-4.5: Publish job (makes it visible to testers)

#### FR-5: Job Discovery & Acceptance (Tester)
- FR-5.1: Browse open jobs with filters (payout, time, skill level)
- FR-5.2: View job details before accepting
- FR-5.3: Accept job (reserves escrow, starts timer)
- FR-5.4: Decline/skip jobs

#### FR-6: Test Runner
- FR-6.1: Display hosted URL in iframe (with X-Frame-Options check)
- FR-6.2: Fallback to new tab if iframe blocked
- FR-6.3: Display journey instructions alongside the test interface
- FR-6.4: Track basic telemetry (page visits, timestamps) without sensitive data capture

#### FR-7: Submission & Feedback (Tester)
- FR-7.1: Submit structured feedback form:
  - Journey completion checklist
  - Time spent
  - Issues found (or "no issues")
  - Severity levels (Critical, High, Medium, Low)
  - Reproduction steps
- FR-7.2: Upload screenshots (minimum 1 per journey)
- FR-7.3: Annotate screenshots (circle/highlight problem areas)
- FR-7.4: Submit "no issues found" with proof of completion
- FR-7.5: Validation: reject submissions missing required evidence

#### FR-8: Inbox & Review (Builder)
- FR-8.1: View all submissions for a job
- FR-8.2: Filter submissions (pending, approved, disputed)
- FR-8.3: View structured feedback and annotated screenshots
- FR-8.4: Rate submission usefulness (1-5 stars)
- FR-8.5: Request one clarification (tester has 24 hours to respond)
- FR-8.6: Approve submission (releases escrow to tester)
- FR-8.7: Dispute submission (within 24 hours, with reason)

#### FR-9: Escrow & Payment
- FR-9.1: Builder monthly membership subscription (Stripe)
- FR-9.2: Escrow reserve when tester accepts job
- FR-9.3: Escrow release on builder approval
- FR-9.4: Escrow auto-release after 72 hours if builder doesn't respond (unless disputed)
- FR-9.5: Tester payout via Stripe Connect (or platform wallet)
- FR-9.6: Transaction history for builders and testers

#### FR-10: Dispute Resolution (Admin)
- FR-10.1: View all disputes with submission evidence and telemetry
- FR-10.2: Review both parties' claims
- FR-10.3: Issue resolution (full payout, partial payout, full refund)
- FR-10.4: Flag users for fraud/spam (affects future job access)

#### FR-11: Tester Qualification
- FR-11.1: New testers take a qualification test:
  - Reading comprehension (3-5 questions)
  - Attention check (find the deliberate errors)
  - Sample test exercise (find issues in a demo app)
- FR-11.2: Score affects job access (higher scores unlock higher-paying jobs)
- FR-11.3: Can retake after 30 days

#### FR-12: Notifications
- FR-12.1: Email notifications for:
  - Builder: new submission, clarification request response, dispute update
  - Tester: job accepted, clarification requested, payment released, dispute filed
  - Admin: new dispute
- FR-12.2: In-app notifications (bell icon)

#### FR-13: AI-Assisted Features (MVP: Template-Based)
- FR-13.1: Provide library of standardized test templates:
  - Form validation checks
  - Navigation/menu sanity
  - Mobile responsiveness checklist
  - Broken link detection
  - Login/logout flow
- FR-13.2: Allow builders to customize templates for their job

### 4.2 V1 Functional Requirements

#### FR-V1-1: GitHub Integration
- FR-V1-1.1: GitHub OAuth connection
- FR-V1-1.2: Pull repo metadata (README, commits, branches)
- FR-V1-1.3: Trigger sandbox build (Docker-based, isolated)
- FR-V1-1.4: Generate preview URL for testers
- FR-V1-1.5: Security: sandbox timeout, resource limits, network restrictions

#### FR-V1-2: Advanced AI Features
- FR-V1-2.1: AI rewrite of user journeys (clearer instructions for testers)
- FR-V1-2.2: AI summarization of submissions (grouped themes, prioritized issues)
- FR-V1-2.3: Integration with OpenAI API (or local LLM)

#### FR-V1-3: Screen Recording
- FR-V1-3.1: Optional screen recording during testing
- FR-V1-3.2: Storage and playback for builders

#### FR-V1-4: Bonuses & Achievements
- FR-V1-4.1: Builders can offer bonus payments
- FR-V1-4.2: Testers earn badges for quality/consistency

### 4.3 V2 Functional Requirements (Innovation Group)

#### FR-V2-1: Organization Accounts
- FR-V2-1.1: Create organization with multiple team members
- FR-V2-1.2: Role-based permissions (Owner, Admin, Member)
- FR-V2-1.3: Consolidated billing for org
- FR-V2-1.4: Shared project access within org

---

## 5. Non-Functional Requirements

### NFR-1: Performance
- NFR-1.1: Page load time < 2 seconds (90th percentile)
- NFR-1.2: API response time < 500ms (95th percentile)
- NFR-1.3: Support 100 concurrent testers
- NFR-1.4: Support 1000 active jobs
- NFR-1.5: Screenshot upload < 10 seconds for 5MB images

### NFR-2: Security
- NFR-2.1: All passwords hashed with bcrypt (min 10 rounds)
- NFR-2.2: JWT tokens expire after 1 hour (with refresh)
- NFR-2.3: HTTPS only (TLS 1.2+)
- NFR-2.4: Test account credentials encrypted at rest
- NFR-2.5: No sensitive data in telemetry logs
- NFR-2.6: Rate limiting on API endpoints (100 req/min per user)
- NFR-2.7: CORS properly configured
- NFR-2.8: Input validation and sanitization on all endpoints
- NFR-2.9: SQL/NoSQL injection protection

### NFR-3: Reliability
- NFR-3.1: 99% uptime (MVP target)
- NFR-3.2: Automated backups (MongoDB daily)
- NFR-3.3: Graceful error handling (no 500 errors exposed to users)
- NFR-3.4: Transaction logging for all escrow operations
- NFR-3.5: Automated health checks

### NFR-4: Scalability
- NFR-4.1: Horizontal scaling capability (stateless backend)
- NFR-4.2: MongoDB sharding-ready architecture
- NFR-4.3: CDN for static assets and uploaded images
- NFR-4.4: Job queue for async tasks (email, AI processing)

### NFR-5: Usability
- NFR-5.1: Mobile-responsive (works on 375px+ width)
- NFR-5.2: Accessible (WCAG 2.1 AA compliance)
- NFR-5.3: Clear error messages (no technical jargon)
- NFR-5.4: Onboarding flow < 5 minutes
- NFR-5.5: Test job creation < 15 minutes

### NFR-6: Maintainability
- NFR-6.1: Code coverage > 70% (unit + integration tests)
- NFR-6.2: ESLint + Black/Flake8 enforced
- NFR-6.3: API documentation (Swagger/OpenAPI)
- NFR-6.4: Component documentation (Storybook)
- NFR-6.5: Git workflow with PR reviews

### NFR-7: Compliance
- NFR-7.1: GDPR-compliant data handling
- NFR-7.2: User data export on request
- NFR-7.3: Right to deletion (soft delete with grace period)
- NFR-7.4: Privacy policy and terms of service

---

## 6. Success Metrics

### 6.1 MVP Success Metrics (First 3 Months)

#### Acquisition Metrics
- **Target:** 100 registered builders, 500 registered testers
- **Metric:** Weekly signups (builders: 8-10/week, testers: 40-50/week)

#### Engagement Metrics
- **Test Job Creation Rate:** 30+ jobs/week
- **Job Acceptance Rate:** > 70% of jobs accepted within 24 hours
- **Submission Completion Rate:** > 80% of accepted jobs completed
- **Builder Approval Rate:** > 70% of submissions approved (not disputed)

#### Quality Metrics
- **Dispute Rate:** < 15% of submissions disputed
- **Admin Intervention Rate:** < 5% of disputes require admin resolution
- **Tester Rating Average:** > 3.5/5.0
- **Builder Satisfaction:** > 3.5/5.0 (post-job survey)

#### Monetization Metrics
- **Paid Memberships:** 30+ active builder subscriptions
- **MRR (Monthly Recurring Revenue):** $1,500+ (assuming $50/month avg)
- **Tester Payouts:** $3,000+ per month (proof of marketplace activity)

#### Retention Metrics
- **Builder Retention (30-day):** > 50% of builders create a 2nd job
- **Tester Retention (30-day):** > 60% of testers complete 2+ jobs
- **Churn Rate:** < 20% monthly churn

### 6.2 North Star Metric
**Total Quality Test Submissions per Week:** Measures the core value exchange (testers doing real work, builders getting value)
- **MVP Target:** 100 quality submissions/week (approved, not disputed)
- **V1 Target:** 500 quality submissions/week

### 6.3 V1 Success Metrics (Months 4-12)

#### Scale Metrics
- **Registered Builders:** 500+
- **Registered Testers:** 2,500+
- **Active Projects:** 200+
- **Monthly Test Jobs:** 500+

#### Revenue Metrics
- **MRR:** $15,000+ (300 builders @ $50/month)
- **Annual Revenue:** $180,000+

#### Efficiency Metrics
- **Average Time to First Submission:** < 12 hours
- **Escrow Auto-Release Rate:** > 80% (minimal disputes)
- **AI Template Usage:** > 50% of jobs use standardized templates

---

## 7. Risks & Mitigations

### Risk 1: Low Tester Quality (High Impact, High Probability)
**Description:** Testers submit low-effort work (random screenshots, no real testing)

**Mitigations:**
- **Qualification test** gates access (weeds out completely unqualified)
- **Telemetry logging** (page visits, time spent) provides dispute evidence
- **Minimum time thresholds** (e.g., 15-minute journey can't be completed in 2 minutes)
- **Rating system** affects job access (low-rated testers see fewer/lower-paying jobs)
- **Admin review** of disputed submissions with partial payout option
- **Builder can request clarification** once before approving

### Risk 2: Builder Nonpayment (High Impact, Medium Probability)
**Description:** Builders refuse to pay despite real effort from testers

**Mitigations:**
- **Escrow required** before testers start work (funds reserved)
- **Auto-release after 72 hours** if builder doesn't respond (unless actively disputed)
- **Admin dispute resolution** with telemetry evidence
- **Builder reputation** (if they repeatedly dispute valid work, limit account)

### Risk 3: Insufficient Tester Supply (High Impact, Medium Probability)
**Description:** Not enough testers to fulfill builder demand

**Mitigations:**
- **Lower barrier to entry** (non-technical testers, simple qualification)
- **Fair pay** ($10-30/hour equivalent is competitive for gig work)
- **Marketing to gig economy workers** (similar to UserTesting, Respondent.io)
- **Incentives:** Sign-up bonuses, referral program
- **Monitor supply/demand ratio** and adjust tester acquisition if needed

### Risk 4: Escrow Payment Failures (High Impact, Low Probability)
**Description:** Stripe payment failures, chargebacks, insufficient builder funds

**Mitigations:**
- **Pre-authorize membership** before allowing job creation
- **Escrow reserve** happens upfront (builder can't create jobs without funds)
- **Stripe Connect** for tester payouts (handles compliance)
- **Transaction logging** for all escrow operations
- **Grace period** for failed payments (notify builder, pause new jobs)

### Risk 5: Security Vulnerabilities (Medium Impact, Medium Probability)
**Description:** Test account credentials leaked, platform hacked, data breach

**Mitigations:**
- **Encrypt credentials** at rest (AES-256)
- **Short-lived test accounts** (expire after job completion)
- **JWT best practices** (short expiry, refresh tokens)
- **Rate limiting** to prevent brute force
- **Regular security audits** and dependency updates
- **GDPR compliance** for data handling

### Risk 6: Iframe Blocking (Medium Impact, High Probability - MVP)
**Description:** Many apps block iframe embedding (X-Frame-Options, CSP)

**Mitigations:**
- **MVP approach:** Primary is hosted URL in iframe, fallback to new tab
- **Clear instructions** for builders (if your app blocks iframes, it will open in new tab)
- **Telemetry still works** in new tab via browser extension or self-reported
- **V1 approach:** GitHub sandboxing with controlled preview environment

### Risk 7: AI Feature Overpromise (Medium Impact, Medium Probability)
**Description:** Users expect full AI automation but MVP is template-based

**Mitigations:**
- **Clear messaging:** "AI-assisted" not "fully automated"
- **MVP delivers value:** Templates are useful even without OpenAI
- **Gradual rollout:** Add AI rewrite and summarization in V1
- **Set expectations:** "Standardized scripts" ≠ "custom Playwright replacement"

### Risk 8: Dispute Overload (Low Impact, Low Probability)
**Description:** Too many disputes for admin to handle

**Mitigations:**
- **Automated checks:** Reject obviously incomplete submissions before they reach builder
- **Telemetry evidence:** Makes most disputes clear-cut
- **Partial payout option:** Reduces all-or-nothing disputes
- **High escrow auto-release rate:** Most submissions don't need admin intervention
- **Scale admin team** if dispute rate > 5%

### Risk 9: Cold Start Problem (High Impact, High Probability)
**Description:** Builders won't post jobs without testers; testers won't join without jobs

**Mitigations:**
- **Seed testers first:** Recruit initial tester pool before builder launch (gig worker communities)
- **Founder-led jobs:** Create 5-10 demo jobs using own projects
- **Invite-only beta:** Onboard 10 builders with guaranteed tester availability
- **Referral incentives:** Early testers get bonus for inviting friends
- **Community building:** Discord/Slack for early adopters

### Risk 10: GitHub Integration Complexity (High Impact, Medium Probability - V1)
**Description:** Building/deploying GitHub repos in sandbox is technically complex and risky

**Mitigations:**
- **Phase approach:** MVP uses hosted URL only; V1 adds GitHub
- **Strict sandboxing:** Docker containers, resource limits, network isolation, timeouts
- **Allowlist approach:** Start with static sites (React, Vue, Next.js) before backend apps
- **Clear documentation:** Builder must provide build instructions
- **Fail gracefully:** If build fails, fall back to manual hosted URL

---

## 8. Out of Scope (MVP)

The following are explicitly **not included** in MVP to keep scope manageable:

1. **Screen recording** (V1 feature)
2. **GitHub integration** (V1 feature)
3. **Organization/multi-tenant accounts** (V2 feature)
4. **OpenAI API integration** (V1 feature; MVP uses templates)
5. **Mobile app** (web-only for MVP)
6. **Live chat support** (email support only)
7. **Video calls between builders and testers** (async only)
8. **Complex analytics dashboards** (basic metrics only)
9. **Tester certification badges** (V1 feature)
10. **White-label/reseller program** (future)

---

## 9. Assumptions

### Assumption 1: Payment Processor
**Assumption:** We'll use Stripe for membership subscriptions and Stripe Connect for tester payouts.

**Alternatives:**
- **Alt A:** PayPal for payouts (easier in some countries but less integrated)
- **Alt B:** Wise/TransferWise for international payouts (lower fees but requires separate integration)

**Rationale:** Stripe has the best developer experience and handles both subscriptions and payouts.

### Assumption 2: Escrow Implementation
**Assumption:** We'll use Stripe payment intents with "hold/capture" model for escrow.

**Alternatives:**
- **Alt A:** Separate "platform wallet" (builder deposits to wallet, we control payouts) - more flexible but requires money transmitter license in some jurisdictions
- **Alt B:** Stripe Connect with escrow-like holds (reserves funds on builder's card)

**Rationale:** Payment intents avoid money transmitter licensing issues while providing escrow-like behavior.

### Assumption 3: Telemetry Collection
**Assumption:** Basic telemetry (page URLs visited, timestamps) is collected client-side and sent to our backend.

**Alternatives:**
- **Alt A:** Browser extension for more detailed telemetry
- **Alt B:** Self-reported checklist only (no automated telemetry)

**Rationale:** Client-side JS is least invasive and works in both iframe and new tab modes.

### Assumption 4: Screenshot Annotation
**Assumption:** We'll use a client-side canvas library (e.g., Fabric.js or Konva) for screenshot annotation.

**Alternatives:**
- **Alt A:** Third-party tool like Markup.io (easier but dependency risk)
- **Alt B:** Server-side annotation (slower, more complex)

**Rationale:** Client-side canvas is fast, works offline, and gives full control.

### Assumption 5: Tester Qualification Difficulty
**Assumption:** Qualification test has a 70% pass rate (low bar to maximize tester supply).

**Alternatives:**
- **Alt A:** 50% pass rate (higher quality but lower supply)
- **Alt B:** No qualification test (maximum supply but risk of low quality)

**Rationale:** Start with lower bar and adjust based on quality metrics.

### Assumption 6: Escrow Auto-Release Timing
**Assumption:** Escrow auto-releases after 72 hours if builder doesn't respond.

**Alternatives:**
- **Alt A:** 24 hours (faster for testers but may not give builders enough time)
- **Alt B:** 7 days (safer for builders but testers wait too long)

**Rationale:** 72 hours balances both parties' needs.

### Assumption 7: Membership Pricing (MVP)
**Assumption:** Single tier at $49/month for builders (unlimited job postings, escrow payouts separate).

**Alternatives:**
- **Alt A:** Multiple tiers (Starter $29, Pro $79, Team $149)
- **Alt B:** Pay-per-job model (no membership, 15% platform fee per job)

**Rationale:** Simple monthly membership is easiest to communicate and reduces per-transaction friction.

### Assumption 8: Hosted URL Only (MVP)
**Assumption:** MVP only supports hosted URL (no GitHub builds).

**Alternatives:**
- **Alt A:** Include GitHub builds in MVP (higher complexity)
- **Alt B:** Manual upload of static files (builders upload ZIP) - middle ground

**Rationale:** Hosted URL is simplest and covers 80% of use cases (most side projects are already deployed).

---

## 10. Success Criteria for MVP Launch

**MVP is considered launch-ready when:**

1. ✅ All MVP functional requirements (FR-1 through FR-13) are implemented
2. ✅ Core user flows work end-to-end (builder creates job → tester completes → payment releases)
3. ✅ Escrow system tested with real Stripe test mode transactions
4. ✅ Dispute resolution workflow tested by founder acting as admin
5. ✅ 10 beta testers complete qualification test and 5+ test jobs
6. ✅ Security audit passed (no critical vulnerabilities)
7. ✅ Non-functional requirements met (performance, security, reliability)
8. ✅ Documentation complete (user guides, API docs, admin playbook)
9. ✅ Legal pages ready (privacy policy, terms of service)
10. ✅ Email notifications working
11. ✅ Founder can support 10-20 active builders without burning out

**Launch Blockers (must fix before launch):**
- Any critical security vulnerability
- Escrow funds lost or stolen
- Data breach or credential leak
- Core flow completely broken (e.g., can't submit feedback)

---

**END OF PRD**
