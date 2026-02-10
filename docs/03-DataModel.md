# PeerTest Hub - MongoDB Data Model

## Overview

This document defines the complete MongoDB data model for PeerTest Hub, including all collections, schemas, indexes, validation rules, and relationships.

**Database Name:** `peertest_hub`

**Collections:**
1. users
2. projects
3. jobs
4. submissions
5. escrow_transactions
6. disputes
7. ratings
8. notifications
9. ai_test_templates
10. qualification_tests

---

## 1. Users Collection

### Schema

```javascript
{
  _id: ObjectId,
  email: String,              // Unique, required
  password_hash: String,      // bcrypt hash
  full_name: String,
  role: String,               // "client" | "tester" | "admin"
  status: String,             // "active" | "suspended" | "pending_verification"
  
  // Profile information
  profile: {
    bio: String,
    avatar_url: String,
    timezone: String,
    preferred_language: String,
    country: String
  },
  
  // Role-specific data
  client_data: {
    company_name: String,
    company_website: String,
    industry: String,
    team_size: String,        // "1-10" | "11-50" | "51-200" | "201+"
    membership_tier: String,   // "starter" | "pro" | "team"
    stripe_customer_id: String
  },
  
  tester_data: {
    specializations: [String], // ["web", "mobile", "api", "accessibility"]
    experience_level: String,  // "beginner" | "intermediate" | "expert"
    devices: [String],         // ["iPhone 14", "Samsung Galaxy S22", "Windows 11"]
    browsers: [String],        // ["Chrome", "Firefox", "Safari", "Edge"]
    hourly_rate_usd: Number,
    availability: String,      // "full-time" | "part-time" | "weekends"
    qualification_status: String, // "pending" | "qualified" | "rejected"
    qualification_score: Number,  // 0-100
    stripe_connect_id: String,    // For payouts
    stripe_connect_status: String, // "pending" | "verified" | "restricted"
    total_earned_usd: Number,
    total_jobs_completed: Number,
    average_rating: Number,       // 0-5
    success_rate: Number          // 0-100 percentage
  },
  
  // Organization support (Innovation Group feature)
  organization_id: ObjectId,     // Reference to organizations collection
  organization_role: String,     // "owner" | "admin" | "member" | null
  
  // Security
  email_verified: Boolean,
  email_verification_token: String,
  email_verification_expires: Date,
  password_reset_token: String,
  password_reset_expires: Date,
  two_factor_enabled: Boolean,
  two_factor_secret: String,
  
  // Preferences
  notification_preferences: {
    email_new_job: Boolean,
    email_job_assigned: Boolean,
    email_submission_received: Boolean,
    email_payment_received: Boolean,
    email_rating_received: Boolean,
    in_app_notifications: Boolean
  },
  
  // Metadata
  created_at: Date,
  updated_at: Date,
  last_login: Date,
  login_count: Number
}
```

### Example Document - Client

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "email": "john.doe@techcorp.com",
  "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIRSgxA7.S",
  "full_name": "John Doe",
  "role": "client",
  "status": "active",
  "profile": {
    "bio": "Product Manager at TechCorp",
    "avatar_url": "https://storage.peertest.io/avatars/john-doe.jpg",
    "timezone": "America/New_York",
    "preferred_language": "en",
    "country": "US"
  },
  "client_data": {
    "company_name": "TechCorp Inc.",
    "company_website": "https://techcorp.com",
    "industry": "SaaS",
    "team_size": "51-200",
    "membership_tier": "pro",
    "stripe_customer_id": "cus_NffrFeUfNV2Hib"
  },
  "email_verified": true,
  "notification_preferences": {
    "email_new_job": false,
    "email_job_assigned": true,
    "email_submission_received": true,
    "email_payment_received": true,
    "email_rating_received": true,
    "in_app_notifications": true
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-02-10T14:22:00Z",
  "last_login": "2024-02-10T08:15:00Z",
  "login_count": 47
}
```

### Example Document - Tester

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
  "email": "sarah.tester@gmail.com",
  "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIRSgxA7.S",
  "full_name": "Sarah Johnson",
  "role": "tester",
  "status": "active",
  "profile": {
    "bio": "QA professional with 5 years experience in web and mobile testing",
    "avatar_url": "https://storage.peertest.io/avatars/sarah-johnson.jpg",
    "timezone": "Europe/London",
    "preferred_language": "en",
    "country": "GB"
  },
  "tester_data": {
    "specializations": ["web", "mobile", "accessibility"],
    "experience_level": "expert",
    "devices": ["iPhone 14 Pro", "iPad Air", "Samsung Galaxy S23", "Windows 11 PC"],
    "browsers": ["Chrome", "Firefox", "Safari", "Edge"],
    "hourly_rate_usd": 35,
    "availability": "part-time",
    "qualification_status": "qualified",
    "qualification_score": 92,
    "stripe_connect_id": "acct_1MvQeRCRhkTQzfJ5",
    "stripe_connect_status": "verified",
    "total_earned_usd": 3450.00,
    "total_jobs_completed": 28,
    "average_rating": 4.8,
    "success_rate": 96.4
  },
  "email_verified": true,
  "notification_preferences": {
    "email_new_job": true,
    "email_job_assigned": true,
    "email_submission_received": false,
    "email_payment_received": true,
    "email_rating_received": true,
    "in_app_notifications": true
  },
  "created_at": "2023-11-20T09:15:00Z",
  "updated_at": "2024-02-10T11:30:00Z",
  "last_login": "2024-02-10T11:30:00Z",
  "login_count": 156
}
```

### Indexes

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1, status: 1 })
db.users.createIndex({ organization_id: 1 })
db.users.createIndex({ "tester_data.qualification_status": 1 })
db.users.createIndex({ "tester_data.specializations": 1 })
db.users.createIndex({ created_at: -1 })
db.users.createIndex({ email_verification_token: 1 }, { sparse: true })
db.users.createIndex({ password_reset_token: 1 }, { sparse: true })
```

### Validation Rules

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password_hash", "full_name", "role", "status"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        role: {
          enum: ["client", "tester", "admin"]
        },
        status: {
          enum: ["active", "suspended", "pending_verification"]
        }
      }
    }
  }
})
```

---

## 2. Projects Collection

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  client_id: ObjectId,          // Reference to users
  organization_id: ObjectId,    // Reference to organizations (if applicable)
  
  // Project details
  project_type: String,         // "web" | "mobile" | "api" | "desktop"
  url: String,                  // Main URL or app link
  environment: String,          // "production" | "staging" | "development"
  
  credentials: {
    username: String,
    password: String,           // Encrypted
    additional_info: String
  },
  
  // Test requirements
  target_devices: [String],
  target_browsers: [String],
  target_os: [String],
  
  // Status
  status: String,               // "active" | "archived" | "draft"
  
  // Metadata
  created_at: Date,
  updated_at: Date,
  archived_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef2')",
  "name": "E-commerce Platform - Main Site",
  "description": "Production e-commerce website requiring comprehensive testing across multiple browsers and devices",
  "client_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "project_type": "web",
  "url": "https://shop.techcorp.com",
  "environment": "production",
  "credentials": {
    "username": "test_user@techcorp.com",
    "password": "encrypted_password_hash",
    "additional_info": "Use promo code TEST2024 for test purchases"
  },
  "target_devices": ["Desktop", "iPhone", "Android Phone", "iPad"],
  "target_browsers": ["Chrome", "Safari", "Firefox", "Edge"],
  "target_os": ["Windows 11", "macOS", "iOS 17", "Android 13"],
  "status": "active",
  "created_at": "2024-01-20T14:30:00Z",
  "updated_at": "2024-02-05T09:15:00Z"
}
```

### Indexes

```javascript
db.projects.createIndex({ client_id: 1, status: 1 })
db.projects.createIndex({ organization_id: 1 })
db.projects.createIndex({ created_at: -1 })
db.projects.createIndex({ name: "text", description: "text" })
```

---

## 3. Jobs Collection

### Schema

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,         // Reference to projects
  client_id: ObjectId,          // Reference to users
  
  // Job details
  title: String,
  description: String,
  test_type: String,            // "exploratory" | "regression" | "specific_feature" | "user_journey"
  
  // User journey (for structured tests)
  user_journey: {
    scenario: String,           // High-level description
    steps: [{
      step_number: Number,
      action: String,
      expected_result: String
    }],
    ai_generated: Boolean,      // Was this journey AI-enhanced?
    ai_template_id: ObjectId    // Reference to ai_test_templates
  },
  
  // Requirements
  required_devices: [String],
  required_browsers: [String],
  required_os: [String],
  tester_level: String,         // "beginner" | "intermediate" | "expert" | "any"
  
  // Assignment
  max_testers: Number,
  assigned_testers: [{
    tester_id: ObjectId,
    assigned_at: Date,
    status: String              // "assigned" | "in_progress" | "submitted" | "completed"
  }],
  
  // Pricing
  budget_per_tester_usd: Number,
  total_budget_usd: Number,
  
  // Timeline
  deadline: Date,
  estimated_duration_minutes: Number,
  
  // Status
  status: String,               // "draft" | "open" | "in_progress" | "review" | "completed" | "cancelled"
  visibility: String,           // "public" | "private" | "invited_only"
  
  // Escrow
  escrow_status: String,        // "pending" | "reserved" | "held" | "released" | "refunded"
  escrow_transaction_id: ObjectId,
  
  // Results
  submission_count: Number,
  approved_submission_count: Number,
  bugs_found: Number,
  
  // Metadata
  created_at: Date,
  updated_at: Date,
  published_at: Date,
  completed_at: Date,
  cancelled_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef3')",
  "project_id": "ObjectId('65a1b2c3d4e5f6789abcdef2')",
  "client_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "title": "Checkout Flow - Payment Integration Testing",
  "description": "Test the complete checkout process including cart, shipping, and payment steps. Focus on edge cases and error handling.",
  "test_type": "user_journey",
  "user_journey": {
    "scenario": "Complete purchase flow from adding item to cart through successful payment",
    "steps": [
      {
        "step_number": 1,
        "action": "Add 'Premium Widget' to cart",
        "expected_result": "Item appears in cart with correct price ($99.99)"
      },
      {
        "step_number": 2,
        "action": "Click 'Proceed to Checkout'",
        "expected_result": "Shipping address form displays"
      },
      {
        "step_number": 3,
        "action": "Enter shipping address and continue",
        "expected_result": "Payment method selection appears"
      },
      {
        "step_number": 4,
        "action": "Enter test credit card (4242 4242 4242 4242)",
        "expected_result": "Payment processes successfully"
      },
      {
        "step_number": 5,
        "action": "View order confirmation",
        "expected_result": "Order number and email confirmation displayed"
      }
    ],
    "ai_generated": false
  },
  "required_devices": ["Desktop", "Mobile"],
  "required_browsers": ["Chrome", "Safari"],
  "required_os": ["Windows", "macOS", "iOS"],
  "tester_level": "intermediate",
  "max_testers": 3,
  "assigned_testers": [
    {
      "tester_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
      "assigned_at": "2024-02-08T10:00:00Z",
      "status": "submitted"
    }
  ],
  "budget_per_tester_usd": 50.00,
  "total_budget_usd": 150.00,
  "deadline": "2024-02-15T23:59:59Z",
  "estimated_duration_minutes": 45,
  "status": "in_progress",
  "visibility": "public",
  "escrow_status": "held",
  "escrow_transaction_id": "ObjectId('65a1b2c3d4e5f6789abcdef4')",
  "submission_count": 1,
  "approved_submission_count": 0,
  "bugs_found": 0,
  "created_at": "2024-02-08T09:00:00Z",
  "updated_at": "2024-02-08T15:30:00Z",
  "published_at": "2024-02-08T09:30:00Z"
}
```

### Indexes

```javascript
db.jobs.createIndex({ project_id: 1 })
db.jobs.createIndex({ client_id: 1, status: 1 })
db.jobs.createIndex({ status: 1, visibility: 1 })
db.jobs.createIndex({ "assigned_testers.tester_id": 1 })
db.jobs.createIndex({ published_at: -1 })
db.jobs.createIndex({ deadline: 1 })
db.jobs.createIndex({ test_type: 1 })
db.jobs.createIndex({ tester_level: 1, status: 1 })
```

---

## 4. Submissions Collection

### Schema

```javascript
{
  _id: ObjectId,
  job_id: ObjectId,             // Reference to jobs
  tester_id: ObjectId,          // Reference to users
  
  // Submission content
  summary: String,              // Overall findings summary
  ai_enhanced_summary: String,  // AI-generated professional summary
  
  test_results: [{
    step_number: Number,        // Corresponds to job.user_journey.steps
    status: String,             // "passed" | "failed" | "blocked" | "skipped"
    notes: String,
    screenshots: [String],      // URLs to screenshot images
    timestamp: Date
  }],
  
  // Bug reports
  bugs: [{
    title: String,
    severity: String,           // "critical" | "high" | "medium" | "low"
    description: String,
    steps_to_reproduce: [String],
    expected_behavior: String,
    actual_behavior: String,
    screenshots: [String],      // URLs with annotations
    video_url: String,
    affected_devices: [String],
    affected_browsers: [String]
  }],
  
  // Test environment
  device_used: String,
  browser_used: String,
  browser_version: String,
  os_used: String,
  os_version: String,
  screen_resolution: String,
  
  // Timing
  time_spent_minutes: Number,
  
  // Status
  status: String,               // "draft" | "submitted" | "under_review" | "approved" | "rejected" | "revision_requested"
  client_feedback: String,
  revision_notes: String,
  
  // Payment
  payout_amount_usd: Number,
  payout_status: String,        // "pending" | "processing" | "paid" | "failed"
  payout_date: Date,
  
  // Metadata
  created_at: Date,
  submitted_at: Date,
  reviewed_at: Date,
  updated_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef5')",
  "job_id": "ObjectId('65a1b2c3d4e5f6789abcdef3')",
  "tester_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
  "summary": "Completed checkout flow testing on Safari/macOS. Found 2 critical issues with payment processing and 1 UI bug in the shipping form. All test steps executed successfully except payment confirmation which failed intermittently.",
  "ai_enhanced_summary": "Comprehensive checkout flow evaluation identified critical payment processing instability on Safari/macOS platform. Primary issue: intermittent payment confirmation failures (40% failure rate over 5 attempts). Secondary findings include shipping form UI misalignment. Recommend immediate attention to payment gateway integration.",
  "test_results": [
    {
      "step_number": 1,
      "status": "passed",
      "notes": "Item added successfully, price displayed correctly",
      "screenshots": ["https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/step1.png"],
      "timestamp": "2024-02-08T14:05:00Z"
    },
    {
      "step_number": 2,
      "status": "passed",
      "notes": "Checkout button works, form appears",
      "screenshots": ["https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/step2.png"],
      "timestamp": "2024-02-08T14:07:00Z"
    },
    {
      "step_number": 3,
      "status": "failed",
      "notes": "Shipping form has alignment issues - see bug report #1",
      "screenshots": [
        "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/step3-bug.png",
        "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/step3-annotated.png"
      ],
      "timestamp": "2024-02-08T14:10:00Z"
    },
    {
      "step_number": 4,
      "status": "failed",
      "notes": "Payment fails intermittently - see bug report #2",
      "screenshots": ["https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/step4-error.png"],
      "timestamp": "2024-02-08T14:15:00Z"
    },
    {
      "step_number": 5,
      "status": "blocked",
      "notes": "Could not reach confirmation due to payment failure",
      "screenshots": [],
      "timestamp": "2024-02-08T14:15:00Z"
    }
  ],
  "bugs": [
    {
      "title": "Shipping Form - ZIP Code Field Misaligned on Safari",
      "severity": "low",
      "description": "The ZIP code input field is misaligned by approximately 10px on Safari browser, breaking the visual grid layout.",
      "steps_to_reproduce": [
        "Navigate to checkout page",
        "Enter shipping information",
        "Observe ZIP code field alignment"
      ],
      "expected_behavior": "ZIP code field should align with other form fields",
      "actual_behavior": "ZIP code field is offset to the right, breaking the layout",
      "screenshots": [
        "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/bug1-annotated.png"
      ],
      "affected_devices": ["Desktop"],
      "affected_browsers": ["Safari"]
    },
    {
      "title": "Payment Processing Fails Intermittently",
      "severity": "critical",
      "description": "Payment submission fails approximately 40% of the time with error 'Payment gateway timeout'. No pattern identified - appears random.",
      "steps_to_reproduce": [
        "Complete checkout flow through shipping",
        "Enter test card 4242 4242 4242 4242",
        "Submit payment",
        "Observe failure (may require multiple attempts)"
      ],
      "expected_behavior": "Payment should process successfully and show confirmation",
      "actual_behavior": "Payment fails with timeout error, user is not charged but must restart",
      "screenshots": [
        "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/bug2-error.png",
        "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/bug2-console.png"
      ],
      "video_url": "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/payment-failure.mp4",
      "affected_devices": ["Desktop"],
      "affected_browsers": ["Safari"]
    }
  ],
  "device_used": "MacBook Pro 16-inch",
  "browser_used": "Safari",
  "browser_version": "17.2",
  "os_used": "macOS",
  "os_version": "14.2",
  "screen_resolution": "1920x1080",
  "time_spent_minutes": 42,
  "status": "submitted",
  "payout_amount_usd": 50.00,
  "payout_status": "pending",
  "created_at": "2024-02-08T14:00:00Z",
  "submitted_at": "2024-02-08T15:30:00Z",
  "updated_at": "2024-02-08T15:30:00Z"
}
```

### Indexes

```javascript
db.submissions.createIndex({ job_id: 1 })
db.submissions.createIndex({ tester_id: 1, status: 1 })
db.submissions.createIndex({ status: 1, submitted_at: -1 })
db.submissions.createIndex({ payout_status: 1 })
db.submissions.createIndex({ created_at: -1 })
```

---

## 5. Escrow Transactions Collection

### Schema

```javascript
{
  _id: ObjectId,
  job_id: ObjectId,             // Reference to jobs
  client_id: ObjectId,          // Reference to users
  
  // Transaction details
  amount_usd: Number,           // Total amount
  currency: String,             // "USD"
  
  // Stripe
  stripe_payment_intent_id: String,
  stripe_charge_id: String,
  
  // Status tracking
  status: String,               // "pending" | "authorized" | "captured" | "released" | "refunded" | "failed"
  
  // Lifecycle events
  events: [{
    event_type: String,         // "created" | "authorized" | "captured" | "released" | "refunded"
    amount_usd: Number,
    timestamp: Date,
    notes: String,
    performed_by: ObjectId      // User ID
  }],
  
  // Payouts to testers
  payouts: [{
    tester_id: ObjectId,
    submission_id: ObjectId,
    amount_usd: Number,
    platform_fee_usd: Number,   // PeerTest Hub's commission
    tester_payout_usd: Number,  // Amount paid to tester
    stripe_transfer_id: String,
    status: String,             // "pending" | "processing" | "completed" | "failed"
    completed_at: Date
  }],
  
  // Fees
  platform_fee_percentage: Number,  // e.g., 15
  platform_fee_usd: Number,
  stripe_fee_usd: Number,
  
  // Metadata
  created_at: Date,
  updated_at: Date,
  expires_at: Date              // For authorization expiration
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef4')",
  "job_id": "ObjectId('65a1b2c3d4e5f6789abcdef3')",
  "client_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "amount_usd": 150.00,
  "currency": "USD",
  "stripe_payment_intent_id": "pi_3MjKzRCRhkTQzfJ51EqnZjJj",
  "stripe_charge_id": "ch_3MjKzRCRhkTQzfJ51EqnZjJj",
  "status": "captured",
  "events": [
    {
      "event_type": "created",
      "amount_usd": 150.00,
      "timestamp": "2024-02-08T09:00:00Z",
      "notes": "Escrow transaction created for job",
      "performed_by": "ObjectId('65a1b2c3d4e5f6789abcdef0')"
    },
    {
      "event_type": "authorized",
      "amount_usd": 150.00,
      "timestamp": "2024-02-08T09:01:30Z",
      "notes": "Payment authorized via Stripe",
      "performed_by": "ObjectId('65a1b2c3d4e5f6789abcdef0')"
    },
    {
      "event_type": "captured",
      "amount_usd": 150.00,
      "timestamp": "2024-02-08T09:30:00Z",
      "notes": "Funds captured when job published",
      "performed_by": "ObjectId('65a1b2c3d4e5f6789abcdef0')"
    }
  ],
  "payouts": [
    {
      "tester_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
      "submission_id": "ObjectId('65a1b2c3d4e5f6789abcdef5')",
      "amount_usd": 50.00,
      "platform_fee_usd": 7.50,
      "tester_payout_usd": 42.50,
      "stripe_transfer_id": "tr_3MjKzRCRhkTQzfJ51EqnZjJj",
      "status": "pending",
      "completed_at": null
    }
  ],
  "platform_fee_percentage": 15,
  "platform_fee_usd": 22.50,
  "stripe_fee_usd": 4.65,
  "created_at": "2024-02-08T09:00:00Z",
  "updated_at": "2024-02-08T15:30:00Z",
  "expires_at": "2024-02-15T09:00:00Z"
}
```

### Indexes

```javascript
db.escrow_transactions.createIndex({ job_id: 1 }, { unique: true })
db.escrow_transactions.createIndex({ client_id: 1, status: 1 })
db.escrow_transactions.createIndex({ "payouts.tester_id": 1 })
db.escrow_transactions.createIndex({ status: 1 })
db.escrow_transactions.createIndex({ created_at: -1 })
db.escrow_transactions.createIndex({ stripe_payment_intent_id: 1 })
```

---

## 6. Disputes Collection

### Schema

```javascript
{
  _id: ObjectId,
  submission_id: ObjectId,      // Reference to submissions
  job_id: ObjectId,             // Reference to jobs
  
  // Parties
  raised_by_id: ObjectId,       // User who raised dispute
  raised_by_role: String,       // "client" | "tester"
  respondent_id: ObjectId,      // Other party
  
  // Dispute details
  reason: String,               // "incomplete_work" | "unfair_rejection" | "payment_issue" | "quality_issue" | "other"
  description: String,
  evidence: [{
    type: String,               // "screenshot" | "message" | "document"
    url: String,
    description: String,
    uploaded_at: Date
  }],
  
  // Status
  status: String,               // "open" | "under_review" | "resolved" | "closed"
  priority: String,             // "low" | "medium" | "high"
  
  // Resolution
  assigned_admin_id: ObjectId,  // Admin handling the dispute
  resolution: String,
  resolution_type: String,      // "refund" | "payment_released" | "partial_refund" | "no_action"
  resolved_in_favor_of: ObjectId, // User ID
  
  // Communication
  messages: [{
    from_id: ObjectId,
    message: String,
    attachments: [String],
    timestamp: Date
  }],
  
  // Metadata
  created_at: Date,
  updated_at: Date,
  resolved_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef6')",
  "submission_id": "ObjectId('65a1b2c3d4e5f6789abcdef5')",
  "job_id": "ObjectId('65a1b2c3d4e5f6789abcdef3')",
  "raised_by_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
  "raised_by_role": "tester",
  "respondent_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "reason": "unfair_rejection",
  "description": "Client rejected my submission without valid reason. I completed all test steps as requested and documented 2 critical bugs with detailed evidence. The rejection feedback was vague and did not specify what was insufficient.",
  "evidence": [
    {
      "type": "screenshot",
      "url": "https://storage.peertest.io/disputes/65a1b2c3d4e5f6789abcdef6/evidence1.png",
      "description": "Screenshot of completed submission showing all test steps",
      "uploaded_at": "2024-02-09T10:00:00Z"
    },
    {
      "type": "screenshot",
      "url": "https://storage.peertest.io/disputes/65a1b2c3d4e5f6789abcdef6/evidence2.png",
      "description": "Screenshot of rejection message from client",
      "uploaded_at": "2024-02-09T10:01:00Z"
    }
  ],
  "status": "under_review",
  "priority": "medium",
  "assigned_admin_id": "ObjectId('65a1b2c3d4e5f6789abcdef7')",
  "messages": [
    {
      "from_id": "ObjectId('65a1b2c3d4e5f6789abcdef7')",
      "message": "Thank you for raising this dispute. I'm reviewing both the submission and the client's feedback. I'll provide a resolution within 48 hours.",
      "attachments": [],
      "timestamp": "2024-02-09T11:30:00Z"
    }
  ],
  "created_at": "2024-02-09T10:00:00Z",
  "updated_at": "2024-02-09T11:30:00Z"
}
```

### Indexes

```javascript
db.disputes.createIndex({ submission_id: 1 })
db.disputes.createIndex({ job_id: 1 })
db.disputes.createIndex({ raised_by_id: 1, status: 1 })
db.disputes.createIndex({ assigned_admin_id: 1, status: 1 })
db.disputes.createIndex({ status: 1, priority: 1 })
db.disputes.createIndex({ created_at: -1 })
```

---

## 7. Ratings Collection

### Schema

```javascript
{
  _id: ObjectId,
  submission_id: ObjectId,      // Reference to submissions
  job_id: ObjectId,             // Reference to jobs
  
  // Parties
  rated_by_id: ObjectId,        // User giving rating
  rated_user_id: ObjectId,      // User being rated
  rated_user_role: String,      // "client" | "tester"
  
  // Rating
  overall_rating: Number,       // 1-5
  
  // Detailed ratings (for testers)
  detail_ratings: {
    quality: Number,            // 1-5
    communication: Number,      // 1-5
    timeliness: Number,         // 1-5
    professionalism: Number     // 1-5
  },
  
  // Feedback
  review_text: String,
  pros: [String],
  cons: [String],
  
  // Public visibility
  is_public: Boolean,
  
  // Response
  response_text: String,        // Rated user can respond
  response_date: Date,
  
  // Metadata
  created_at: Date,
  updated_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef8')",
  "submission_id": "ObjectId('65a1b2c3d4e5f6789abcdef5')",
  "job_id": "ObjectId('65a1b2c3d4e5f6789abcdef3')",
  "rated_by_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "rated_user_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
  "rated_user_role": "tester",
  "overall_rating": 5,
  "detail_ratings": {
    "quality": 5,
    "communication": 5,
    "timeliness": 5,
    "professionalism": 5
  },
  "review_text": "Excellent work! Sarah found critical bugs that we missed in our internal QA. Her documentation was thorough and the annotated screenshots were very helpful. Would definitely work with her again.",
  "pros": [
    "Thorough testing",
    "Clear documentation",
    "Found critical issues",
    "Fast turnaround"
  ],
  "cons": [],
  "is_public": true,
  "created_at": "2024-02-10T09:00:00Z",
  "updated_at": "2024-02-10T09:00:00Z"
}
```

### Indexes

```javascript
db.ratings.createIndex({ submission_id: 1 }, { unique: true })
db.ratings.createIndex({ rated_user_id: 1, is_public: 1 })
db.ratings.createIndex({ rated_by_id: 1 })
db.ratings.createIndex({ overall_rating: 1 })
db.ratings.createIndex({ created_at: -1 })
```

---

## 8. Notifications Collection

### Schema

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,            // Recipient
  
  // Notification content
  type: String,                 // "job_posted" | "job_assigned" | "submission_received" | "submission_approved" | "submission_rejected" | "payment_received" | "rating_received" | "dispute_update" | "system"
  title: String,
  message: String,
  
  // Related entities
  related_job_id: ObjectId,
  related_submission_id: ObjectId,
  related_user_id: ObjectId,
  
  // Action URL
  action_url: String,           // Frontend route to navigate to
  action_text: String,          // "View Job" | "View Submission" | etc.
  
  // Status
  is_read: Boolean,
  read_at: Date,
  
  // Delivery
  sent_email: Boolean,
  email_sent_at: Date,
  
  // Metadata
  created_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdef9')",
  "user_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
  "type": "submission_approved",
  "title": "Submission Approved",
  "message": "Your submission for 'Checkout Flow - Payment Integration Testing' has been approved by the client. Payment of $50.00 has been processed.",
  "related_job_id": "ObjectId('65a1b2c3d4e5f6789abcdef3')",
  "related_submission_id": "ObjectId('65a1b2c3d4e5f6789abcdef5')",
  "related_user_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "action_url": "/submissions/65a1b2c3d4e5f6789abcdef5",
  "action_text": "View Submission",
  "is_read": false,
  "sent_email": true,
  "email_sent_at": "2024-02-10T09:05:00Z",
  "created_at": "2024-02-10T09:00:00Z"
}
```

### Indexes

```javascript
db.notifications.createIndex({ user_id: 1, created_at: -1 })
db.notifications.createIndex({ user_id: 1, is_read: 1 })
db.notifications.createIndex({ type: 1 })
db.notifications.createIndex({ created_at: -1 })
```

---

## 9. AI Test Templates Collection

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,             // "e-commerce" | "saas" | "mobile-app" | "api" | "general"
  
  // Template structure
  template_type: String,        // "user_journey" | "test_checklist" | "exploratory_guide"
  
  journey_template: {
    scenario: String,
    variables: [{              // Placeholders to customize
      name: String,
      description: String,
      example: String
    }],
    steps: [{
      step_number: Number,
      action_template: String,
      expected_result_template: String
    }]
  },
  
  // AI enhancement
  openai_system_prompt: String, // For GPT enhancement
  enhancement_instructions: String,
  
  // Usage
  usage_count: Number,
  
  // Status
  is_active: Boolean,
  is_premium: Boolean,          // Requires pro plan
  
  // Metadata
  created_by_id: ObjectId,      // Admin who created
  created_at: Date,
  updated_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdefa')",
  "name": "E-commerce Checkout Flow",
  "description": "Standard test template for e-commerce checkout processes including cart, shipping, and payment",
  "category": "e-commerce",
  "template_type": "user_journey",
  "journey_template": {
    "scenario": "Complete a purchase from adding item to cart through successful payment and confirmation",
    "variables": [
      {
        "name": "product_name",
        "description": "Name of the product to purchase",
        "example": "Premium Widget"
      },
      {
        "name": "product_price",
        "description": "Expected price of the product",
        "example": "$99.99"
      }
    ],
    "steps": [
      {
        "step_number": 1,
        "action_template": "Navigate to product page and add {{product_name}} to cart",
        "expected_result_template": "Product appears in cart with price {{product_price}}"
      },
      {
        "step_number": 2,
        "action_template": "Click 'Proceed to Checkout' or 'Checkout' button",
        "expected_result_template": "Checkout page loads with cart summary"
      },
      {
        "step_number": 3,
        "action_template": "Enter shipping information and continue",
        "expected_result_template": "Shipping information saved, payment page appears"
      },
      {
        "step_number": 4,
        "action_template": "Enter payment information and submit order",
        "expected_result_template": "Payment processes successfully"
      },
      {
        "step_number": 5,
        "action_template": "View order confirmation page",
        "expected_result_template": "Order confirmation with order number and email confirmation"
      }
    ]
  },
  "openai_system_prompt": "You are a QA expert helping to create comprehensive test scenarios. Enhance the provided e-commerce checkout test template with specific details based on the user's product and requirements. Maintain the core flow but add relevant edge cases and validation points.",
  "enhancement_instructions": "Add 2-3 additional validation steps for each main step. Include edge cases like invalid payment info, expired cards, and shipping address validation.",
  "usage_count": 0,
  "is_active": true,
  "is_premium": false,
  "created_by_id": "ObjectId('65a1b2c3d4e5f6789abcdef7')",
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z"
}
```

### Indexes

```javascript
db.ai_test_templates.createIndex({ category: 1, is_active: 1 })
db.ai_test_templates.createIndex({ is_premium: 1 })
db.ai_test_templates.createIndex({ usage_count: -1 })
db.ai_test_templates.createIndex({ name: "text", description: "text" })
```

---

## 10. Qualification Tests Collection

### Schema

```javascript
{
  _id: ObjectId,
  tester_id: ObjectId,          // Reference to users
  
  // Test details
  test_type: String,            // "initial" | "skill_assessment" | "recertification"
  test_version: String,         // "v1.0"
  
  // Questions and answers
  questions: [{
    question_id: String,
    question_text: String,
    question_type: String,      // "multiple_choice" | "practical" | "essay"
    correct_answer: String,     // For multiple choice
    tester_answer: String,
    is_correct: Boolean,
    points: Number
  }],
  
  // Practical task (if applicable)
  practical_task: {
    task_description: String,
    submission_url: String,
    evaluator_id: ObjectId,
    evaluation_notes: String,
    score: Number               // 0-100
  },
  
  // Results
  total_score: Number,          // 0-100
  passing_score: Number,        // e.g., 70
  passed: Boolean,
  
  // Feedback
  feedback: String,
  areas_for_improvement: [String],
  
  // Status
  status: String,               // "in_progress" | "submitted" | "evaluated" | "passed" | "failed"
  
  // Metadata
  started_at: Date,
  submitted_at: Date,
  evaluated_at: Date,
  expires_at: Date              // Certification expiration
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdefb')",
  "tester_id": "ObjectId('65a1b2c3d4e5f6789abcdef1')",
  "test_type": "initial",
  "test_version": "v1.0",
  "questions": [
    {
      "question_id": "q1",
      "question_text": "What severity level should be assigned to a bug that prevents users from completing a purchase?",
      "question_type": "multiple_choice",
      "correct_answer": "critical",
      "tester_answer": "critical",
      "is_correct": true,
      "points": 10
    },
    {
      "question_id": "q2",
      "question_text": "When documenting a bug, which of the following is MOST important?",
      "question_type": "multiple_choice",
      "correct_answer": "Clear steps to reproduce",
      "tester_answer": "Clear steps to reproduce",
      "is_correct": true,
      "points": 10
    }
  ],
  "practical_task": {
    "task_description": "Test the sample checkout flow and document any bugs you find with screenshots",
    "submission_url": "https://storage.peertest.io/qualifications/65a1b2c3d4e5f6789abcdefb/practical.pdf",
    "evaluator_id": "ObjectId('65a1b2c3d4e5f6789abcdef7')",
    "evaluation_notes": "Excellent work. Found 3/3 intentional bugs with clear documentation.",
    "score": 95
  },
  "total_score": 92,
  "passing_score": 70,
  "passed": true,
  "feedback": "Great job! You demonstrated strong understanding of bug severity, documentation standards, and practical testing skills.",
  "areas_for_improvement": [
    "Consider adding more detail in expected vs actual behavior descriptions"
  ],
  "status": "passed",
  "started_at": "2023-11-20T09:00:00Z",
  "submitted_at": "2023-11-20T10:30:00Z",
  "evaluated_at": "2023-11-20T15:00:00Z",
  "expires_at": "2024-11-20T00:00:00Z"
}
```

### Indexes

```javascript
db.qualification_tests.createIndex({ tester_id: 1, test_type: 1 })
db.qualification_tests.createIndex({ status: 1 })
db.qualification_tests.createIndex({ passed: 1 })
db.qualification_tests.createIndex({ evaluated_at: -1 })
db.qualification_tests.createIndex({ expires_at: 1 })
```

---

## 11. Organizations Collection (Innovation Group)

### Schema

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,                 // Unique URL identifier
  
  // Organization details
  description: String,
  logo_url: String,
  website: String,
  industry: String,
  size: String,                 // "1-10" | "11-50" | "51-200" | "201-1000" | "1000+"
  
  // Plan and billing
  plan: String,                 // "team" | "enterprise"
  billing_email: String,
  stripe_customer_id: String,
  
  // Settings
  settings: {
    require_approval_for_jobs: Boolean,
    default_project_visibility: String, // "organization" | "public"
    allow_external_testers: Boolean,
    custom_branding: Boolean
  },
  
  // Limits based on plan
  limits: {
    max_members: Number,
    max_concurrent_jobs: Number,
    max_projects: Number
  },
  
  // Usage tracking
  usage: {
    member_count: Number,
    active_jobs_count: Number,
    projects_count: Number
  },
  
  // Status
  status: String,               // "active" | "suspended" | "trial"
  trial_ends_at: Date,
  
  // Metadata
  created_by_id: ObjectId,      // Owner
  created_at: Date,
  updated_at: Date
}
```

### Example Document

```json
{
  "_id": "ObjectId('65a1b2c3d4e5f6789abcdefc')",
  "name": "TechCorp QA Team",
  "slug": "techcorp-qa",
  "description": "Quality Assurance department for TechCorp products",
  "logo_url": "https://storage.peertest.io/orgs/techcorp-qa/logo.png",
  "website": "https://techcorp.com",
  "industry": "SaaS",
  "size": "51-200",
  "plan": "team",
  "billing_email": "billing@techcorp.com",
  "stripe_customer_id": "cus_NffrFeUfNV2Hib",
  "settings": {
    "require_approval_for_jobs": true,
    "default_project_visibility": "organization",
    "allow_external_testers": true,
    "custom_branding": false
  },
  "limits": {
    "max_members": 20,
    "max_concurrent_jobs": 10,
    "max_projects": 50
  },
  "usage": {
    "member_count": 8,
    "active_jobs_count": 3,
    "projects_count": 12
  },
  "status": "active",
  "created_by_id": "ObjectId('65a1b2c3d4e5f6789abcdef0')",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-02-10T09:00:00Z"
}
```

### Indexes

```javascript
db.organizations.createIndex({ slug: 1 }, { unique: true })
db.organizations.createIndex({ status: 1 })
db.organizations.createIndex({ created_by_id: 1 })
```

---

## Relationships Between Collections

### Entity Relationship Diagram (Textual)

```
users (client)
  ├─→ projects (client_id)
  │     └─→ jobs (project_id)
  │           ├─→ submissions (job_id)
  │           │     ├─→ disputes (submission_id)
  │           │     └─→ ratings (submission_id)
  │           └─→ escrow_transactions (job_id)
  │
  ├─→ jobs (client_id)
  └─→ organizations (via organization_id)

users (tester)
  ├─→ submissions (tester_id)
  │     ├─→ disputes (raised_by_id)
  │     └─→ ratings (rated_user_id)
  │
  ├─→ qualification_tests (tester_id)
  └─→ jobs.assigned_testers (tester_id)

ai_test_templates
  └─→ jobs.user_journey.ai_template_id

notifications
  ├─→ users (user_id)
  ├─→ jobs (related_job_id)
  └─→ submissions (related_submission_id)

organizations
  └─→ users (organization_id)
        └─→ projects (organization_id)
```

### Key Relationships

1. **Client → Project → Job Flow**
   - A client creates projects
   - Projects contain multiple jobs
   - Jobs have escrow transactions

2. **Tester → Submission Flow**
   - Testers claim jobs
   - Testers submit submissions
   - Submissions can be rated and disputed

3. **Payment Flow**
   - Job creation → Escrow transaction (authorized)
   - Job published → Escrow captured
   - Submission approved → Payout to tester

4. **Organization Hierarchy**
   - Organizations contain users
   - Users create projects under organizations
   - Team billing aggregates all organization activity

---

## Data Migration Considerations

### Initial Data Setup

```javascript
// Create admin user
db.users.insertOne({
  email: "admin@peertest.io",
  password_hash: "$2b$12$...",
  full_name: "PeerTest Admin",
  role: "admin",
  status: "active",
  email_verified: true,
  created_at: new Date(),
  updated_at: new Date()
})

// Create sample test templates
db.ai_test_templates.insertMany([
  // E-commerce templates
  // SaaS templates
  // Mobile app templates
])
```

### Backup Strategy

```bash
# Daily backup
mongodump --uri="mongodb://localhost:27017/peertest_hub" --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://localhost:27017/peertest_hub" /backups/20240210
```

---

## Assumptions and Alternatives

### Assumptions
1. **MongoDB 5.0+** for improved schema validation and aggregation
2. **Single-region deployment** initially (can add replica sets later)
3. **USD currency only** for MVP (multi-currency in V2)
4. **Stripe** as payment processor (alternatives: PayPal, bank transfers)

### Alternative Approaches

1. **SQL vs NoSQL**: Could use PostgreSQL with JSONB columns for flexibility
2. **Separate payment database**: Could isolate financial transactions in separate DB
3. **Time-series collection**: Could use MongoDB time-series for analytics
4. **Sharding strategy**: Shard by organization_id for Innovation Group scale

### Performance Considerations

- **Compound indexes** on frequently queried fields
- **Denormalization** for dashboard queries (e.g., user stats)
- **Caching layer** (Redis) for hot data like job listings
- **Archive old data**: Move completed jobs older than 1 year to archive collection

---

## Next Steps

1. **Set up MongoDB Atlas** or local instance
2. **Implement schemas** with Mongoose/Motor
3. **Create seed data** for development
4. **Build API layer** using FastAPI (see 04-API-Specification.md)
5. **Implement data validation** at application layer
6. **Set up monitoring** for query performance

