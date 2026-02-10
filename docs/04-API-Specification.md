# PeerTest Hub - API Specification

## Overview

This document defines the complete REST API for PeerTest Hub built with **FastAPI**. All endpoints use JSON for request/response bodies unless otherwise specified.

**Base URL:** `https://api.peertest.io/v1`  
**Authentication:** JWT Bearer tokens  
**API Version:** v1

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Management](#2-user-management)
3. [Projects](#3-projects)
4. [Jobs](#4-jobs)
5. [Submissions](#5-submissions)
6. [Ratings](#6-ratings)
7. [Disputes](#7-disputes)
8. [Payments & Escrow](#8-payments--escrow)
9. [Notifications](#9-notifications)
10. [AI Features](#10-ai-features)
11. [Organizations](#11-organizations)
12. [Admin](#12-admin)
13. [Error Handling](#13-error-handling)
14. [Rate Limiting](#14-rate-limiting)

---

## 1. Authentication & Authorization

### 1.1 Register User

**Endpoint:** `POST /auth/register`  
**Public:** Yes  
**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "role": "client"
}
```

**Response:** `201 Created`
```json
{
  "user_id": "65a1b2c3d4e5f6789abcdef0",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "client",
  "email_verified": false,
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Errors:**
- `400` - Invalid email format or weak password
- `409` - Email already registered

---

### 1.2 Login

**Endpoint:** `POST /auth/login`  
**Public:** Yes  
**Description:** Authenticate and receive JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "65a1b2c3d4e5f6789abcdef0",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "client",
    "status": "active"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account suspended or not verified

---

### 1.3 Refresh Token

**Endpoint:** `POST /auth/refresh`  
**Public:** Yes  
**Description:** Get new access token using refresh token

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

### 1.4 Verify Email

**Endpoint:** `POST /auth/verify-email`  
**Public:** Yes

**Request Body:**
```json
{
  "token": "abc123def456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully"
}
```

---

### 1.5 Request Password Reset

**Endpoint:** `POST /auth/forgot-password`  
**Public:** Yes

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset email sent"
}
```

---

### 1.6 Reset Password

**Endpoint:** `POST /auth/reset-password`  
**Public:** Yes

**Request Body:**
```json
{
  "token": "abc123def456",
  "new_password": "NewSecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successful"
}
```

---

## 2. User Management

### 2.1 Get Current User Profile

**Endpoint:** `GET /users/me`  
**Auth Required:** Yes  
**Permissions:** Any authenticated user

**Response:** `200 OK`
```json
{
  "user_id": "65a1b2c3d4e5f6789abcdef0",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "client",
  "status": "active",
  "profile": {
    "bio": "Product Manager",
    "avatar_url": "https://storage.peertest.io/avatars/john.jpg",
    "timezone": "America/New_York",
    "country": "US"
  },
  "client_data": {
    "company_name": "TechCorp",
    "membership_tier": "pro"
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 2.2 Update User Profile

**Endpoint:** `PATCH /users/me`  
**Auth Required:** Yes  
**Permissions:** Any authenticated user

**Request Body:**
```json
{
  "full_name": "John Smith",
  "profile": {
    "bio": "Senior Product Manager",
    "timezone": "America/Los_Angeles"
  }
}
```

**Response:** `200 OK` - Returns updated user object

---

### 2.3 Update Notification Preferences

**Endpoint:** `PATCH /users/me/notifications`  
**Auth Required:** Yes

**Request Body:**
```json
{
  "notification_preferences": {
    "email_new_job": true,
    "email_job_assigned": true,
    "in_app_notifications": true
  }
}
```

**Response:** `200 OK`

---

### 2.4 Get Tester Profile (Public)

**Endpoint:** `GET /users/testers/{tester_id}`  
**Auth Required:** No  
**Description:** Get public tester profile for reputation view

**Response:** `200 OK`
```json
{
  "user_id": "65a1b2c3d4e5f6789abcdef1",
  "full_name": "Sarah Johnson",
  "profile": {
    "bio": "QA professional with 5 years experience",
    "avatar_url": "https://storage.peertest.io/avatars/sarah.jpg"
  },
  "tester_data": {
    "specializations": ["web", "mobile"],
    "experience_level": "expert",
    "total_jobs_completed": 28,
    "average_rating": 4.8,
    "success_rate": 96.4
  },
  "recent_ratings": [
    {
      "rating": 5,
      "review_text": "Excellent work!",
      "client_name": "John D.",
      "created_at": "2024-02-10T09:00:00Z"
    }
  ]
}
```

---

### 2.5 Update Tester Settings

**Endpoint:** `PATCH /users/me/tester-settings`  
**Auth Required:** Yes  
**Permissions:** Tester only

**Request Body:**
```json
{
  "tester_data": {
    "specializations": ["web", "mobile", "api"],
    "devices": ["iPhone 14", "MacBook Pro"],
    "hourly_rate_usd": 40,
    "availability": "part-time"
  }
}
```

**Response:** `200 OK`

---

### 2.6 Setup Stripe Connect (Tester Payout)

**Endpoint:** `POST /users/me/stripe-connect`  
**Auth Required:** Yes  
**Permissions:** Tester only

**Response:** `200 OK`
```json
{
  "stripe_connect_url": "https://connect.stripe.com/express/oauth/authorize?...",
  "message": "Complete Stripe Connect setup to receive payouts"
}
```

---

## 3. Projects

### 3.1 List Projects

**Endpoint:** `GET /projects`  
**Auth Required:** Yes  
**Permissions:** Client sees own, Admin sees all

**Query Parameters:**
- `status` (optional): `active` | `archived` | `draft`
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "projects": [
    {
      "project_id": "65a1b2c3d4e5f6789abcdef2",
      "name": "E-commerce Platform",
      "project_type": "web",
      "status": "active",
      "jobs_count": 5,
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

---

### 3.2 Create Project

**Endpoint:** `POST /projects`  
**Auth Required:** Yes  
**Permissions:** Client, Admin

**Request Body:**
```json
{
  "name": "Mobile App - iOS",
  "description": "Testing for our iOS mobile application",
  "project_type": "mobile",
  "url": "https://apps.apple.com/app/myapp",
  "environment": "production",
  "credentials": {
    "username": "test_user",
    "password": "test_pass",
    "additional_info": "Use USA region"
  },
  "target_devices": ["iPhone", "iPad"],
  "target_browsers": ["Safari"],
  "target_os": ["iOS 17"]
}
```

**Response:** `201 Created`
```json
{
  "project_id": "65a1b2c3d4e5f6789abcdef2",
  "name": "Mobile App - iOS",
  "status": "active",
  "created_at": "2024-02-10T10:00:00Z"
}
```

---

### 3.3 Get Project Details

**Endpoint:** `GET /projects/{project_id}`  
**Auth Required:** Yes  
**Permissions:** Project owner, Admin

**Response:** `200 OK` - Full project object with credentials

---

### 3.4 Update Project

**Endpoint:** `PATCH /projects/{project_id}`  
**Auth Required:** Yes  
**Permissions:** Project owner, Admin

**Request Body:** Partial project fields

**Response:** `200 OK`

---

### 3.5 Archive Project

**Endpoint:** `DELETE /projects/{project_id}`  
**Auth Required:** Yes  
**Permissions:** Project owner, Admin

**Response:** `200 OK`
```json
{
  "message": "Project archived successfully"
}
```

---

## 4. Jobs

### 4.1 List Jobs (Marketplace)

**Endpoint:** `GET /jobs`  
**Auth Required:** Optional (public marketplace)  
**Description:** List available jobs for testers

**Query Parameters:**
- `status` (optional): `open` | `in_progress` | `completed`
- `test_type` (optional): `exploratory` | `regression` | `user_journey`
- `tester_level` (optional): `beginner` | `intermediate` | `expert`
- `min_budget` (optional): Number
- `max_budget` (optional): Number
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "jobs": [
    {
      "job_id": "65a1b2c3d4e5f6789abcdef3",
      "title": "Checkout Flow Testing",
      "test_type": "user_journey",
      "budget_per_tester_usd": 50.00,
      "deadline": "2024-02-15T23:59:59Z",
      "required_devices": ["Desktop", "Mobile"],
      "tester_level": "intermediate",
      "max_testers": 3,
      "assigned_count": 1,
      "status": "open",
      "client": {
        "company_name": "TechCorp",
        "rating": 4.9
      },
      "created_at": "2024-02-08T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 4.2 Get Job Details

**Endpoint:** `GET /jobs/{job_id}`  
**Auth Required:** Yes (for full details) / Optional (for preview)  
**Permissions:** Public preview, full details for assigned testers and client

**Response:** `200 OK`
```json
{
  "job_id": "65a1b2c3d4e5f6789abcdef3",
  "project_id": "65a1b2c3d4e5f6789abcdef2",
  "title": "Checkout Flow Testing",
  "description": "Test the complete checkout process...",
  "test_type": "user_journey",
  "user_journey": {
    "scenario": "Complete purchase flow",
    "steps": [
      {
        "step_number": 1,
        "action": "Add item to cart",
        "expected_result": "Item appears in cart"
      }
    ]
  },
  "required_devices": ["Desktop", "Mobile"],
  "required_browsers": ["Chrome", "Safari"],
  "tester_level": "intermediate",
  "budget_per_tester_usd": 50.00,
  "deadline": "2024-02-15T23:59:59Z",
  "estimated_duration_minutes": 45,
  "status": "open",
  "project": {
    "name": "E-commerce Platform",
    "url": "https://shop.techcorp.com",
    "credentials": {
      "username": "test_user",
      "password": "test_pass"
    }
  },
  "created_at": "2024-02-08T09:00:00Z"
}
```

---

### 4.3 Create Job

**Endpoint:** `POST /jobs`  
**Auth Required:** Yes  
**Permissions:** Client, Admin

**Request Body:**
```json
{
  "project_id": "65a1b2c3d4e5f6789abcdef2",
  "title": "Homepage Responsive Testing",
  "description": "Test homepage across different screen sizes",
  "test_type": "exploratory",
  "user_journey": {
    "scenario": "Navigate homepage and test key interactions",
    "steps": [
      {
        "step_number": 1,
        "action": "Load homepage",
        "expected_result": "Page loads within 3 seconds"
      }
    ]
  },
  "required_devices": ["Desktop", "Tablet", "Mobile"],
  "required_browsers": ["Chrome", "Firefox", "Safari"],
  "tester_level": "intermediate",
  "max_testers": 2,
  "budget_per_tester_usd": 35.00,
  "deadline": "2024-02-20T23:59:59Z",
  "estimated_duration_minutes": 30,
  "visibility": "public"
}
```

**Response:** `201 Created`
```json
{
  "job_id": "65a1b2c3d4e5f6789abcdef3",
  "status": "draft",
  "total_budget_usd": 70.00,
  "escrow_required": true,
  "message": "Job created. Complete payment to publish."
}
```

**Notes:** Job starts in `draft` status. Must complete escrow payment to publish.

---

### 4.4 Publish Job (with Escrow Payment)

**Endpoint:** `POST /jobs/{job_id}/publish`  
**Auth Required:** Yes  
**Permissions:** Job owner

**Request Body:**
```json
{
  "payment_method_id": "pm_1MvQeRCRhkTQzfJ5abc123"
}
```

**Response:** `200 OK`
```json
{
  "job_id": "65a1b2c3d4e5f6789abcdef3",
  "status": "open",
  "escrow_transaction_id": "65a1b2c3d4e5f6789abcdef4",
  "escrow_status": "captured",
  "published_at": "2024-02-08T09:30:00Z",
  "message": "Job published successfully"
}
```

**Errors:**
- `402` - Payment failed
- `400` - Job already published

---

### 4.5 Claim/Apply for Job

**Endpoint:** `POST /jobs/{job_id}/claim`  
**Auth Required:** Yes  
**Permissions:** Qualified tester

**Response:** `200 OK`
```json
{
  "message": "Job claimed successfully",
  "assignment_id": "65a1b2c3d4e5f6789abcdef9",
  "assigned_at": "2024-02-08T10:00:00Z"
}
```

**Errors:**
- `403` - Not qualified or job full
- `409` - Already claimed

---

### 4.6 Update Job

**Endpoint:** `PATCH /jobs/{job_id}`  
**Auth Required:** Yes  
**Permissions:** Job owner, Admin

**Request Body:** Partial job fields (limited after publication)

**Response:** `200 OK`

**Notes:** Cannot change budget or requirements after testers are assigned.

---

### 4.7 Cancel Job

**Endpoint:** `POST /jobs/{job_id}/cancel`  
**Auth Required:** Yes  
**Permissions:** Job owner, Admin

**Response:** `200 OK`
```json
{
  "message": "Job cancelled",
  "refund_amount_usd": 150.00,
  "refund_status": "processing"
}
```

---

### 4.8 Get My Jobs (Client View)

**Endpoint:** `GET /jobs/my-jobs`  
**Auth Required:** Yes  
**Permissions:** Client

**Query Parameters:**
- `status` (optional)
- `page`, `limit`

**Response:** `200 OK` - List of client's jobs with stats

---

### 4.9 Get My Assignments (Tester View)

**Endpoint:** `GET /jobs/my-assignments`  
**Auth Required:** Yes  
**Permissions:** Tester

**Response:** `200 OK`
```json
{
  "assignments": [
    {
      "job_id": "65a1b2c3d4e5f6789abcdef3",
      "title": "Checkout Flow Testing",
      "status": "in_progress",
      "budget_per_tester_usd": 50.00,
      "deadline": "2024-02-15T23:59:59Z",
      "assigned_at": "2024-02-08T10:00:00Z",
      "submission_status": "draft"
    }
  ]
}
```

---

## 5. Submissions

### 5.1 Create Submission (Draft)

**Endpoint:** `POST /submissions`  
**Auth Required:** Yes  
**Permissions:** Assigned tester

**Request Body:**
```json
{
  "job_id": "65a1b2c3d4e5f6789abcdef3",
  "summary": "Initial testing notes...",
  "test_results": [
    {
      "step_number": 1,
      "status": "passed",
      "notes": "Step completed successfully",
      "screenshots": [],
      "timestamp": "2024-02-08T14:05:00Z"
    }
  ],
  "bugs": [],
  "device_used": "MacBook Pro",
  "browser_used": "Safari",
  "browser_version": "17.2",
  "os_used": "macOS",
  "os_version": "14.2"
}
```

**Response:** `201 Created`
```json
{
  "submission_id": "65a1b2c3d4e5f6789abcdef5",
  "status": "draft",
  "created_at": "2024-02-08T14:00:00Z"
}
```

---

### 5.2 Upload Screenshot

**Endpoint:** `POST /submissions/{submission_id}/screenshots`  
**Auth Required:** Yes  
**Permissions:** Submission owner  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Image file (PNG, JPEG)
- `step_number` (optional): Number
- `bug_index` (optional): Number

**Response:** `200 OK`
```json
{
  "screenshot_url": "https://storage.peertest.io/submissions/65a1b2c3d4e5f6789abcdef5/screenshot1.png",
  "uploaded_at": "2024-02-08T14:10:00Z"
}
```

---

### 5.3 Update Submission

**Endpoint:** `PATCH /submissions/{submission_id}`  
**Auth Required:** Yes  
**Permissions:** Submission owner (before submission), Admin

**Request Body:** Partial submission fields

**Response:** `200 OK`

---

### 5.4 Submit for Review

**Endpoint:** `POST /submissions/{submission_id}/submit`  
**Auth Required:** Yes  
**Permissions:** Submission owner

**Response:** `200 OK`
```json
{
  "submission_id": "65a1b2c3d4e5f6789abcdef5",
  "status": "submitted",
  "submitted_at": "2024-02-08T15:30:00Z",
  "ai_enhanced_summary": "Comprehensive checkout flow evaluation...",
  "message": "Submission submitted for client review"
}
```

**Notes:** Triggers AI enhancement of summary if enabled.

---

### 5.5 Get Submission Details

**Endpoint:** `GET /submissions/{submission_id}`  
**Auth Required:** Yes  
**Permissions:** Submission owner, Job owner, Admin

**Response:** `200 OK` - Full submission object

---

### 5.6 List Submissions for Job

**Endpoint:** `GET /jobs/{job_id}/submissions`  
**Auth Required:** Yes  
**Permissions:** Job owner, Admin

**Response:** `200 OK`
```json
{
  "submissions": [
    {
      "submission_id": "65a1b2c3d4e5f6789abcdef5",
      "tester": {
        "tester_id": "65a1b2c3d4e5f6789abcdef1",
        "full_name": "Sarah Johnson",
        "avatar_url": "https://...",
        "average_rating": 4.8
      },
      "status": "submitted",
      "bugs_found": 2,
      "time_spent_minutes": 42,
      "submitted_at": "2024-02-08T15:30:00Z"
    }
  ]
}
```

---

### 5.7 Approve Submission

**Endpoint:** `POST /submissions/{submission_id}/approve`  
**Auth Required:** Yes  
**Permissions:** Job owner, Admin

**Request Body:**
```json
{
  "feedback": "Great work! Very thorough testing."
}
```

**Response:** `200 OK`
```json
{
  "submission_id": "65a1b2c3d4e5f6789abcdef5",
  "status": "approved",
  "payout_amount_usd": 50.00,
  "payout_status": "processing",
  "message": "Submission approved, payment processing"
}
```

**Notes:** Triggers payout to tester from escrow.

---

### 5.8 Reject Submission

**Endpoint:** `POST /submissions/{submission_id}/reject`  
**Auth Required:** Yes  
**Permissions:** Job owner, Admin

**Request Body:**
```json
{
  "feedback": "Testing was incomplete. Steps 3-5 were not executed.",
  "allow_resubmit": true
}
```

**Response:** `200 OK`

---

### 5.9 Request Revision

**Endpoint:** `POST /submissions/{submission_id}/request-revision`  
**Auth Required:** Yes  
**Permissions:** Job owner

**Request Body:**
```json
{
  "revision_notes": "Please provide more detail on bug #2 reproduction steps"
}
```

**Response:** `200 OK`

---

## 6. Ratings

### 6.1 Rate Submission

**Endpoint:** `POST /ratings`  
**Auth Required:** Yes  
**Permissions:** Job owner (rate tester) or Tester (rate client)

**Request Body:**
```json
{
  "submission_id": "65a1b2c3d4e5f6789abcdef5",
  "overall_rating": 5,
  "detail_ratings": {
    "quality": 5,
    "communication": 5,
    "timeliness": 5,
    "professionalism": 5
  },
  "review_text": "Excellent work! Very professional.",
  "pros": ["Thorough testing", "Clear documentation"],
  "cons": [],
  "is_public": true
}
```

**Response:** `201 Created`
```json
{
  "rating_id": "65a1b2c3d4e5f6789abcdef8",
  "created_at": "2024-02-10T09:00:00Z"
}
```

---

### 6.2 Get Ratings for User

**Endpoint:** `GET /users/{user_id}/ratings`  
**Auth Required:** Optional  
**Description:** Get public ratings for a user

**Query Parameters:**
- `page`, `limit`

**Response:** `200 OK`
```json
{
  "ratings": [
    {
      "rating_id": "65a1b2c3d4e5f6789abcdef8",
      "overall_rating": 5,
      "review_text": "Excellent work!",
      "rated_by": "John D.",
      "created_at": "2024-02-10T09:00:00Z"
    }
  ],
  "stats": {
    "average_rating": 4.8,
    "total_ratings": 28
  }
}
```

---

### 6.3 Respond to Rating

**Endpoint:** `POST /ratings/{rating_id}/respond`  
**Auth Required:** Yes  
**Permissions:** Rated user

**Request Body:**
```json
{
  "response_text": "Thank you for the positive feedback!"
}
```

**Response:** `200 OK`

---

## 7. Disputes

### 7.1 Create Dispute

**Endpoint:** `POST /disputes`  
**Auth Required:** Yes  
**Permissions:** Client or Tester involved in submission

**Request Body:**
```json
{
  "submission_id": "65a1b2c3d4e5f6789abcdef5",
  "reason": "unfair_rejection",
  "description": "Client rejected without valid reason...",
  "evidence": [
    {
      "type": "screenshot",
      "url": "https://...",
      "description": "Screenshot of completed work"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "dispute_id": "65a1b2c3d4e5f6789abcdef6",
  "status": "open",
  "created_at": "2024-02-09T10:00:00Z",
  "message": "Dispute created. Admin will review within 48 hours."
}
```

---

### 7.2 Get Dispute Details

**Endpoint:** `GET /disputes/{dispute_id}`  
**Auth Required:** Yes  
**Permissions:** Dispute parties, Assigned admin

**Response:** `200 OK` - Full dispute object with messages

---

### 7.3 Add Message to Dispute

**Endpoint:** `POST /disputes/{dispute_id}/messages`  
**Auth Required:** Yes  
**Permissions:** Dispute parties, Assigned admin

**Request Body:**
```json
{
  "message": "Here is additional evidence...",
  "attachments": ["https://..."]
}
```

**Response:** `200 OK`

---

### 7.4 Resolve Dispute (Admin)

**Endpoint:** `POST /disputes/{dispute_id}/resolve`  
**Auth Required:** Yes  
**Permissions:** Admin

**Request Body:**
```json
{
  "resolution": "After reviewing the evidence, the submission meets requirements.",
  "resolution_type": "payment_released",
  "resolved_in_favor_of": "65a1b2c3d4e5f6789abcdef1"
}
```

**Response:** `200 OK`

---

### 7.5 List My Disputes

**Endpoint:** `GET /disputes/my-disputes`  
**Auth Required:** Yes

**Query Parameters:**
- `status` (optional)
- `page`, `limit`

**Response:** `200 OK`

---

## 8. Payments & Escrow

### 8.1 Get Payment Methods

**Endpoint:** `GET /payments/payment-methods`  
**Auth Required:** Yes  
**Permissions:** Client

**Response:** `200 OK`
```json
{
  "payment_methods": [
    {
      "id": "pm_1MvQeRCRhkTQzfJ5abc123",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      },
      "is_default": true
    }
  ]
}
```

---

### 8.2 Add Payment Method

**Endpoint:** `POST /payments/payment-methods`  
**Auth Required:** Yes  
**Permissions:** Client

**Request Body:**
```json
{
  "payment_method_id": "pm_1MvQeRCRhkTQzfJ5abc123",
  "set_as_default": true
}
```

**Response:** `200 OK`

---

### 8.3 Create Setup Intent (for adding card)

**Endpoint:** `POST /payments/setup-intent`  
**Auth Required:** Yes  
**Permissions:** Client

**Response:** `200 OK`
```json
{
  "client_secret": "seti_1MvQeRCRhkTQzfJ5_secret_abc123",
  "setup_intent_id": "seti_1MvQeRCRhkTQzfJ5"
}
```

**Notes:** Used with Stripe.js on frontend to collect payment method.

---

### 8.4 Get Escrow Transaction

**Endpoint:** `GET /payments/escrow/{escrow_transaction_id}`  
**Auth Required:** Yes  
**Permissions:** Transaction owner, Admin

**Response:** `200 OK` - Full escrow transaction object

---

### 8.5 Get Payment History

**Endpoint:** `GET /payments/history`  
**Auth Required:** Yes

**Query Parameters:**
- `type`: `charges` | `payouts`
- `page`, `limit`

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "transaction_id": "65a1b2c3d4e5f6789abcdef4",
      "type": "escrow_charge",
      "amount_usd": 150.00,
      "status": "captured",
      "job_title": "Checkout Flow Testing",
      "created_at": "2024-02-08T09:00:00Z"
    }
  ]
}
```

---

### 8.6 Get Tester Earnings

**Endpoint:** `GET /payments/earnings`  
**Auth Required:** Yes  
**Permissions:** Tester

**Response:** `200 OK`
```json
{
  "total_earned_usd": 3450.00,
  "pending_usd": 50.00,
  "available_usd": 3400.00,
  "recent_payouts": [
    {
      "payout_id": "tr_3MjKzRCRhkTQzfJ51EqnZjJj",
      "amount_usd": 42.50,
      "job_title": "Checkout Flow Testing",
      "status": "completed",
      "completed_at": "2024-02-10T10:00:00Z"
    }
  ]
}
```

---

### 8.7 Request Payout (if manual payouts)

**Endpoint:** `POST /payments/request-payout`  
**Auth Required:** Yes  
**Permissions:** Tester

**Request Body:**
```json
{
  "amount_usd": 100.00
}
```

**Response:** `200 OK`

**Notes:** For MVP, payouts are automatic on submission approval.

---

## 9. Notifications

### 9.1 List Notifications

**Endpoint:** `GET /notifications`  
**Auth Required:** Yes

**Query Parameters:**
- `is_read` (optional): `true` | `false`
- `type` (optional): notification type
- `page`, `limit`

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "notification_id": "65a1b2c3d4e5f6789abcdef9",
      "type": "submission_approved",
      "title": "Submission Approved",
      "message": "Your submission has been approved...",
      "action_url": "/submissions/65a1b2c3d4e5f6789abcdef5",
      "action_text": "View Submission",
      "is_read": false,
      "created_at": "2024-02-10T09:00:00Z"
    }
  ],
  "unread_count": 3
}
```

---

### 9.2 Mark Notification as Read

**Endpoint:** `PATCH /notifications/{notification_id}/read`  
**Auth Required:** Yes

**Response:** `200 OK`

---

### 9.3 Mark All as Read

**Endpoint:** `POST /notifications/mark-all-read`  
**Auth Required:** Yes

**Response:** `200 OK`

---

### 9.4 Delete Notification

**Endpoint:** `DELETE /notifications/{notification_id}`  
**Auth Required:** Yes

**Response:** `204 No Content`

---

## 10. AI Features

### 10.1 List AI Templates

**Endpoint:** `GET /ai/templates`  
**Auth Required:** Optional  
**Description:** List available test templates

**Query Parameters:**
- `category` (optional)
- `is_premium` (optional)

**Response:** `200 OK`
```json
{
  "templates": [
    {
      "template_id": "65a1b2c3d4e5f6789abcdefa",
      "name": "E-commerce Checkout Flow",
      "description": "Standard checkout testing template",
      "category": "e-commerce",
      "is_premium": false
    }
  ]
}
```

---

### 10.2 Get Template Details

**Endpoint:** `GET /ai/templates/{template_id}`  
**Auth Required:** Optional

**Response:** `200 OK` - Full template with journey structure

---

### 10.3 Generate Test Journey from Template

**Endpoint:** `POST /ai/generate-journey`  
**Auth Required:** Yes  
**Permissions:** Client with Pro plan (for AI enhancement)

**Request Body:**
```json
{
  "template_id": "65a1b2c3d4e5f6789abcdefa",
  "variables": {
    "product_name": "Premium Widget",
    "product_price": "$99.99"
  },
  "enhance_with_ai": true,
  "additional_requirements": "Focus on mobile Safari testing"
}
```

**Response:** `200 OK`
```json
{
  "user_journey": {
    "scenario": "Complete purchase of Premium Widget...",
    "steps": [
      {
        "step_number": 1,
        "action": "Navigate to product page and add Premium Widget to cart",
        "expected_result": "Product appears in cart with price $99.99"
      }
    ],
    "ai_generated": true
  }
}
```

---

### 10.4 Enhance Submission Summary

**Endpoint:** `POST /ai/enhance-summary`  
**Auth Required:** Yes (Internal - called by system on submission)

**Request Body:**
```json
{
  "submission_id": "65a1b2c3d4e5f6789abcdef5",
  "summary": "Found bugs in checkout...",
  "test_results": [...],
  "bugs": [...]
}
```

**Response:** `200 OK`
```json
{
  "ai_enhanced_summary": "Comprehensive checkout flow evaluation identified critical payment processing instability..."
}
```

---

## 11. Organizations (Innovation Group)

### 11.1 Create Organization

**Endpoint:** `POST /organizations`  
**Auth Required:** Yes  
**Permissions:** Client with Team plan

**Request Body:**
```json
{
  "name": "TechCorp QA Team",
  "slug": "techcorp-qa",
  "description": "Our QA department",
  "industry": "SaaS"
}
```

**Response:** `201 Created`

---

### 11.2 Get Organization Details

**Endpoint:** `GET /organizations/{org_id}`  
**Auth Required:** Yes  
**Permissions:** Organization member

**Response:** `200 OK` - Full organization object

---

### 11.3 List Organization Members

**Endpoint:** `GET /organizations/{org_id}/members`  
**Auth Required:** Yes  
**Permissions:** Organization member

**Response:** `200 OK`
```json
{
  "members": [
    {
      "user_id": "65a1b2c3d4e5f6789abcdef0",
      "full_name": "John Doe",
      "email": "john@techcorp.com",
      "organization_role": "owner",
      "joined_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 11.4 Invite Member

**Endpoint:** `POST /organizations/{org_id}/invitations`  
**Auth Required:** Yes  
**Permissions:** Organization owner or admin

**Request Body:**
```json
{
  "email": "member@techcorp.com",
  "role": "member"
}
```

**Response:** `200 OK`

---

### 11.5 Update Member Role

**Endpoint:** `PATCH /organizations/{org_id}/members/{user_id}`  
**Auth Required:** Yes  
**Permissions:** Organization owner or admin

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:** `200 OK`

---

### 11.6 Remove Member

**Endpoint:** `DELETE /organizations/{org_id}/members/{user_id}`  
**Auth Required:** Yes  
**Permissions:** Organization owner or admin

**Response:** `204 No Content`

---

## 12. Admin

### 12.1 Admin Dashboard Stats

**Endpoint:** `GET /admin/stats`  
**Auth Required:** Yes  
**Permissions:** Admin

**Response:** `200 OK`
```json
{
  "users": {
    "total": 1250,
    "clients": 450,
    "testers": 750,
    "admins": 5,
    "active_last_30_days": 890
  },
  "jobs": {
    "total": 3200,
    "open": 45,
    "in_progress": 120,
    "completed": 2980
  },
  "revenue": {
    "total_usd": 125000.00,
    "this_month_usd": 12500.00,
    "platform_fees_usd": 18750.00
  }
}
```

---

### 12.2 List All Users (Admin)

**Endpoint:** `GET /admin/users`  
**Auth Required:** Yes  
**Permissions:** Admin

**Query Parameters:**
- `role`, `status`, `page`, `limit`

**Response:** `200 OK` - List of users

---

### 12.3 Update User Status (Admin)

**Endpoint:** `PATCH /admin/users/{user_id}/status`  
**Auth Required:** Yes  
**Permissions:** Admin

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "Terms of service violation"
}
```

**Response:** `200 OK`

---

### 12.4 Review Qualification Test

**Endpoint:** `POST /admin/qualifications/{test_id}/review`  
**Auth Required:** Yes  
**Permissions:** Admin

**Request Body:**
```json
{
  "practical_score": 85,
  "evaluation_notes": "Good submission quality",
  "passed": true
}
```

**Response:** `200 OK`

---

### 12.5 List Disputes (Admin)

**Endpoint:** `GET /admin/disputes`  
**Auth Required:** Yes  
**Permissions:** Admin

**Query Parameters:**
- `status`, `priority`, `assigned_to_me`

**Response:** `200 OK`

---

### 12.6 Assign Dispute to Admin

**Endpoint:** `POST /admin/disputes/{dispute_id}/assign`  
**Auth Required:** Yes  
**Permissions:** Admin

**Request Body:**
```json
{
  "admin_id": "65a1b2c3d4e5f6789abcdef7"
}
```

**Response:** `200 OK`

---

## 13. Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Job not found",
    "details": {
      "job_id": "invalid_id"
    },
    "timestamp": "2024-02-10T10:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (semantic error)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_REQUIRED` - No valid token provided
- `PERMISSION_DENIED` - User lacks required permission
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `PAYMENT_FAILED` - Payment processing error
- `INSUFFICIENT_FUNDS` - Escrow balance too low
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - Temporary service issue

### Validation Error Example

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field_errors": [
        {
          "field": "email",
          "message": "Invalid email format"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters"
        }
      ]
    }
  }
}
```

---

## 14. Rate Limiting

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1612886400
```

### Default Limits

**By User Tier:**
- **Free/Starter:** 100 requests/hour
- **Pro:** 500 requests/hour  
- **Team:** 2000 requests/hour
- **Admin:** 5000 requests/hour

**By Endpoint Type:**
- **Authentication:** 10 requests/minute
- **File uploads:** 20 requests/hour
- **General API:** Standard tier limit

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "reset_at": "2024-02-10T11:00:00Z"
    }
  }
}
```

---

## 15. API Implementation Notes

### FastAPI Project Structure

```
app/
├── main.py                 # FastAPI app initialization
├── config.py              # Configuration management
├── dependencies.py        # Dependency injection (auth, db)
├── api/
│   └── v1/
│       ├── __init__.py
│       ├── auth.py        # Authentication endpoints
│       ├── users.py       # User management
│       ├── projects.py    # Project endpoints
│       ├── jobs.py        # Job endpoints
│       ├── submissions.py # Submission endpoints
│       ├── ratings.py     # Rating endpoints
│       ├── disputes.py    # Dispute endpoints
│       ├── payments.py    # Payment endpoints
│       ├── notifications.py
│       ├── ai.py          # AI features
│       ├── organizations.py
│       └── admin.py       # Admin endpoints
├── models/                # Pydantic models
│   ├── user.py
│   ├── project.py
│   ├── job.py
│   └── ...
├── services/              # Business logic
│   ├── auth_service.py
│   ├── job_service.py
│   ├── payment_service.py
│   ├── ai_service.py
│   └── ...
├── db/                    # Database layer
│   ├── mongodb.py        # MongoDB connection
│   └── repositories/     # Data access layer
├── middleware/
│   ├── auth.py           # JWT validation
│   └── rate_limit.py     # Rate limiting
└── utils/
    ├── security.py       # Password hashing, tokens
    ├── email.py          # Email sending
    └── storage.py        # File upload to S3/storage
```

### Authentication Middleware

```python
# dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)
    
    user = await user_repository.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401)
    return user

async def require_role(role: str):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker
```

### RBAC Permission Decorator

```python
# Example usage
@router.post("/jobs/{job_id}/approve")
async def approve_job(
    job_id: str,
    current_user: User = Depends(require_role("client"))
):
    # Implementation
    pass
```

### Database Connection

```python
# db/mongodb.py
from motor.motor_asyncio import AsyncIOMotorClient

class Database:
    client: AsyncIOMotorClient = None
    
    async def connect(self):
        self.client = AsyncIOMotorClient(MONGODB_URL)
        
    async def disconnect(self):
        self.client.close()

db = Database()

# Access collections
users_collection = db.client.peertest_hub.users
jobs_collection = db.client.peertest_hub.jobs
```

---

## 16. Testing Strategy

### API Testing

```python
# tests/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "SecurePass123!",
            "full_name": "Test User",
            "role": "client"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
```

### Integration Tests

- Test complete user journeys (register → create job → submit → payment)
- Test RBAC permissions
- Test payment flows with Stripe test mode
- Test file uploads

---

## Assumptions and Alternatives

### Assumptions

1. **JWT Authentication** - Using JWT tokens with 1-hour expiry
2. **Async FastAPI** - All endpoints are async for better performance
3. **MongoDB with Motor** - Async MongoDB driver
4. **Stripe for payments** - Primary payment processor
5. **S3-compatible storage** - For file uploads (screenshots, videos)

### Alternative Approaches

1. **Session-based auth** instead of JWT
2. **GraphQL** instead of REST for flexible queries
3. **gRPC** for internal service communication
4. **WebSockets** for real-time notifications
5. **Pagination cursor-based** instead of offset-based

### Security Considerations

1. **HTTPS only** in production
2. **CORS** properly configured
3. **Input validation** with Pydantic
4. **SQL injection prevention** (N/A for MongoDB, but validate ObjectIds)
5. **Rate limiting** on all endpoints
6. **Secrets in environment variables** never in code

---

## Next Steps

1. **Initialize FastAPI project**
2. **Implement authentication endpoints**
3. **Set up MongoDB connection**
4. **Implement core endpoints** (users, jobs, submissions)
5. **Integrate Stripe** for payments
6. **Add comprehensive tests**
7. **Generate OpenAPI documentation** (automatic with FastAPI)
8. **Deploy to staging environment**

