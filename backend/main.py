from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import os

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory data store (will be replaced with MongoDB later)
users_db = {}
projects_db = {}
jobs_db = {}

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    role: str = Field(..., regex="^(builder|tester)$")

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

class Job(BaseModel):
    project_id: str
    title: str
    description: str
    payout_amount: float = Field(..., gt=0, le=1000)
    max_testers: int = Field(..., ge=1, le=10)
    estimated_time_minutes: int

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
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

# Authentication endpoints
@app.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
    # Check if user already exists
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_data = {
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "created_at": datetime.utcnow().isoformat(),
        "is_verified": False  # In production, would send verification email
    }
    users_db[user.email] = user_data
    
    # Create token
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
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
        "created_at": user["created_at"]
    }

# Project endpoints (Builder only)
@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
async def create_project(project: Project, email: str = Depends(verify_token)):
    user = users_db.get(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create projects")
    
    project_id = f"proj_{len(projects_db) + 1}"
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
    user = users_db.get(email)
    if user["role"] == "builder":
        # Builders see their own projects
        return [p for p in projects_db.values() if p["builder_email"] == email]
    else:
        # Testers see all active projects
        return [p for p in projects_db.values() if p["status"] == "active"]

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, email: str = Depends(verify_token)):
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# Job endpoints
@app.post("/api/jobs", status_code=status.HTTP_201_CREATED)
async def create_job(job: Job, email: str = Depends(verify_token)):
    user = users_db.get(email)
    if user["role"] != "builder":
        raise HTTPException(status_code=403, detail="Only builders can create jobs")
    
    # Verify project exists and belongs to user
    project = projects_db.get(job.project_id)
    if not project or project["builder_email"] != email:
        raise HTTPException(status_code=404, detail="Project not found")
    
    job_id = f"job_{len(jobs_db) + 1}"
    job_data = {
        "id": job_id,
        "project_id": job.project_id,
        "builder_email": email,
        "title": job.title,
        "description": job.description,
        "payout_amount": job.payout_amount,
        "max_testers": job.max_testers,
        "estimated_time_minutes": job.estimated_time_minutes,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
        "current_testers": 0
    }
    jobs_db[job_id] = job_data
    
    return job_data

@app.get("/api/jobs")
async def list_jobs(email: str = Depends(verify_token)):
    user = users_db.get(email)
    if user["role"] == "builder":
        # Builders see their own jobs
        return [j for j in jobs_db.values() if j["builder_email"] == email]
    else:
        # Testers see open jobs
        return [j for j in jobs_db.values() if j["status"] == "open"]

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, email: str = Depends(verify_token)):
    job = jobs_db.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# Stats endpoint
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
