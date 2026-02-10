from fastapi import FastAPI, HTTPException, Depends, status, Response, Request, Cookie, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from pathlib import Path
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import os
import uuid
import secrets
import random
import stripe
import resend
import httpx
import logging
import aiofiles

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

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:5008/onboarding/github/callback")

PLATFORM_FEE_RATE = 0.15
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_VIDEO_TYPES = {"video/webm", "video/mp4", "video/quicktime"}

stripe.api_key = STRIPE_SECRET_KEY
resend.api_key = RESEND_API_KEY

# --- Database ---

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database()
users_col = db.users
projects_col = db.projects
jobs_col = db.jobs
submissions_col = db.submissions
bids_col = db.bids
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
    Path(UPLOAD_DIR).mkdir(exist_ok=True)
    await users_col.create_index("email", unique=True)
    await users_col.create_index("email_verification_code", sparse=True)
    await users_col.create_index("stripe_connect_id", sparse=True)
    await users_col.create_index("github_username", sparse=True)
    await projects_col.create_index("builder_email")
    await jobs_col.create_index("builder_email")
    await jobs_col.create_index("status")
    await jobs_col.create_index("stripe_payment_intent_id", sparse=True)
    await submissions_col.create_index("job_id")
    await submissions_col.create_index("tester_email")
    await submissions_col.create_index("builder_email")
    await bids_col.create_index("job_id")
    await bids_col.create_index("tester_email")
    await bids_col.create_index([("job_id", 1), ("tester_email", 1)])
    await bids_col.create_index("status")
    await submissions_col.create_index("bid_id", sparse=True)
    await submissions_col.create_index("item_id", sparse=True)
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
    document_content: Optional[str] = None
    transcript: Optional[str] = None

class ReviewAction(BaseModel):
    feedback: str = ""
    rating: Optional[int] = Field(None, ge=1, le=5)

class ProfileUpdate(BaseModel):
    bio: str = Field("", max_length=500)
    specialties: List[str] = Field(default_factory=list)
    profile_visible: bool = True

class VideoTag(BaseModel):
    start_seconds: float
    end_seconds: float
    tag_type: str = Field(..., pattern="^(bug|ux-issue|training-clip|marketing-clip)$")
    note: str = ""

class VideoTagsUpdate(BaseModel):
    video_tags: List[VideoTag]

class VerifyCodeBody(BaseModel):
    code: str

class GitHubCallbackBody(BaseModel):
    code: str

# --- V2 Structured Jobs + Bidding Models ---

class TestPlanPage(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    url: str = ""

class TestPlanItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    service_type: str = Field(..., pattern="^(test|record|document|voiceover)$")
    proposed_price: float = Field(..., gt=0, le=5000)
    estimated_minutes: int = Field(..., ge=1)
    pages: List[TestPlanPage] = []

class RoleCredentials(BaseModel):
    email: str = ""
    password: str = ""
    notes: str = ""

class TestPlanRole(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""
    credentials: Optional[RoleCredentials] = None
    items: List[TestPlanItem] = Field(..., min_length=1)

class JobCreateV2(BaseModel):
    project_id: str
    title: str
    description: str = ""
    assignment_type: str = Field(..., pattern="^(per_job|per_role|per_item)$")
    roles: List[TestPlanRole] = Field(..., min_length=1)
    estimated_time_minutes: int = Field(..., ge=1)

class BidCreate(BaseModel):
    bid_price: float = Field(..., gt=0, le=10000)
    message: str = Field("", max_length=500)
    scope_role_id: Optional[str] = None
    scope_item_id: Optional[str] = None

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

def generate_verification_code() -> str:
    return f"{random.randint(0, 999999):06d}"

def email_verification_code_html(first_name: str, code: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; text-align: center;">
        <h2>Verify your email</h2>
        <p>Hi {first_name},</p>
        <p>Enter this code to verify your email address:</p>
        <div style="margin: 24px 0; padding: 20px; background: #f5f3ff; border-radius: 12px;">
            <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">{code}</span>
        </div>
        <p style="color: #888; font-size: 13px;">This code expires in 10 minutes.</p>
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

def email_new_bid_html(builder_name: str, tester_name: str, job_title: str, job_id: str, bid_price: float, is_counter: bool) -> str:
    url = f"{FRONTEND_URL}/jobs/{job_id}"
    counter_note = f" (counter-offer — different from your proposed price)" if is_counter else " (accepted your proposed price)"
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New bid on your job</h2>
        <p>Hi {builder_name},</p>
        <p><strong>{tester_name}</strong> submitted a bid of <strong>${bid_price:.2f}</strong>{counter_note} for <strong>"{job_title}"</strong>.</p>
        <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">Review Bid</a>
    </div>
    """

def email_bid_accepted_html(tester_name: str, job_title: str, job_id: str, bid_price: float) -> str:
    url = f"{FRONTEND_URL}/jobs/{job_id}"
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your bid was accepted!</h2>
        <p>Hi {tester_name},</p>
        <p>Great news! Your bid of <strong>${bid_price:.2f}</strong> for <strong>"{job_title}"</strong> was accepted. The builder has completed payment — you can start testing now.</p>
        <a href="{url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Testing</a>
    </div>
    """

def email_bid_rejected_html(tester_name: str, job_title: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Your bid was not accepted</h2>
        <p>Hi {tester_name},</p>
        <p>Unfortunately, your bid for <strong>"{job_title}"</strong> was not accepted by the builder.</p>
        <p style="color: #888; font-size: 13px;">You can still browse and bid on other jobs.</p>
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
        "github_username": user.get("github_username"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "bio": user.get("bio", ""),
        "specialties": user.get("specialties", []),
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

SERVICE_TYPES = [
    {
        "id": "test",
        "name": "Test",
        "description": "Walk through the flow, provide text feedback, bug reports, and a usability score.",
        "suggested_range": [10, 50],
    },
    {
        "id": "record",
        "name": "Record",
        "description": "Screen record the walkthrough with video tags and written feedback.",
        "suggested_range": [20, 75],
    },
    {
        "id": "document",
        "name": "Document",
        "description": "Write structured documentation of the flow with step-by-step instructions.",
        "suggested_range": [25, 100],
    },
    {
        "id": "voiceover",
        "name": "Voiceover",
        "description": "Narrated screen recording with live commentary as you walk through the flow.",
        "suggested_range": [30, 125],
    },
]

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

    verification_code = generate_verification_code()
    user_doc = {
        "email": body.email,
        "password_hash": hash_password(body.password),
        "first_name": body.first_name,
        "last_name": body.last_name,
        "role": body.role,
        "created_at": datetime.utcnow().isoformat(),
        "email_verified": False,
        "email_verification_code": verification_code,
        "email_verification_code_expires": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
        "email_verification_attempts": 0,
        "verification_last_sent": datetime.utcnow().isoformat(),
        "github_username": None,
        "github_access_token": None,
        "github_connected_at": None,
        "onboarding_completed": False,
        "onboarding_completed_at": None,
        "stripe_customer_id": None,
        "stripe_connect_id": None,
        "stripe_connect_onboarded": False,
        "bio": "",
        "specialties": [],
        "profile_visible": True,
        "total_ratings": 0,
        "rating_sum": 0,
    }
    await users_col.insert_one(user_doc)

    send_email(
        body.email,
        "Your PeerTest Hub verification code",
        email_verification_code_html(body.first_name, verification_code),
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

# --- Onboarding: Email Verification + GitHub OAuth ---

def check_onboarding_complete(user: dict) -> bool:
    return user.get("email_verified", False) and user.get("github_username") is not None

@app.post("/api/auth/verify-email-code")
async def verify_email_code(body: VerifyCodeBody, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user.get("email_verified"):
        return {"message": "Email already verified", "user": user_public(user)}

    if user.get("email_verification_attempts", 0) >= 3:
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")

    expires = user.get("email_verification_code_expires", "")
    if expires and datetime.fromisoformat(expires) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    if body.code != user.get("email_verification_code"):
        await users_col.update_one(
            {"email": email},
            {"$inc": {"email_verification_attempts": 1}},
        )
        remaining = 2 - user.get("email_verification_attempts", 0)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid code. {max(remaining, 0)} attempt(s) remaining.",
        )

    update: dict = {
        "email_verified": True,
        "email_verification_code": None,
        "email_verification_code_expires": None,
        "email_verification_attempts": 0,
    }
    user["email_verified"] = True
    if check_onboarding_complete(user):
        update["onboarding_completed"] = True
        update["onboarding_completed_at"] = datetime.utcnow().isoformat()
        user["onboarding_completed"] = True

    await users_col.update_one({"email": email}, {"$set": update})
    return {"message": "Email verified successfully", "user": user_public(user)}

@app.post("/api/auth/resend-verification-code")
async def resend_verification_code(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")

    last_sent = user.get("verification_last_sent")
    if last_sent:
        try:
            last_dt = datetime.fromisoformat(last_sent)
            if (datetime.utcnow() - last_dt).total_seconds() < 60:
                raise HTTPException(status_code=429, detail="Please wait 60 seconds before requesting a new code")
        except (ValueError, TypeError):
            pass

    new_code = generate_verification_code()
    await users_col.update_one(
        {"email": email},
        {"$set": {
            "email_verification_code": new_code,
            "email_verification_code_expires": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
            "email_verification_attempts": 0,
            "verification_last_sent": datetime.utcnow().isoformat(),
        }},
    )
    send_email(
        email,
        "Your PeerTest Hub verification code",
        email_verification_code_html(user["first_name"], new_code),
    )
    return {"message": "New verification code sent"}

@app.get("/api/auth/github-oauth-url")
async def github_oauth_url(email: str = Depends(verify_token)):
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    params = (
        f"client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope=user:email,repo"
        f"&state={email}"
    )
    return {"url": f"https://github.com/login/oauth/authorize?{params}"}

@app.post("/api/auth/github-callback")
async def github_callback(body: GitHubCallbackBody, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user.get("github_username"):
        return {"message": "GitHub already connected", "user": user_public(user)}

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": body.code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()

    gh_access_token = token_data.get("access_token")
    if not gh_access_token:
        raise HTTPException(status_code=400, detail="Failed to authenticate with GitHub")

    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {gh_access_token}", "Accept": "application/json"},
        )
        gh_user = user_resp.json()

    gh_username = gh_user.get("login")
    if not gh_username:
        raise HTTPException(status_code=400, detail="Could not retrieve GitHub username")

    update: dict = {
        "github_username": gh_username,
        "github_access_token": gh_access_token,
        "github_connected_at": datetime.utcnow().isoformat(),
    }
    user["github_username"] = gh_username
    if check_onboarding_complete(user):
        update["onboarding_completed"] = True
        update["onboarding_completed_at"] = datetime.utcnow().isoformat()
        user["onboarding_completed"] = True

    await users_col.update_one({"email": email}, {"$set": update})
    return {"message": "GitHub connected", "user": user_public(user)}

# --- Dashboard ---

@app.get("/api/dashboard")
async def get_dashboard(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)

    if user["role"] == "builder":
        total_projects = await projects_col.count_documents({"builder_email": email})
        active_jobs = await jobs_col.count_documents({"builder_email": email, "status": {"$in": ["open", "in_progress"]}})
        pending_reviews = await submissions_col.count_documents({"builder_email": email, "status": "submitted"})
        completed_jobs = await jobs_col.count_documents({"builder_email": email, "status": "completed"})

        # Total spent: v1 jobs total_charge + v2 bid total_charge
        spent_pipeline = [
            {"$match": {"builder_email": email, "status": {"$ne": "pending_payment"}, "total_charge": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_charge"}}},
        ]
        spent_result = await jobs_col.aggregate(spent_pipeline).to_list(1)
        total_spent = spent_result[0]["total"] if spent_result else 0

        # V2 bid spending
        builder_v2_jobs = await jobs_col.find({"builder_email": email, "version": 2}).to_list(200)
        v2_job_ids = [j["_id"] for j in builder_v2_jobs]
        bid_spent_pipeline = [
            {"$match": {"job_id": {"$in": v2_job_ids}, "payment_status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_charge"}}},
        ]
        bid_spent_result = await bids_col.aggregate(bid_spent_pipeline).to_list(1)
        total_spent += bid_spent_result[0]["total"] if bid_spent_result else 0

        # Pending bids count for builder
        pending_bids = await bids_col.count_documents({"job_id": {"$in": v2_job_ids}, "status": "pending"})

        return {
            "role": "builder",
            "stats": {
                "total_projects": total_projects,
                "active_jobs": active_jobs,
                "pending_reviews": pending_reviews,
                "completed_jobs": completed_jobs,
                "total_spent": total_spent,
                "pending_bids": pending_bids,
            },
        }
    else:
        claimed = await submissions_col.count_documents({"tester_email": email, "status": "draft"})
        completed = await submissions_col.count_documents({"tester_email": email, "status": "approved"})
        pending = await submissions_col.count_documents({"tester_email": email, "status": "submitted"})

        # Earnings: v1 from job.payout_amount, v2 from submission.payout_amount
        v1_pipeline = [
            {"$match": {"tester_email": email, "status": "approved", "payout_amount": None}},
            {"$lookup": {"from": "jobs", "localField": "job_id", "foreignField": "_id", "as": "job"}},
            {"$unwind": "$job"},
            {"$group": {"_id": None, "total": {"$sum": "$job.payout_amount"}}},
        ]
        v1_result = await submissions_col.aggregate(v1_pipeline).to_list(1)
        v1_earnings = v1_result[0]["total"] if v1_result else 0

        v2_pipeline = [
            {"$match": {"tester_email": email, "status": "approved", "payout_amount": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$payout_amount"}}},
        ]
        v2_result = await submissions_col.aggregate(v2_pipeline).to_list(1)
        v2_earnings = v2_result[0]["total"] if v2_result else 0

        earnings = v1_earnings + v2_earnings

        # Active bids count for tester
        active_bids = await bids_col.count_documents({"tester_email": email, "status": "pending"})

        return {
            "role": "tester",
            "stats": {
                "claimed_jobs": claimed,
                "completed": completed,
                "pending_review": pending,
                "earnings": earnings,
                "active_bids": active_bids,
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

# --- Service Types (public) ---

@app.get("/api/pricing/service-types")
async def get_service_types():
    return SERVICE_TYPES

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

# --- V2 Structured Jobs ---

@app.post("/api/v2/jobs", status_code=201)
async def create_job_v2(body: JobCreateV2, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create jobs")

    project = await projects_col.find_one({"_id": body.project_id, "builder_email": email})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    roles = []
    proposed_total = 0.0
    for role in body.roles:
        role_id = f"role_{uuid.uuid4().hex[:8]}"
        items = []
        for item in role.items:
            item_id = f"item_{uuid.uuid4().hex[:8]}"
            proposed_total += item.proposed_price
            items.append({
                "id": item_id,
                "title": item.title,
                "description": item.description,
                "service_type": item.service_type,
                "proposed_price": item.proposed_price,
                "estimated_minutes": item.estimated_minutes,
            })
        roles.append({
            "id": role_id,
            "name": role.name,
            "description": role.description,
            "items": items,
        })

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    doc = {
        "_id": job_id,
        "version": 2,
        "project_id": body.project_id,
        "project_name": project["name"],
        "builder_email": email,
        "title": body.title,
        "description": body.description,
        "assignment_type": body.assignment_type,
        "status": "open",
        "roles": roles,
        "proposed_total": round(proposed_total, 2),
        "estimated_time_minutes": body.estimated_time_minutes,
        "created_at": datetime.utcnow().isoformat(),
        # Legacy fields null for v2
        "payout_amount": None,
        "max_testers": None,
        "assigned_testers": [],
        "submissions": [],
        "total_charge": None,
        "platform_fee": None,
        "stripe_payment_intent_id": None,
    }
    await jobs_col.insert_one(doc)
    return doc_to_dict(doc)

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

@app.get("/api/jobs/public")
async def list_public_jobs():
    jobs = await jobs_col.find({"status": {"$in": ["open", "in_progress"]}}).sort("created_at", -1).to_list(50)

    result = []
    for job in jobs:
        project = await projects_col.find_one({"_id": job.get("project_id")})
        is_v2 = job.get("version") == 2

        entry = {
            "id": job["_id"],
            "title": job["title"],
            "estimated_time_minutes": job.get("estimated_time_minutes"),
            "category": project["category"] if project else None,
            "project_name": project["name"] if project else None,
            "description": (job.get("description") or "")[:200],
            "created_at": job.get("created_at"),
            "version": job.get("version", 1),
        }

        if is_v2:
            roles = job.get("roles", [])
            all_items = [item for r in roles for item in r.get("items", [])]
            prices = [item["proposed_price"] for item in all_items]
            service_types = list({item["service_type"] for item in all_items})
            entry["service_types"] = service_types
            entry["price_range"] = [min(prices), max(prices)] if prices else [0, 0]
            entry["roles_count"] = len(roles)
            entry["items_count"] = len(all_items)
            entry["assignment_type"] = job.get("assignment_type")
            entry["proposed_total"] = job.get("proposed_total")
            entry["payout_amount"] = None
            entry["max_testers"] = None
            entry["slots_remaining"] = None
        else:
            assigned = job.get("assigned_testers", [])
            entry["payout_amount"] = job.get("payout_amount")
            entry["max_testers"] = job.get("max_testers")
            entry["slots_remaining"] = (job.get("max_testers") or 0) - len(assigned)
            entry["service_types"] = None
            entry["price_range"] = None
            entry["roles_count"] = None
            entry["items_count"] = None
            entry["assignment_type"] = None
            entry["proposed_total"] = None

        result.append(entry)

    return result

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
    if job.get("version") == 2:
        raise HTTPException(status_code=400, detail="Use bidding for structured jobs")
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
        "builder_rating": None,
        "video_url": None,
        "video_tags": [],
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

# --- Bids ---

def get_scope_items(job: dict, bid: dict) -> list:
    """Get all items within a bid's scope based on assignment_type."""
    roles = job.get("roles", [])
    scope_type = bid.get("scope_type", job.get("assignment_type"))

    if scope_type == "per_job":
        return [item for r in roles for item in r.get("items", [])]
    elif scope_type == "per_role":
        role_id = bid.get("scope_role_id")
        for r in roles:
            if r["id"] == role_id:
                return r.get("items", [])
        return []
    elif scope_type == "per_item":
        item_id = bid.get("scope_item_id")
        for r in roles:
            for item in r.get("items", []):
                if item["id"] == item_id:
                    return [item]
        return []
    return []

def get_proposed_price_for_scope(job: dict, scope_role_id: str | None, scope_item_id: str | None) -> float:
    """Calculate proposed price for a bid scope."""
    assignment = job.get("assignment_type")
    roles = job.get("roles", [])

    if assignment == "per_job":
        return sum(item["proposed_price"] for r in roles for item in r.get("items", []))
    elif assignment == "per_role" and scope_role_id:
        for r in roles:
            if r["id"] == scope_role_id:
                return sum(item["proposed_price"] for item in r.get("items", []))
    elif assignment == "per_item" and scope_item_id:
        for r in roles:
            for item in r.get("items", []):
                if item["id"] == scope_item_id:
                    return item["proposed_price"]
    return 0.0

@app.post("/api/jobs/{job_id}/bids", status_code=201)
async def create_bid(job_id: str, body: BidCreate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can bid")

    job = await jobs_col.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("version") != 2:
        raise HTTPException(status_code=400, detail="Bidding is only for structured jobs")
    if job["status"] not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Job is not accepting bids")

    assignment = job["assignment_type"]

    # Validate scope fields
    if assignment == "per_role" and not body.scope_role_id:
        raise HTTPException(status_code=400, detail="scope_role_id is required for per_role jobs")
    if assignment == "per_item" and not body.scope_item_id:
        raise HTTPException(status_code=400, detail="scope_item_id is required for per_item jobs")

    # Check for existing pending bid in same scope
    dup_query = {"job_id": job_id, "tester_email": email, "status": "pending"}
    if assignment == "per_role":
        dup_query["scope_role_id"] = body.scope_role_id
    elif assignment == "per_item":
        dup_query["scope_item_id"] = body.scope_item_id
    if await bids_col.find_one(dup_query):
        raise HTTPException(status_code=400, detail="You already have a pending bid for this scope")

    proposed = get_proposed_price_for_scope(job, body.scope_role_id, body.scope_item_id)
    is_counter = abs(body.bid_price - proposed) > 0.01

    bid_id = f"bid_{uuid.uuid4().hex[:8]}"
    bid_doc = {
        "_id": bid_id,
        "job_id": job_id,
        "job_title": job["title"],
        "tester_email": email,
        "tester_name": f"{user['first_name']} {user['last_name']}",
        "status": "pending",
        "scope_type": assignment,
        "scope_role_id": body.scope_role_id if assignment in ("per_role",) else None,
        "scope_item_id": body.scope_item_id if assignment in ("per_item",) else None,
        "proposed_price": proposed,
        "bid_price": body.bid_price,
        "is_counter": is_counter,
        "message": body.message,
        "platform_fee": None,
        "total_charge": None,
        "stripe_payment_intent_id": None,
        "payment_status": None,
        "created_at": datetime.utcnow().isoformat(),
        "accepted_at": None,
    }
    await bids_col.insert_one(bid_doc)

    # Notify builder
    builder = await users_col.find_one({"email": job["builder_email"]})
    if builder:
        send_email(
            job["builder_email"],
            f"New bid on your job: {job['title']}",
            email_new_bid_html(builder["first_name"], f"{user['first_name']} {user['last_name']}", job["title"], job_id, body.bid_price, is_counter),
        )

    return doc_to_dict(bid_doc)

@app.get("/api/jobs/{job_id}/bids")
async def list_job_bids(job_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    job = await jobs_col.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if user["role"] == "builder" and job["builder_email"] == email:
        bids = await bids_col.find({"job_id": job_id}).sort("created_at", -1).to_list(100)
    elif user["role"] == "tester":
        bids = await bids_col.find({"job_id": job_id, "tester_email": email}).sort("created_at", -1).to_list(100)
    else:
        raise HTTPException(status_code=403, detail="Not authorized to view bids for this job")

    return [doc_to_dict(b) for b in bids]

@app.get("/api/bids")
async def list_my_bids(email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] == "tester":
        bids = await bids_col.find({"tester_email": email}).sort("created_at", -1).to_list(200)
    else:
        # Builder sees bids on all their jobs
        builder_jobs = await jobs_col.find({"builder_email": email, "version": 2}).to_list(200)
        job_ids = [j["_id"] for j in builder_jobs]
        bids = await bids_col.find({"job_id": {"$in": job_ids}}).sort("created_at", -1).to_list(200)

    # Enrich bids missing job_title
    missing_title_ids = list({b["job_id"] for b in bids if not b.get("job_title")})
    if missing_title_ids:
        jobs_lookup = {j["_id"]: j["title"] async for j in jobs_col.find({"_id": {"$in": missing_title_ids}}, {"title": 1})}
        for b in bids:
            if not b.get("job_title"):
                b["job_title"] = jobs_lookup.get(b["job_id"], "")

    return [doc_to_dict(b) for b in bids]

@app.get("/api/bids/{bid_id}")
async def get_bid(bid_id: str, email: str = Depends(verify_token)):
    bid = await bids_col.find_one({"_id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    user = await get_user_or_404(email)
    job = await jobs_col.find_one({"_id": bid["job_id"]})
    is_builder = user["role"] == "builder" and job and job["builder_email"] == email
    is_tester = user["role"] == "tester" and bid["tester_email"] == email
    if not is_builder and not is_tester:
        raise HTTPException(status_code=403, detail="Not authorized to view this bid")

    return doc_to_dict(bid)

@app.post("/api/bids/{bid_id}/accept")
async def accept_bid(bid_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can accept bids")

    bid = await bids_col.find_one({"_id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if bid["status"] != "pending":
        raise HTTPException(status_code=400, detail="Bid is not pending")

    job = await jobs_col.find_one({"_id": bid["job_id"]})
    if not job or job["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your job")

    platform_fee = round(bid["bid_price"] * PLATFORM_FEE_RATE, 2)
    total_charge = round(bid["bid_price"] + platform_fee, 2)

    customer_id = await get_or_create_stripe_customer(user)
    pi = stripe.PaymentIntent.create(
        amount=int(round(total_charge * 100)),
        currency="usd",
        customer=customer_id,
        metadata={"type": "bid_payment", "bid_id": bid_id, "job_id": bid["job_id"], "builder_email": email},
        automatic_payment_methods={"enabled": True},
    )

    await bids_col.update_one({"_id": bid_id}, {"$set": {
        "status": "accepted",
        "platform_fee": platform_fee,
        "total_charge": total_charge,
        "stripe_payment_intent_id": pi.id,
        "payment_status": "pending",
        "accepted_at": datetime.utcnow().isoformat(),
    }})

    bid["status"] = "accepted"
    bid["platform_fee"] = platform_fee
    bid["total_charge"] = total_charge
    bid["stripe_payment_intent_id"] = pi.id
    bid["payment_status"] = "pending"

    result = doc_to_dict(bid)
    result["client_secret"] = pi.client_secret
    return result

@app.post("/api/bids/{bid_id}/reject")
async def reject_bid(bid_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can reject bids")

    bid = await bids_col.find_one({"_id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if bid["status"] != "pending":
        raise HTTPException(status_code=400, detail="Bid is not pending")

    job = await jobs_col.find_one({"_id": bid["job_id"]})
    if not job or job["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your job")

    await bids_col.update_one({"_id": bid_id}, {"$set": {"status": "rejected"}})

    # Notify tester
    tester = await users_col.find_one({"email": bid["tester_email"]})
    if tester:
        send_email(
            bid["tester_email"],
            f"Your bid on \"{job['title']}\" was not accepted",
            email_bid_rejected_html(tester["first_name"], job["title"]),
        )

    bid["status"] = "rejected"
    return doc_to_dict(bid)

@app.post("/api/bids/{bid_id}/withdraw")
async def withdraw_bid(bid_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can withdraw bids")

    bid = await bids_col.find_one({"_id": bid_id, "tester_email": email})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if bid["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only withdraw pending bids")

    await bids_col.update_one({"_id": bid_id}, {"$set": {"status": "withdrawn"}})
    bid["status"] = "withdrawn"
    return doc_to_dict(bid)

@app.post("/api/bids/{bid_id}/confirm-payment")
async def confirm_bid_payment(bid_id: str, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can confirm payment")

    bid = await bids_col.find_one({"_id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if bid["status"] != "accepted" or bid.get("payment_status") != "pending":
        raise HTTPException(status_code=400, detail="Bid payment not in pending state")

    job = await jobs_col.find_one({"_id": bid["job_id"]})
    if not job or job["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your job")

    # Verify PI succeeded
    pi = stripe.PaymentIntent.retrieve(bid["stripe_payment_intent_id"])
    if pi.status != "succeeded":
        raise HTTPException(status_code=400, detail=f"Payment not completed. Status: {pi.status}")

    await bids_col.update_one({"_id": bid_id}, {"$set": {"payment_status": "paid"}})

    # Create submissions for each item in scope
    scope_items = get_scope_items(job, bid)
    num_items = len(scope_items) or 1
    per_item_payout = round(bid["bid_price"] / num_items, 2)

    # Figure out role_id for each item
    role_map = {}
    for r in job.get("roles", []):
        for item in r.get("items", []):
            role_map[item["id"]] = r["id"]

    tester = await users_col.find_one({"email": bid["tester_email"]})
    tester_name = f"{tester['first_name']} {tester['last_name']}" if tester else bid.get("tester_name", "")

    sub_ids = []
    for item in scope_items:
        sub_id = f"sub_{uuid.uuid4().hex[:8]}"
        submission = {
            "_id": sub_id,
            "job_id": bid["job_id"],
            "job_title": job["title"],
            "project_id": job["project_id"],
            "builder_email": job["builder_email"],
            "tester_email": bid["tester_email"],
            "tester_name": tester_name,
            "status": "draft",
            "overall_feedback": "",
            "bug_reports": [],
            "usability_score": None,
            "suggestions": "",
            "review_feedback": "",
            "stripe_transfer_id": None,
            "builder_rating": None,
            "video_url": None,
            "video_tags": [],
            "created_at": datetime.utcnow().isoformat(),
            "submitted_at": None,
            "reviewed_at": None,
            # V2 fields
            "bid_id": bid_id,
            "item_id": item["id"],
            "role_id": role_map.get(item["id"]),
            "service_type": item["service_type"],
            "document_content": None,
            "transcript": None,
            "payout_amount": per_item_payout,
        }
        await submissions_col.insert_one(submission)
        sub_ids.append(sub_id)

    # Update job
    await jobs_col.update_one({"_id": bid["job_id"]}, {
        "$addToSet": {"assigned_testers": bid["tester_email"]},
        "$push": {"submissions": {"$each": sub_ids}},
        "$set": {"status": "in_progress"},
    })

    # Email tester
    if tester:
        send_email(
            bid["tester_email"],
            f"Your bid on \"{job['title']}\" was accepted!",
            email_bid_accepted_html(tester["first_name"], job["title"], bid["job_id"], bid["bid_price"]),
        )

    return {"message": "Payment confirmed, submissions created", "submission_ids": sub_ids}

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

    service_type = doc.get("service_type")
    if service_type in ("test", None):
        # V1 or "test" service: require feedback + score
        if not doc.get("overall_feedback", "").strip():
            raise HTTPException(status_code=400, detail="Overall feedback is required")
        if doc.get("usability_score") is None:
            raise HTTPException(status_code=400, detail="Usability score is required")
    elif service_type == "record":
        if not doc.get("video_url"):
            raise HTTPException(status_code=400, detail="Screen recording is required for record submissions")
        if not doc.get("overall_feedback", "").strip():
            raise HTTPException(status_code=400, detail="Overall feedback is required")
    elif service_type == "document":
        if not doc.get("document_content", "").strip():
            raise HTTPException(status_code=400, detail="Documentation content is required")
    elif service_type == "voiceover":
        if not doc.get("video_url"):
            raise HTTPException(status_code=400, detail="Narrated recording is required for voiceover submissions")

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

    if action.rating is not None:
        update_fields["builder_rating"] = action.rating
        await users_col.update_one(
            {"email": doc["tester_email"]},
            {"$inc": {"total_ratings": 1, "rating_sum": action.rating}},
        )

    # Determine payout amount — v2 uses per-item payout from bid, v1 uses job.payout_amount
    job = await jobs_col.find_one({"_id": doc["job_id"]})
    tester = await users_col.find_one({"email": doc["tester_email"]})
    transfer_id = None

    payout = doc.get("payout_amount") or (job.get("payout_amount") if job else 0) or 0

    if tester and tester.get("stripe_connect_onboarded") and tester.get("stripe_connect_id") and payout > 0:
        try:
            transfer = stripe.Transfer.create(
                amount=int(round(payout * 100)),
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
        all_subs = await submissions_col.find({"job_id": doc["job_id"]}).to_list(200)
        if all(s["status"] in ("approved", "rejected") or s["_id"] == sub_id for s in all_subs):
            await jobs_col.update_one({"_id": doc["job_id"]}, {"$set": {"status": "completed"}})
            if not job.get("version") == 2:
                await check_and_refund_unclaimed_slots(job)

    # Notify tester
    if tester and job:
        send_email(
            doc["tester_email"],
            f"Your submission for \"{job['title']}\" was approved!",
            email_approved_html(tester["first_name"], job["title"], payout),
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

# --- Tester Profiles ---

@app.get("/api/testers/{github_username}")
async def get_tester_profile(github_username: str):
    user = await users_col.find_one({"github_username": github_username, "role": "tester"})
    if not user or not user.get("profile_visible", True):
        raise HTTPException(status_code=404, detail="Tester not found")

    total_ratings = user.get("total_ratings", 0)
    avg_rating = round(user.get("rating_sum", 0) / total_ratings, 1) if total_ratings > 0 else 0
    completed = await submissions_col.count_documents({"tester_email": user["email"], "status": "approved"})

    reviews = await submissions_col.find(
        {"tester_email": user["email"], "status": "approved", "builder_rating": {"$ne": None}},
    ).sort("reviewed_at", -1).limit(10).to_list(10)

    public_reviews = []
    for r in reviews:
        builder = await users_col.find_one({"email": r["builder_email"]})
        public_reviews.append({
            "job_title": r.get("job_title", ""),
            "builder_name": f"{builder['first_name']} {builder['last_name']}" if builder else "Unknown",
            "rating": r["builder_rating"],
            "feedback": r.get("review_feedback", ""),
            "reviewed_at": r.get("reviewed_at"),
        })

    return {
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "github_username": github_username,
        "bio": user.get("bio", ""),
        "specialties": user.get("specialties", []),
        "avg_rating": avg_rating,
        "total_ratings": total_ratings,
        "completed_tests": completed,
        "created_at": user.get("created_at"),
        "reviews": public_reviews,
    }

@app.put("/api/profile")
async def update_profile(body: ProfileUpdate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can update profiles")

    await users_col.update_one(
        {"email": email},
        {"$set": {"bio": body.bio, "specialties": body.specialties[:10], "profile_visible": body.profile_visible}},
    )
    user["bio"] = body.bio
    user["specialties"] = body.specialties[:10]
    user["profile_visible"] = body.profile_visible
    return {"message": "Profile updated", "user": user_public(user)}

# --- Video Upload & Tags ---

@app.post("/api/submissions/{sub_id}/upload-video")
async def upload_video(sub_id: str, file: UploadFile = File(...), email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can upload videos")

    doc = await submissions_col.find_one({"_id": sub_id, "tester_email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")
    if doc["status"] != "draft":
        raise HTTPException(status_code=400, detail="Can only upload video for draft submissions")

    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: webm, mp4, quicktime")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
    filename = f"{sub_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = Path(UPLOAD_DIR) / filename

    size = 0
    async with aiofiles.open(filepath, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_SIZE:
                await f.close()
                filepath.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large (max 500MB)")
            await f.write(chunk)

    video_url = f"/uploads/{filename}"
    await submissions_col.update_one({"_id": sub_id}, {"$set": {"video_url": video_url}})
    return {"video_url": video_url}

@app.put("/api/submissions/{sub_id}/video-tags")
async def update_video_tags(sub_id: str, body: VideoTagsUpdate, email: str = Depends(verify_token)):
    user = await get_user_or_404(email)
    doc = await submissions_col.find_one({"_id": sub_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found")

    is_owner = (user["role"] == "tester" and doc["tester_email"] == email) or \
               (user["role"] == "builder" and doc["builder_email"] == email)
    if not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to tag this submission")
    if not doc.get("video_url"):
        raise HTTPException(status_code=400, detail="No video uploaded for this submission")

    tags = [t.model_dump() for t in body.video_tags]
    await submissions_col.update_one({"_id": sub_id}, {"$set": {"video_tags": tags}})
    return {"video_tags": tags}

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
        # Backup: mark job open if confirm-payment wasn't called (v1)
        job = await jobs_col.find_one({"stripe_payment_intent_id": pi["id"], "status": "pending_payment"})
        if job:
            await jobs_col.update_one({"_id": job["_id"]}, {"$set": {"status": "open"}})
            logger.info("Webhook: marked job %s as open (PI %s)", job["_id"], pi["id"])

        # Backup: mark bid payment as paid if confirm-payment wasn't called (v2)
        bid = await bids_col.find_one({"stripe_payment_intent_id": pi["id"], "payment_status": "pending"})
        if bid:
            await bids_col.update_one({"_id": bid["_id"]}, {"$set": {"payment_status": "paid"}})
            logger.info("Webhook: marked bid %s as paid (PI %s)", bid["_id"], pi["id"])

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

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
