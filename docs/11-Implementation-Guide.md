# PeerTest Hub - Implementation Guide

## Overview

This comprehensive guide walks through the step-by-step process of building PeerTest Hub from scratch, including setup, development workflow, testing strategy, and launch preparation.

**Estimated Timeline**: 8-12 weeks for MVP  
**Team Size**: 1-2 full-stack developers  
**Prerequisites**: Experience with React, Python, MongoDB, and cloud deployment

---

## Table of Contents

1. [Development Environment Setup](#1-development-environment-setup)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Implementation](#3-frontend-implementation)
4. [Third-party Integrations](#4-third-party-integrations)
5. [Testing Strategy](#5-testing-strategy)
6. [Deployment Preparation](#6-deployment-preparation)
7. [Post-Launch Monitoring](#7-post-launch-monitoring)
8. [Iteration & Scaling](#8-iteration--scaling)

---

## 1. Development Environment Setup

### 1.1 Prerequisites

**Required Software:**
```bash
# System requirements
- OS: macOS, Linux, or Windows (with WSL)
- RAM: 8GB minimum, 16GB recommended
- Storage: 20GB free space

# Install core tools
- Git 2.30+
- Node.js 18+ and npm/yarn
- Python 3.11+
- MongoDB 5.0+
- Redis 7.0+
- Docker & Docker Compose
- VS Code or preferred IDE
```

### 1.2 Initial Setup

```bash
# Clone repository (or create new)
git clone https://github.com/yourusername/peertest-hub.git
cd peertest-hub

# Create project structure
mkdir -p backend frontend docs docker

# Initialize git
git init
git add .
git commit -m "Initial commit: Project structure"
```

### 1.3 Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn motor pymongo pydantic pydantic-settings \
            python-jose passlib bcrypt python-multipart aiofiles \
            stripe openai redis python-dotenv pytest pytest-asyncio \
            httpx

# Create requirements.txt
pip freeze > requirements.txt

# Create .env file
cat > .env << EOL
# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=peertest_hub

# Security
SECRET_KEY=your-secret-key-here-generate-with-openssl
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI
OPENAI_API_KEY=sk-...

# Email
SENDGRID_API_KEY=...
FROM_EMAIL=noreply@peertest.io

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Environment
ENVIRONMENT=development
EOL
```

### 1.4 Frontend Setup

```bash
cd frontend

# Create Vite project with React + TypeScript
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages
npm install react-router-dom@6 \
            @tanstack/react-query \
            axios \
            zustand \
            @stripe/stripe-js @stripe/react-stripe-js \
            react-hook-form @hookform/resolvers zod \
            date-fns \
            fabric \
            @heroicons/react \
            class-variance-authority clsx tailwind-merge

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer \
              @tailwindcss/forms @tailwindcss/typography
npx tailwindcss init -p

# Create .env file
cat > .env << EOL
VITE_API_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOL
```

### 1.5 Database Setup

```bash
# Start MongoDB (using Docker)
docker run -d \
  --name peertest-mongo \
  -p 27017:27017 \
  -v peertest-mongo-data:/data/db \
  mongo:5.0

# Start Redis
docker run -d \
  --name peertest-redis \
  -p 6379:6379 \
  redis:7-alpine

# Verify connections
mongosh mongodb://localhost:27017
redis-cli ping
```

### 1.6 Development Tools

```bash
# Install VS Code extensions (recommended)
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension mongodb.mongodb-vscode

# Set up pre-commit hooks
pip install pre-commit
cat > .pre-commit-config.yaml << EOL
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
  
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
  
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
EOL

pre-commit install
```

---

## 2. Backend Implementation

### Phase 1: Foundation (Week 1)

#### Day 1-2: Project Structure & Core Setup

```bash
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings
│   ├── dependencies.py      # DI
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── users.py
│   │       └── ...
│   ├── models/              # Pydantic models
│   ├── services/            # Business logic
│   ├── db/                  # Database
│   │   ├── mongodb.py
│   │   └── repositories/
│   ├── middleware/          # Middleware
│   └── utils/               # Utilities
├── tests/
├── alembic/                 # Migrations (optional)
├── requirements.txt
└── README.md
```

**Create main.py:**
```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.mongodb import database
from app.api.v1 import auth, users, projects, jobs

app = FastAPI(
    title="PeerTest Hub API",
    version="1.0.0",
    description="Crowdtesting marketplace API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Events
@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Include routers
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

#### Day 3-4: Authentication System

**Implement:**
- User registration
- Login with JWT
- Password hashing (bcrypt)
- Email verification
- Password reset

**Test:**
```bash
# Start server
cd backend
uvicorn app.main:app --reload

# Test endpoints
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","full_name":"Test User","role":"client"}'
```

#### Day 5-7: Core Models & Repositories

**Implement:**
- User model & repository
- Project model & repository
- Job model & repository
- Submission model & repository
- CRUD operations for each

**Database Seeding:**
```python
# scripts/seed_database.py
import asyncio
from app.db.mongodb import database
from app.models.user import User
from app.models.ai_test_templates import AITestTemplate

async def seed_templates():
    """Seed test templates"""
    templates = [
        {
            "name": "E-commerce Checkout Flow",
            "category": "e-commerce",
            "description": "Standard checkout testing",
            "steps": [...]
        },
        # Add more templates
    ]
    
    await database.ai_test_templates.insert_many(templates)
    print(f"Seeded {len(templates)} templates")

if __name__ == "__main__":
    asyncio.run(seed_templates())
```

### Phase 2: Core Features (Week 2-3)

#### Jobs System
- Create job (draft state)
- Publish job (with payment)
- Claim job (tester)
- Update job status
- List jobs (marketplace)

#### Submissions System
- Create submission (draft)
- Upload screenshots
- Submit for review
- Approve/reject submission
- Rating system

#### Payment Integration
- Stripe customer creation
- Payment method management
- Escrow transactions
- Payouts to testers

### Phase 3: Advanced Features (Week 4)

- AI test generation
- Template system
- Notification system
- Organization support (Innovation Group)
- Admin panel APIs

---

## 3. Frontend Implementation

### Phase 1: Foundation (Week 1)

#### Day 1-2: Setup & Configuration

**Configure Tailwind:**
```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          600: '#0284c7',
          700: '#0369a1',
        },
        // Add color system from design doc
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

**Setup Routing:**
```tsx
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    )
  },
  // Add all routes
])
```

#### Day 3-5: Core UI Components

Build base components:
- Button
- Input
- Card
- Modal
- Badge
- Dropdown
- Tabs

#### Day 6-7: Authentication Flow

Implement:
- Login form
- Register form
- Protected routes
- Auth state management (Zustand)
- Token handling

### Phase 2: Core Features (Week 2-3)

#### Job Management
- Job creation form
- Job marketplace
- Job detail page
- User journey builder
- Job claiming (testers)

#### Submissions
- Submission form
- Screenshot upload
- Screenshot annotation (Fabric.js)
- Bug report form
- Submission review

#### Dashboard
- Client dashboard (jobs, projects, stats)
- Tester dashboard (assignments, earnings)
- Analytics and charts

### Phase 3: Polish (Week 4)

- Responsive design testing
- Loading states
- Error handling
- Empty states
- Notifications (toasts)
- Performance optimization

---

## 4. Third-party Integrations

### 4.1 Stripe Setup

```python
# services/payment_service.py
import stripe
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:
    async def create_customer(self, email: str, name: str):
        customer = stripe.Customer.create(
            email=email,
            name=name
        )
        return customer.id
    
    async def create_payment_intent(self, amount: int, customer_id: str):
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            customer=customer_id
        )
        return intent
```

**Frontend:**
```tsx
// lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)
```

### 4.2 OpenAI Integration

```python
# services/ai_service.py
import openai
from app.config import settings

openai.api_key = settings.OPENAI_API_KEY

class AIService:
    async def generate_test_journey(self, description: str):
        response = await openai.ChatCompletion.acreate(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "You are a QA expert..."},
                {"role": "user", "content": description}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
```

### 4.3 Email Service (SendGrid)

```python
# services/email_service.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

class EmailService:
    def __init__(self):
        self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)
    
    async def send_verification_email(self, to_email: str, token: str):
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=to_email,
            subject='Verify your email',
            html_content=f'Click here: {settings.FRONTEND_URL}/verify-email/{token}'
        )
        self.client.send(message)
```

### 4.4 File Storage (AWS S3)

```python
# services/storage_service.py
import boto3
from botocore.client import Config

class StorageService:
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            config=Config(signature_version='s3v4')
        )
        self.bucket = settings.S3_BUCKET
    
    async def upload_file(self, file: bytes, filename: str):
        key = f"uploads/{filename}"
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file,
            ContentType='image/png'
        )
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"
```

---

## 5. Testing Strategy

### 5.1 Backend Tests

```python
# tests/test_auth.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_register_user():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "Test1234!",
                "full_name": "Test User",
                "role": "client"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_login():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First register
        await client.post("/api/v1/auth/register", json={...})
        
        # Then login
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "Test1234!"
            }
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
```

**Run tests:**
```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html
```

### 5.2 Frontend Tests

```tsx
// tests/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginForm } from '@/features/auth/components/LoginForm'

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
  
  it('submits form with valid data', async () => {
    const onSubmit = jest.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Test1234!' }
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Test1234!'
      })
    })
  })
})
```

**Run tests:**
```bash
cd frontend
npm test
npm run test:coverage
```

### 5.3 Integration Tests

Test complete workflows:
- User registration → Email verification → Login
- Create project → Create job → Payment → Publish
- Tester claim job → Submit → Client review → Payment

### 5.4 Load Testing

```bash
# Install Apache Bench or k6
brew install k6

# Create load test script
cat > load_test.js << EOL
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let res = http.get('http://localhost:8000/api/v1/jobs');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
EOL

# Run test
k6 run load_test.js
```

---

## 6. Deployment Preparation

### 6.1 Environment Variables

**Production .env:**
```bash
# Never commit this file
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/peertest_hub
SECRET_KEY=<strong-random-key>
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...
ENVIRONMENT=production
```

### 6.2 Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS only in production
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (MongoDB validation)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Password hashing with bcrypt
- [ ] JWT tokens expire after 1 hour

### 6.3 Performance Optimization

**Backend:**
- [ ] Database indexes created
- [ ] Redis caching for hot data
- [ ] Async operations where possible
- [ ] File upload size limits
- [ ] API rate limiting

**Frontend:**
- [ ] Code splitting
- [ ] Lazy loading routes
- [ ] Image optimization
- [ ] CDN for static assets
- [ ] Minification and compression

### 6.4 Documentation

- [ ] API documentation (FastAPI auto-generates)
- [ ] README with setup instructions
- [ ] Architecture documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide

---

## 7. Post-Launch Monitoring

### 7.1 Logging

```python
# utils/logger.py
import logging
import sys

def setup_logger():
    logger = logging.getLogger("peertest")
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

logger = setup_logger()
```

### 7.2 Error Tracking

```bash
# Install Sentry
pip install sentry-sdk
npm install @sentry/react
```

```python
# app/main.py
import sentry_sdk

sentry_sdk.init(
    dsn="https://...@sentry.io/...",
    environment=settings.ENVIRONMENT
)
```

### 7.3 Analytics

```tsx
// lib/analytics.ts
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const usePageTracking = () => {
  const location = useLocation()
  
  useEffect(() => {
    // Google Analytics or similar
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', 'GA_TRACKING_ID', {
        page_path: location.pathname
      })
    }
  }, [location])
}
```

### 7.4 Health Checks

```python
@app.get("/health")
async def health_check():
    # Check database
    try:
        await database.client.admin.command('ping')
        db_status = "healthy"
    except:
        db_status = "unhealthy"
    
    # Check Redis
    try:
        redis_client.ping()
        redis_status = "healthy"
    except:
        redis_status = "unhealthy"
    
    return {
        "status": "healthy" if all([
            db_status == "healthy",
            redis_status == "healthy"
        ]) else "degraded",
        "database": db_status,
        "redis": redis_status
    }
```

---

## 8. Iteration & Scaling

### 8.1 Feedback Collection

- In-app feedback widget
- User surveys (Typeform)
- Support tickets (Intercom)
- Analytics (Mixpanel/Amplitude)

### 8.2 Feature Prioritization

**Framework: RICE**
- **Reach**: How many users affected?
- **Impact**: How much will it improve experience?
- **Confidence**: How sure are we?
- **Effort**: How long will it take?

**Score = (Reach × Impact × Confidence) / Effort**

### 8.3 Performance Monitoring

```bash
# Set up monitoring
- Database query performance (MongoDB Atlas)
- API response times (New Relic)
- Error rates (Sentry)
- User flows (Hotjar)
```

### 8.4 Scaling Checklist

- [ ] Database replication for reads
- [ ] Redis cluster for caching
- [ ] Load balancer (nginx)
- [ ] CDN for static assets
- [ ] Background job queue (Celery)
- [ ] Auto-scaling based on traffic

---

## Development Workflow

### Daily Workflow

```bash
# Morning
1. Pull latest changes: git pull origin main
2. Review issues/PRs
3. Plan day's work

# During development
1. Create feature branch: git checkout -b feature/job-marketplace
2. Write tests first (TDD)
3. Implement feature
4. Run tests: pytest / npm test
5. Commit: git commit -m "feat: Add job marketplace"

# End of day
1. Push branch: git push origin feature/job-marketplace
2. Create PR with description
3. Request review
4. Update project board
```

### Code Review Checklist

- [ ] Tests pass
- [ ] Code follows style guide
- [ ] No console.log or debug statements
- [ ] Error handling present
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] Performance considered

---

## Launch Checklist

### Pre-Launch (1 week before)

- [ ] All core features complete and tested
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] Documentation complete
- [ ] Legal pages (Terms, Privacy) live
- [ ] Support email/system ready

### Launch Day

- [ ] Deploy to production
- [ ] Smoke test all critical paths
- [ ] Monitor error rates
- [ ] Post on Product Hunt
- [ ] Social media announcements
- [ ] Email beta users
- [ ] Monitor support channels

### Post-Launch (1 week after)

- [ ] Daily monitoring of metrics
- [ ] Respond to all support tickets <24h
- [ ] Fix critical bugs immediately
- [ ] Collect user feedback
- [ ] Plan next iteration

---

## Troubleshooting Guide

### Common Issues

**Issue: MongoDB connection fails**
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Check connection string
echo $MONGODB_URL

# Test connection
mongosh $MONGODB_URL
```

**Issue: Frontend can't reach API**
```bash
# Check CORS settings
# Check API is running on correct port
# Check .env file has correct API_URL
```

**Issue: Stripe webhooks not working**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

---

## Resources

### Documentation
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Stripe: https://stripe.com/docs
- MongoDB: https://www.mongodb.com/docs/

### Community
- FastAPI Discord
- React subreddit
- Indie Hackers
- Dev.to

### Tools
- Postman (API testing)
- MongoDB Compass (DB GUI)
- VS Code
- GitHub Copilot

---

## Summary

This guide provides a structured approach to building PeerTest Hub. Follow the phases sequentially, test thoroughly, and iterate based on feedback. Remember: Ship early, learn fast, improve continuously.

**Key Success Factors:**
1. Start with MVP, not perfection
2. Test continuously
3. Monitor production closely
4. Listen to users
5. Iterate quickly

Good luck building! 🚀

