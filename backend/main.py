from fastapi import FastAPI, HTTPException, Depends, status, Response, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import os
import uuid
import secrets
import stripe
import resend
import logging

load_dotenv()

logger = logging.getLogger("peertesthub")

# --- Config (all from .env) ---

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/peertesthub")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5008").split(",")]
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "5108"))
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
ALGORITHM = "HS256"
COOKIE_SECURE = not any(o.startswith("http://localhost") for o in CORS_ORIGINS)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "PeerTest Hub <noreply@yourdomain.com>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5008")

PLATFORM_FEE_RATE = 0.15

stripe.api_key = STRIPE_SECRET_KEY
resend.api_key = RESEND_API_KEY

# --- Database ---

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()
users_col = db.users
projects_col = db.projects
jobs_col = db.jobs
submissions_col = db.submissions
refresh_tokens_col = db.refresh_tokens

# --- App ---

security = HTTPBearer()
app = FastAPI(title="PeerTest Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def create_indexes():
    await users_col.create_index("email", unique=True)
    await users_col.create_index("email_verification_token", sparse=True)
    await users_col.create_index("stripe_connect_id", sparse=True)
    await projects_col.create_index("builder_email")
    await jobs_col.create_index("builder_email")
    await jobs_col.create_index("status")
    await jobs_col.create_index("stripe_payment_intent_id", sparse=True)
    await submissions_col.create_index("job_id")
    await submissions_col.create_index("tester_email")
    await submissions_col.create_index("builder_email")
    await refresh_tokens_col.create_index("token", unique=True)
    await refresh_tokens_col.create_index("expires_at", expireAfterSeconds=0)

# --- Pydantic Models ---

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    role: str = Field(..., pattern="^(builder|tester)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str
    hosted_url: str
    category: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hosted_url: Optional[str] = None
    category: Optional[str] = None

class JobCreate(BaseModel):
    project_id: str
    title: str
    description: str
    payout_amount: float = Field(..., gt=0, le=1000)
    max_testers: int = Field(..., ge=1, le=10)
    estimated_time_minutes: int

class SubmissionUpdate(BaseModel):
    overall_feedback: Optional[str] = None
    bug_reports: Optional[List[dict]] = None
    usability_score: Optional[int] = Field(None, ge=1, le=5)
    suggestions: Optional[str] = None

class ReviewAction(BaseModel):
    feedback: str = ""

class VerifyEmailBody(BaseModel):
    token: str

# --- Email Helpers ---

def send_email(to: str, subject: str, html: str):
    """Fire-and-forget email via Resend. Failures logged but never block."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email to %s", to)
        return
    try:
        resend.Emails.send({
            "from": RESEND_FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)

def email_verification_html(first_name: str, token: str) -> str:
    url = f"{FRONTEND_URL}/verify-email?token={token}"
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Hi {first_name},</p>
        <p>Click the button below to verify your email address.</p>
        <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a>
        <p style="margin-top: 16px; color: #888; font-size: 13px;">Or copy this link: {url}</p>
    </div>
    """

def email_job_claimed_html(builder_name: str, tester_name: str, job_title: str, job_id: str) -> str:
    url = f"{FRONTEND_URL}/jobs/{job_id}"
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>A tester claimed your job</h2>
        <p>Hi {builder_name},</p>
        <p><strong>{tester_name}</strong> just claimed your test job <strong>"{job_title}"</strong>.</p>
        <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">View Job</a>
    </div>
    """

def email_submission_submitted_html(builder_name: str, tester_name: str, job_title: str, job_id: str) -> str:
    url = f"{FRONTEND_URL}/jobs/{job_id}"
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New submission ready for review</h2>
        <p>Hi {builder_name},</p>
        <p><strong>{tester_name}</strong> submitted feedback for <strong>"{job_title}"</strong>. Review it and approve or reject.</p>
        <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">Review Submission</a>
    </div>
    """

def email_approved_html(tester_name: str, job_title: str, payout: float) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your submission was approved!</h2>
        <p>Hi {tester_name},</p>
        <p>Great work! Your feedback for <strong>"{job_title}"</strong> was approved. A payout of <strong>${payout:.2f}</strong> is on its way to your account.</p>
        <p style="color: #888; font-size: 13px;">If you haven't set up Stripe payouts yet, head to Settings to complete onboarding.</p>
    </div>
    """

def email_rejected_html(tester_name: str, job_title: str, feedback: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your submission was not approved</h2>
        <p>Hi {tester_name},</p>
        <p>Unfortunately, your feedback for <strong>"{job_title}"</strong> was rejected.</p>
        {f'<p><strong>Builder feedback:</strong> {feedback}</p>' if feedback else ''}
        <p style="color: #888; font-size: 13px;">You can still claim and submit for other jobs.</p>
    </div>
    """

# --- Helpers ---

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["type"] = "access"
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None or payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def doc_to_dict(doc):
    """Convert MongoDB doc: rename _id to id, remove internal fields."""
    if doc is None:
        return None
    doc["id"] = doc.pop("_id")
    doc.pop("password_hash", None)
    return doc

def user_public(user: dict) -> dict:
    return {
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
        "email_verified": user.get("email_verified", False),
        "stripe_connect_onboarded": user.get("stripe_connect_onboarded", False),
    }

async def get_user_or_404(email: str) -> dict:
    user = await users_col.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",
    )

def clear_refresh_cookie(response: Response):
    response.delete_cookie(key="refresh_token", path="/api/auth")

async def get_or_create_stripe_customer(user: dict) -> str:
    """Get existing or create new Stripe Customer for a builder."""
    if user.get("stripe_customer_id"):
        return user["stripe_customer_id"]
    customer = stripe.Customer.create(
        email=user["email"],
        name=f"{user['first_name']} {user['last_name']}",
        metadata={"peertesthub_email": user["email"]},
    )
    await users_col.update_one({"email": user["email"]}, {"$set": {"stripe_customer_id": customer.id}})
    return customer.id

async def check_and_refund_unclaimed_slots(job: dict):
    """After all submissions are resolved, refund unclaimed slot costs to builder."""
    all_subs = await submissions_col.find({"job_id": job["_id"]}).to_list(50)
    resolved_statuses = {"approved", "rejected"}
    if not all_subs or not all(s["status"] in resolved_statuses for s in all_subs):
        return

    claimed_count = len(all_subs)
    unclaimed = job["max_testers"] - claimed_count
    if unclaimed <= 0 or not job.get("stripe_payment_intent_id"):
        return

    refund_amount = int(round(job["payout_amount"] * (1 + PLATFORM_FEE_RATE) * unclaimed * 100))
    if refund_amount <= 0:
        return

    try:
        stripe.Refund.create(
            payment_intent=job["stripe_payment_intent_id"],
            amount=refund_amount,
        )
        logger.info("Refunded %d cents for %d unclaimed slots on job %s", refund_amount, unclaimed, job["_id"])
    except Exception as e:
        logger.error("Failed to refund unclaimed slots for job %s: %s", job["_id"], e)

# --- Routes ---

@app.get("/")
async def root():
    return {"message": "PeerTest Hub API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "users": await users_col.count_documents({}),
        "projects": await projects_col.count_documents({}),
        "jobs": await jobs_col.count_documents({}),
    }

# --- Auth ---

@app.post("/api/auth/register", status_code=201)
async def register(body: UserRegister, response: Response):
    if await users_col.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = secrets.token_urlsafe(32)
    user_doc = {
        "email": body.email,
        "password_hash": hash_password(body.password),
        "first_name": body.first_name,
        "last_name": body.last_name,
        "role": body.role,
        "created_at": datetime.utcnow().isoformat(),
        "email_verified": False,
        "email_verification_token": verification_token,
        "stripe_customer_id": None,
        "stripe_connect_id": None,
        "stripe_connect_onboarded": False,
    }
    await users_col.insert_one(user_doc)

    send_email(
        body.email,
        "Verify your PeerTest Hub email",
        email_verification_html(body.first_name, verification_token),
    )

    access_token = create_access_token({"sub": body.email, "role": body.role})
    refresh_token = create_refresh_token()
    await refresh_tokens_col.insert_one({
        "token": refresh_token,
        "email": body.email,
        "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    })
    set_refresh_cookie(response, refresh_token)

    return {"access_token": access_token, "token_type": "bearer", "user": user_public(user_doc)}

@app.post("/api/auth/login")
async def login(body: UserLogin, response: Response):
    user = await users_col.find_one({"email": body.email})
    if not user or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": user["email"], "role": user["role"]})
    refresh_token = create_refresh_token()
    await refresh_tokens_col.insert_one({
        "token": refresh_token,
        "email": user["email"],
        "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    })
    set_refresh_cookie(response, refresh_token)

    return {"access_token": access_token, "token_type": "bearer", "user": user_public(user)}

@app.post("/api/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    record = await refresh_tokens_col.find_one({"token": token})
    if not record:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if record["expires_at"] < datetime.utcnow():
        await refresh_tokens_col.delete_one({"_id": record["_id"]})
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh token expired")

    user = await users_col.find_one({"email": record["email"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate refresh token
    new_refresh = create_refresh_token()
    await refresh_tokens_col.delete_one({"_id": record["_id"]})
    await refresh_tokens_col.insert_one({
        "token": new_refresh,
        "email": user["email"],
        "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    })
    set_refresh_cookie(response, new_refresh)

    access_token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer", "user": user_public(user)}

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if token:
        await refresh_tokens_col.delete_one({"token": token})
    clear_refresh_cookie(response)
    return {"message": "Logged out"}

@app.get("/api/auth/me")
async def get_me(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    result = user_public(user)
    result["created_at"] = user["created_at"]
    return result

# --- Email Verification ---

@app.post("/api/auth/verify-email")
async def verify_email(body: VerifyEmailBody):
    user = await users_col.find_one({"email_verification_token": body.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    if user.get("email_verified"):
        return {"message": "Email already verified"}

    await users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True}, "$unset": {"email_verification_token": ""}},
    )
    return {"message": "Email verified successfully"}

@app.post("/api/auth/resend-verification")
async def resend_verification(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")

    # Rate limit: check if last sent was < 60s ago
    last_sent = user.get("verification_last_sent")
    if last_sent:
        try:
            last_dt = datetime.fromisoformat(last_sent)
            if (datetime.utcnow() - last_dt).total_seconds() < 60:
                raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting another email")
        except (ValueError, TypeError):
            pass

    new_token = secrets.token_urlsafe(32)
    await users_col.update_one(
        {"email": email},
        {"$set": {
            "email_verification_token": new_token,
            "verification_last_sent": datetime.utcnow().isoformat(),
        }},
    )
    send_email(
        email,
        "Verify your PeerTest Hub email",
        email_verification_html(user["first_name"], new_token),
    )
    return {"message": "Verification email sent"}

# --- Dashboard ---

@app.get("/api/dashboard")
async def get_dashboard(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)

    if user["role"] == "builder":
        total_projects = await projects_col.count_documents({"builder_email": email})
        active_jobs = await jobs_col.count_documents({"builder_email": email, "status": {"$in": ["open", "in_progress"]}})
        pending_reviews = await submissions_col.count_documents({"builder_email": email, "status": "submitted"})
        completed_jobs = await jobs_col.count_documents({"builder_email": email, "status": "completed"})

        # Total spent: sum total_charge for all jobs that have had successful payment
        spent_pipeline = [
            {"$match": {"builder_email": email, "status": {"$ne": "pending_payment"}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_charge"}}},
        ]
        spent_result = await jobs_col.aggregate(spent_pipeline).to_list(1)
        total_spent = spent_result[0]["total"] if spent_result else 0

        return {
            "role": "builder",
            "stats": {
                "total_projects": total_projects,
                "active_jobs": active_jobs,
                "pending_reviews": pending_reviews,
                "completed_jobs": completed_jobs,
                "total_spent": total_spent,
            },
        }
    else:
        claimed = await submissions_col.count_documents({"tester_email": email, "status": "draft"})
        completed = await submissions_col.count_documents({"tester_email": email, "status": "approved"})
        pending = await submissions_col.count_documents({"tester_email": email, "status": "submitted"})

        pipeline = [
            {"$match": {"tester_email": email, "status": "approved"}},
            {"$lookup": {"from": "jobs", "localField": "job_id", "foreignField": "_id", "as": "job"}},
            {"$unwind": "$job"},
            {"$group": {"_id": None, "total": {"$sum": "$job.payout_amount"}}},
        ]
        result = await submissions_col.aggregate(pipeline).to_list(1)
        earnings = result[0]["total"] if result else 0

        return {
            "role": "tester",
            "stats": {
                "claimed_jobs": claimed,
                "completed": completed,
                "pending_review": pending,
                "earnings": earnings,
            },
            "stripe_connect_onboarded": user.get("stripe_connect_onboarded", False),
        }

# --- Projects ---

@app.post("/api/projects", status_code=201)
async def create_project(body: ProjectCreate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create projects")

    doc = {
        "_id": f"proj_{uuid.uuid4().hex[:8]}",
        "builder_email": email,
        "name": body.name,
        "description": body.description,
        "hosted_url": body.hosted_url,
        "category": body.category,
        "created_at": datetime.utcnow().isoformat(),
        "status": "active",
    }
    await projects_col.insert_one(doc)
    return doc_to_dict(doc)

@app.get("/api/projects")
async def list_projects(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] == "builder":
        cursor = projects_col.find({"builder_email": email})
    else:
        cursor = projects_col.find({"status": "active"})
    return [doc_to_dict(d) for d in await cursor.to_list(100)]

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, email: str = Depends(verify_token)):
    doc = await projects_col.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc_to_dict(doc)

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can update projects")

    doc = await projects_col.find_one({"_id": project_id, "builder_email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await projects_col.update_one({"_id": project_id}, {"$set": updates})
        doc.update(updates)
    return doc_to_dict(doc)

# --- Jobs ---

@app.post("/api/jobs", status_code=201)
async def create_job(body: JobCreate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create jobs")

    project = await projects_col.find_one({"_id": body.project_id, "builder_email": email})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    payout = body.payout_amount
    total_payout = payout * body.max_testers
    platform_fee = round(total_payout * PLATFORM_FEE_RATE, 2)
    total_charge = round(total_payout + platform_fee, 2)

    # Create/get Stripe Customer for the builder
    customer_id = await get_or_create_stripe_customer(user)

    # Create PaymentIntent
    pi = stripe.PaymentIntent.create(
        amount=int(round(total_charge * 100)),  # cents
        currency="usd",
        customer=customer_id,
        metadata={"type": "job_payment", "builder_email": email},
        automatic_payment_methods={"enabled": True},
    )

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    doc = {
        "_id": job_id,
        "project_id": body.project_id,
        "project_name": project["name"],
        "builder_email": email,
        "title": body.title,
        "description": body.description,
        "payout_amount": payout,
        "max_testers": body.max_testers,
        "estimated_time_minutes": body.estimated_time_minutes,
        "status": "pending_payment",
        "total_charge": total_charge,
        "platform_fee": platform_fee,
        "stripe_payment_intent_id": pi.id,
        "created_at": datetime.utcnow().isoformat(),
        "assigned_testers": [],
        "submissions": [],
    }
    await jobs_col.insert_one(doc)

    result = doc_to_dict(doc)
    result["client_secret"] = pi.client_secret
    return result

@app.post("/api/jobs/{job_id}/confirm-payment")
async def confirm_payment(job_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can confirm payment")

    job = await jobs_col.find_one({"_id": job_id, "builder_email": email})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Job is not pending payment")

    # Verify with Stripe that the PI succeeded
    pi = stripe.PaymentIntent.retrieve(job["stripe_payment_intent_id"])
    if pi.status != "succeeded":
        raise HTTPException(status_code=400, detail=f"Payment not completed. Status: {pi.status}")

    await jobs_col.update_one({"_id": job_id}, {"$set": {"status": "open"}})
    job["status"] = "open"
    return doc_to_dict(job)

@app.post("/api/jobs/{job_id}/payment-intent")
async def get_payment_intent(job_id: str, email: str = Depends(verify_token)):
    """Return existing or create new client_secret for a pending_payment job (handles retry/refresh)."""
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can access payment")

    job = await jobs_col.find_one({"_id": job_id, "builder_email": email})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Job is not pending payment")

    pi_id = job.get("stripe_payment_intent_id")
    if pi_id:
        pi = stripe.PaymentIntent.retrieve(pi_id)
        if pi.status == "succeeded":
            # Already paid — go ahead and mark open
            await jobs_col.update_one({"_id": job_id}, {"$set": {"status": "open"}})
            return {"client_secret": pi.client_secret, "already_paid": True}
        if pi.status in ("requires_payment_method", "requires_confirmation", "requires_action"):
            return {"client_secret": pi.client_secret, "already_paid": False}

    # PI cancelled or in a bad state — create a new one
    customer_id = await get_or_create_stripe_customer(user)
    new_pi = stripe.PaymentIntent.create(
        amount=int(round(job["total_charge"] * 100)),
        currency="usd",
        customer=customer_id,
        metadata={"type": "job_payment", "builder_email": email},
        automatic_payment_methods={"enabled": True},
    )
    await jobs_col.update_one({"_id": job_id}, {"$set": {"stripe_payment_intent_id": new_pi.id}})
    return {"client_secret": new_pi.client_secret, "already_paid": False}

@app.get("/api/jobs")
async def list_jobs(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] == "builder":
        cursor = jobs_col.find({"builder_email": email})
    else:
        # Testers should not see pending_payment jobs
        cursor = jobs_col.find({
            "$or": [
                {"status": {"$in": ["open", "in_progress"]}},
                {"assigned_testers": email},
            ]
        })
    return [doc_to_dict(d) for d in await cursor.to_list(200)]

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, email: str = Depends(verify_token)):
    doc = await jobs_col.find_one({"_id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc_to_dict(doc)

@app.post("/api/jobs/{job_id}/claim")
async def claim_job(job_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can claim jobs")

    job = await jobs_col.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Job is not available for claiming")
    if email in job.get("assigned_testers", []):
        raise HTTPException(status_code=400, detail="You already claimed this job")
    if len(job.get("assigned_testers", [])) >= job["max_testers"]:
        raise HTTPException(status_code=400, detail="Job has reached maximum testers")

    sub_id = f"sub_{uuid.uuid4().hex[:8]}"
    submission = {
        "_id": sub_id,
        "job_id": job_id,
        "job_title": job["title"],
        "project_id": job["project_id"],
        "builder_email": job["builder_email"],
        "tester_email": email,
        "tester_name": f"{user['first_name']} {user['last_name']}",
        "status": "draft",
        "overall_feedback": "",
        "bug_reports": [],
        "usability_score": None,
        "suggestions": "",
        "review_feedback": "",
        "stripe_transfer_id": None,
        "created_at": datetime.utcnow().isoformat(),
        "submitted_at": None,
        "reviewed_at": None,
    }
    await submissions_col.insert_one(submission)

    new_status = "in_progress" if job["status"] == "open" else job["status"]
    await jobs_col.update_one(
        {"_id": job_id},
        {"$push": {"assigned_testers": email, "submissions": sub_id}, "$set": {"status": new_status}},
    )

    job["assigned_testers"].append(email)
    job["submissions"].append(sub_id)
    job["status"] = new_status

    # Notify builder
    builder = await users_col.find_one({"email": job["builder_email"]})
    if builder:
        send_email(
            job["builder_email"],
            f"A tester claimed your job: {job['title']}",
            email_job_claimed_html(builder["first_name"], f"{user['first_name']} {user['last_name']}", job["title"], job_id),
        )

    return {"message": "Job claimed successfully", "submission_id": sub_id, "job": doc_to_dict(job)}

# --- Submissions ---

@app.get("/api/submissions")
async def list_submissions(job_id: Optional[str] = None, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    query = {}
    if job_id:
        query["job_id"] = job_id
    if user["role"] == "builder":
        query["builder_email"] = email
    else:
        query["tester_email"] = email
    return [doc_to_dict(d) for d in await submissions_col.find(query).to_list(200)]

@app.get("/api/submissions/{sub_id}")
async def get_submission(sub_id: str, email: str = Depends(verify_token)):
    doc = await submissions_col.find_one({"_id": sub_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    user = await get_user_or_404(email)
    if user["role"] == "builder" and doc["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission to view")
    if user["role"] == "tester" and doc["tester_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission")
    return doc_to_dict(doc)

@app.put("/api/submissions/{sub_id}")
async def update_submission(sub_id: str, body: SubmissionUpdate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can update submissions")

    doc = await submissions_col.find_one({"_id": sub_id, "tester_email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    if doc["status"] != "draft":
        raise HTTPException(status_code=400, detail="Can only update draft submissions")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await submissions_col.update_one({"_id": sub_id}, {"$set": updates})
        doc.update(updates)
    return doc_to_dict(doc)

@app.post("/api/submissions/{sub_id}/submit")
async def submit_submission(sub_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can submit")

    doc = await submissions_col.find_one({"_id": sub_id, "tester_email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    if doc["status"] != "draft":
        raise HTTPException(status_code=400, detail="Submission already submitted")
    if not doc.get("overall_feedback", "").strip():
        raise HTTPException(status_code=400, detail="Overall feedback is required")
    if doc.get("usability_score") is None:
        raise HTTPException(status_code=400, detail="Usability score is required")

    await submissions_col.update_one(
        {"_id": sub_id},
        {"$set": {"status": "submitted", "submitted_at": datetime.utcnow().isoformat()}},
    )
    doc["status"] = "submitted"
    doc["submitted_at"] = datetime.utcnow().isoformat()

    # Notify builder
    builder = await users_col.find_one({"email": doc["builder_email"]})
    job = await jobs_col.find_one({"_id": doc["job_id"]})
    if builder and job:
        send_email(
            doc["builder_email"],
            f"New submission for: {job['title']}",
            email_submission_submitted_html(
                builder["first_name"],
                doc["tester_name"],
                job["title"],
                doc["job_id"],
            ),
        )

    return doc_to_dict(doc)

@app.post("/api/submissions/{sub_id}/approve")
async def approve_submission(sub_id: str, action: ReviewAction, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can approve submissions")

    doc = await submissions_col.find_one({"_id": sub_id, "builder_email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    if doc["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Can only approve submitted submissions")

    now = datetime.utcnow().isoformat()
    update_fields = {"status": "approved", "review_feedback": action.feedback, "reviewed_at": now}

    # Attempt Stripe Transfer to tester
    job = await jobs_col.find_one({"_id": doc["job_id"]})
    tester = await users_col.find_one({"email": doc["tester_email"]})
    transfer_id = None

    if tester and tester.get("stripe_connect_onboarded") and tester.get("stripe_connect_id") and job:
        try:
            transfer = stripe.Transfer.create(
                amount=int(round(job["payout_amount"] * 100)),
                currency="usd",
                destination=tester["stripe_connect_id"],
                metadata={
                    "submission_id": sub_id,
                    "job_id": doc["job_id"],
                    "tester_email": doc["tester_email"],
                },
            )
            transfer_id = transfer.id
            update_fields["stripe_transfer_id"] = transfer_id
        except Exception as e:
            logger.error("Failed to transfer to tester %s: %s", doc["tester_email"], e)

    await submissions_col.update_one({"_id": sub_id}, {"$set": update_fields})

    # Auto-complete job if all submissions resolved
    if job:
        all_subs = await submissions_col.find({"job_id": doc["job_id"]}).to_list(50)
        if all(s["status"] in ("approved", "rejected") or s["_id"] == sub_id for s in all_subs):
            await jobs_col.update_one({"_id": doc["job_id"]}, {"$set": {"status": "completed"}})
            # Check for unclaimed slot refunds
            await check_and_refund_unclaimed_slots(job)

    # Notify tester
    if tester and job:
        send_email(
            doc["tester_email"],
            f"Your submission for \"{job['title']}\" was approved!",
            email_approved_html(tester["first_name"], job["title"], job["payout_amount"]),
        )

    doc["status"] = "approved"
    doc["review_feedback"] = action.feedback
    doc["reviewed_at"] = now
    if transfer_id:
        doc["stripe_transfer_id"] = transfer_id
    return doc_to_dict(doc)

@app.post("/api/submissions/{sub_id}/reject")
async def reject_submission(sub_id: str, action: ReviewAction, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can reject submissions")

    doc = await submissions_col.find_one({"_id": sub_id, "builder_email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    if doc["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Can only reject submitted submissions")

    now = datetime.utcnow().isoformat()
    await submissions_col.update_one(
        {"_id": sub_id},
        {"$set": {"status": "rejected", "review_feedback": action.feedback, "reviewed_at": now}},
    )

    # Auto-complete job if all submissions resolved
    job = await jobs_col.find_one({"_id": doc["job_id"]})
    if job:
        all_subs = await submissions_col.find({"job_id": doc["job_id"]}).to_list(50)
        if all(s["status"] in ("approved", "rejected") or s["_id"] == sub_id for s in all_subs):
            await jobs_col.update_one({"_id": doc["job_id"]}, {"$set": {"status": "completed"}})
            await check_and_refund_unclaimed_slots(job)

    # Notify tester
    tester = await users_col.find_one({"email": doc["tester_email"]})
    if tester and job:
        send_email(
            doc["tester_email"],
            f"Your submission for \"{job['title']}\" was not approved",
            email_rejected_html(tester["first_name"], job["title"], action.feedback),
        )

    doc["status"] = "rejected"
    doc["review_feedback"] = action.feedback
    doc["reviewed_at"] = now
    return doc_to_dict(doc)

# --- Stripe Connect ---

@app.post("/api/stripe/connect/onboard")
async def stripe_connect_onboard(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can onboard to Stripe Connect")

    account_id = user.get("stripe_connect_id")
    if not account_id:
        account = stripe.Account.create(
            type="express",
            email=email,
            metadata={"peertesthub_email": email},
            capabilities={"transfers": {"requested": True}},
        )
        account_id = account.id
        await users_col.update_one({"email": email}, {"$set": {"stripe_connect_id": account_id}})

    link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=f"{FRONTEND_URL}/settings?stripe=refresh",
        return_url=f"{FRONTEND_URL}/settings?stripe=success",
        type="account_onboarding",
    )
    return {"url": link.url, "account_id": account_id}

@app.get("/api/stripe/connect/status")
async def stripe_connect_status(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can check Connect status")

    account_id = user.get("stripe_connect_id")
    onboarded = user.get("stripe_connect_onboarded", False)

    # If we have an account but haven't marked onboarded, check with Stripe
    if account_id and not onboarded:
        try:
            account = stripe.Account.retrieve(account_id)
            if account.charges_enabled or account.payouts_enabled:
                onboarded = True
                await users_col.update_one({"email": email}, {"$set": {"stripe_connect_onboarded": True}})
        except Exception:
            pass

    return {"onboarded": onboarded, "account_id": account_id}

# --- Stripe Webhook ---

@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        # Backup: mark job open if confirm-payment wasn't called
        job = await jobs_col.find_one({"stripe_payment_intent_id": pi["id"], "status": "pending_payment"})
        if job:
            await jobs_col.update_one({"_id": job["_id"]}, {"$set": {"status": "open"}})
            logger.info("Webhook: marked job %s as open (PI %s)", job["_id"], pi["id"])

    elif event["type"] == "account.updated":
        account = event["data"]["object"]
        if account.get("charges_enabled") or account.get("payouts_enabled"):
            await users_col.update_one(
                {"stripe_connect_id": account["id"]},
                {"$set": {"stripe_connect_onboarded": True}},
            )
            logger.info("Webhook: marked Connect account %s as onboarded", account["id"])

    return {"received": True}

# --- Stripe Config (for frontend) ---

@app.get("/api/stripe/config")
async def stripe_config():
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

# --- Stats (public) ---

@app.get("/api/stats")
async def get_stats():
    return {
        "total_users": await users_col.count_documents({}),
        "builders": await users_col.count_documents({"role": "builder"}),
        "testers": await users_col.count_documents({"role": "tester"}),
        "total_projects": await projects_col.count_documents({}),
        "total_jobs": await jobs_col.count_documents({}),
        "open_jobs": await jobs_col.count_documents({"status": "open"}),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
