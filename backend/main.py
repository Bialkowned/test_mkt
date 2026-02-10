from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
import bcrypt
import os
import uuid

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

# Initialize FastAPI
app = FastAPI(
    title="PeerTest Hub API",
    description="API for peer testing marketplace platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5008"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory data store
users_db = {}
projects_db = {}
jobs_db = {}
submissions_db = {}

# --- Models ---

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    role: str = Field(..., pattern="^(builder|tester)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Project(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str
    hosted_url: str
    category: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hosted_url: Optional[str] = None
    category: Optional[str] = None

class Job(BaseModel):
    project_id: str
    title: str
    description: str
    payout_amount: float = Field(..., gt=0, le=1000)
    max_testers: int = Field(..., ge=1, le=10)
    estimated_time_minutes: int

class BugReport(BaseModel):
    title: str
    description: str
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    steps_to_reproduce: str

class SubmissionCreate(BaseModel):
    job_id: str
    overall_feedback: str = ""
    bug_reports: List[dict] = []
    usability_score: Optional[int] = Field(None, ge=1, le=5)
    suggestions: str = ""

class SubmissionUpdate(BaseModel):
    overall_feedback: Optional[str] = None
    bug_reports: Optional[List[dict]] = None
    usability_score: Optional[int] = Field(None, ge=1, le=5)
    suggestions: Optional[str] = None

class ReviewAction(BaseModel):
    feedback: str = ""

# --- Helpers ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_user_or_404(email: str):
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Routes ---

@app.get("/")
async def root():
    return {
        "message": "PeerTest Hub API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "users_count": len(users_db),
        "projects_count": len(projects_db),
        "jobs_count": len(jobs_db)
    }

# --- Auth ---

@app.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = {
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "created_at": datetime.utcnow().isoformat(),
        "is_verified": False
    }
    users_db[user.email] = user_data

    access_token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role
        }
    }

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = users_db.get(credentials.email)
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user["email"], "role": user["role"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user(email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    return {
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
        "created_at": user["created_at"]
    }

# --- Dashboard ---

@app.get("/api/dashboard")
async def get_dashboard(email: str = Depends(verify_token)):
    user = get_user_or_404(email)

    if user["role"] == "builder":
        my_projects = [p for p in projects_db.values() if p["builder_email"] == email]
        my_jobs = [j for j in jobs_db.values() if j["builder_email"] == email]
        my_submissions = [s for s in submissions_db.values()
                         if s["builder_email"] == email and s["status"] == "submitted"]
        completed_jobs = [j for j in my_jobs if j["status"] == "completed"]

        return {
            "role": "builder",
            "stats": {
                "total_projects": len(my_projects),
                "active_jobs": sum(1 for j in my_jobs if j["status"] in ("open", "in_progress")),
                "pending_reviews": len(my_submissions),
                "completed_jobs": len(completed_jobs),
            }
        }
    else:
        my_submissions = [s for s in submissions_db.values() if s["tester_email"] == email]
        claimed = [s for s in my_submissions if s["status"] == "draft"]
        completed = [s for s in my_submissions if s["status"] == "approved"]
        pending = [s for s in my_submissions if s["status"] == "submitted"]
        earnings = sum(
            jobs_db[s["job_id"]]["payout_amount"]
            for s in completed
            if s["job_id"] in jobs_db
        )

        return {
            "role": "tester",
            "stats": {
                "claimed_jobs": len(claimed),
                "completed": len(completed),
                "pending_review": len(pending),
                "earnings": earnings,
            }
        }

# --- Projects ---

@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
async def create_project(project: Project, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create projects")

    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    project_data = {
        "id": project_id,
        "builder_email": email,
        "name": project.name,
        "description": project.description,
        "hosted_url": project.hosted_url,
        "category": project.category,
        "created_at": datetime.utcnow().isoformat(),
        "status": "active"
    }
    projects_db[project_id] = project_data
    return project_data

@app.get("/api/projects")
async def list_projects(email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] == "builder":
        return [p for p in projects_db.values() if p["builder_email"] == email]
    else:
        return [p for p in projects_db.values() if p["status"] == "active"]

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, email: str = Depends(verify_token)):
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, updates: ProjectUpdate, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can update projects")

    project = projects_db.get(project_id)
    if not project or project["builder_email"] != email:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = updates.model_dump(exclude_none=True)
    project.update(update_data)
    return project

# --- Jobs ---

@app.post("/api/jobs", status_code=status.HTTP_201_CREATED)
async def create_job(job: Job, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create jobs")

    project = projects_db.get(job.project_id)
    if not project or project["builder_email"] != email:
        raise HTTPException(status_code=404, detail="Project not found")

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    job_data = {
        "id": job_id,
        "project_id": job.project_id,
        "project_name": project["name"],
        "builder_email": email,
        "title": job.title,
        "description": job.description,
        "payout_amount": job.payout_amount,
        "max_testers": job.max_testers,
        "estimated_time_minutes": job.estimated_time_minutes,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
        "assigned_testers": [],
        "submissions": [],
    }
    jobs_db[job_id] = job_data
    return job_data

@app.get("/api/jobs")
async def list_jobs(email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] == "builder":
        return [j for j in jobs_db.values() if j["builder_email"] == email]
    else:
        # Testers see open/in_progress jobs + jobs they're assigned to
        results = []
        for j in jobs_db.values():
            if j["status"] in ("open", "in_progress") or email in j.get("assigned_testers", []):
                results.append(j)
        return results

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, email: str = Depends(verify_token)):
    job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/api/jobs/{job_id}/claim")
async def claim_job(job_id: str, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can claim jobs")

    job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Job is not available for claiming")

    if email in job.get("assigned_testers", []):
        raise HTTPException(status_code=400, detail="You already claimed this job")

    if len(job.get("assigned_testers", [])) >= job["max_testers"]:
        raise HTTPException(status_code=400, detail="Job has reached maximum testers")

    job["assigned_testers"].append(email)

    # Create a draft submission for the tester
    sub_id = f"sub_{uuid.uuid4().hex[:8]}"
    submission = {
        "id": sub_id,
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
        "created_at": datetime.utcnow().isoformat(),
        "submitted_at": None,
        "reviewed_at": None,
    }
    submissions_db[sub_id] = submission
    job["submissions"].append(sub_id)

    # Auto-transition to in_progress when at least one tester claims
    if job["status"] == "open":
        job["status"] = "in_progress"

    return {"message": "Job claimed successfully", "submission_id": sub_id, "job": job}

# --- Submissions ---

@app.get("/api/submissions")
async def list_submissions(job_id: Optional[str] = None, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    results = []
    for s in submissions_db.values():
        if job_id and s["job_id"] != job_id:
            continue
        if user["role"] == "builder" and s["builder_email"] == email:
            results.append(s)
        elif user["role"] == "tester" and s["tester_email"] == email:
            results.append(s)
    return results

@app.get("/api/submissions/{sub_id}")
async def get_submission(sub_id: str, email: str = Depends(verify_token)):
    submission = submissions_db.get(sub_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    user = get_user_or_404(email)
    if user["role"] == "builder" and submission["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission to view")
    if user["role"] == "tester" and submission["tester_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission")

    return submission

@app.put("/api/submissions/{sub_id}")
async def update_submission(sub_id: str, updates: SubmissionUpdate, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can update submissions")

    submission = submissions_db.get(sub_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["tester_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission")
    if submission["status"] != "draft":
        raise HTTPException(status_code=400, detail="Can only update draft submissions")

    update_data = updates.model_dump(exclude_none=True)
    submission.update(update_data)
    return submission

@app.post("/api/submissions/{sub_id}/submit")
async def submit_submission(sub_id: str, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "tester":
        raise HTTPException(status_code=403, detail="Only testers can submit")

    submission = submissions_db.get(sub_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["tester_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission")
    if submission["status"] != "draft":
        raise HTTPException(status_code=400, detail="Submission already submitted")

    if not submission["overall_feedback"].strip():
        raise HTTPException(status_code=400, detail="Overall feedback is required")
    if submission["usability_score"] is None:
        raise HTTPException(status_code=400, detail="Usability score is required")

    submission["status"] = "submitted"
    submission["submitted_at"] = datetime.utcnow().isoformat()
    return submission

@app.post("/api/submissions/{sub_id}/approve")
async def approve_submission(sub_id: str, action: ReviewAction, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can approve submissions")

    submission = submissions_db.get(sub_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission to review")
    if submission["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Can only approve submitted submissions")

    submission["status"] = "approved"
    submission["review_feedback"] = action.feedback
    submission["reviewed_at"] = datetime.utcnow().isoformat()

    # Check if all submissions for this job are approved → complete the job
    job = jobs_db.get(submission["job_id"])
    if job:
        job_submissions = [submissions_db[sid] for sid in job["submissions"] if sid in submissions_db]
        if all(s["status"] == "approved" for s in job_submissions) and len(job_submissions) > 0:
            job["status"] = "completed"

    return submission

@app.post("/api/submissions/{sub_id}/reject")
async def reject_submission(sub_id: str, action: ReviewAction, email: str = Depends(verify_token)):
    user = get_user_or_404(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can reject submissions")

    submission = submissions_db.get(sub_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission["builder_email"] != email:
        raise HTTPException(status_code=403, detail="Not your submission to review")
    if submission["status"] != "submitted":
        raise HTTPException(status_code=400, detail="Can only reject submitted submissions")

    submission["status"] = "rejected"
    submission["review_feedback"] = action.feedback
    submission["reviewed_at"] = datetime.utcnow().isoformat()
    return submission

# --- Stats (public) ---

@app.get("/api/stats")
async def get_stats():
    builders = sum(1 for u in users_db.values() if u["role"] == "builder")
    testers = sum(1 for u in users_db.values() if u["role"] == "tester")
    open_jobs = sum(1 for j in jobs_db.values() if j["status"] == "open")

    return {
        "total_users": len(users_db),
        "builders": builders,
        "testers": testers,
        "total_projects": len(projects_db),
        "total_jobs": len(jobs_db),
        "open_jobs": open_jobs
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5108)
