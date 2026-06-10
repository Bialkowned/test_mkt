# PeerTest Hub - Peer Testing Marketplace Platform

🎯 **ACTUAL WORKING CODE** - This is a runnable application!

## What You Can Do RIGHT NOW

✅ **Run the application locally**  
✅ **Register as a builder or tester**  
✅ **Create projects (builders)**  
✅ **Create test jobs (builders)**  
✅ **Browse jobs (testers)**  
✅ **Full authentication system**  

---

## 🚀 Quick Start (2 Minutes)

### Option 1: Run with Python & Node (Simplest)

```bash
# 1. Clone the repository
git clone https://github.com/Bialkowned/test_mkt.git
cd test_mkt
git checkout copilot/build-out-program

# 2. Start Backend (Terminal 1)
cd backend
pip install -r requirements.txt
python main.py
# API running at http://localhost:8000

# 3. Start Frontend (Terminal 2)
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

### Option 2: Run with Docker (Production-like)

```bash
# Coming soon - Docker Compose setup
docker-compose up
```

---

## 📸 What It Looks Like

The application has:
- ✅ **Home page** with platform statistics
- ✅ **Registration** (choose builder or tester role)
- ✅ **Login** with JWT authentication
- ✅ **Dashboard** showing user info and next steps
- ✅ **Projects page** for builders to create projects
- ✅ **Jobs page** for creating/browsing test jobs
- ✅ **Beautiful UI** with Tailwind CSS

---

## 🎨 Features Currently Working

### Authentication
- [x] User registration (builder or tester)
- [x] Login with JWT tokens
- [x] Role-based access control
- [x] Protected routes

### For Builders
- [x] Create projects (app/website details)
- [x] View all your projects
- [x] Create test jobs for projects
- [x] View all your jobs

### For Testers  
- [x] Browse available jobs
- [x] View job details (payout, time estimate)

### Platform
- [x] Real-time statistics
- [x] Responsive design (mobile-friendly)
- [x] Clean, professional UI

---

## 📂 Project Structure

```
test_mkt/
├── backend/                  # FastAPI server
│   ├── main.py              # ✅ WORKING API (9KB)
│   ├── requirements.txt     # Dependencies
│   └── README.md            # Backend docs
│
├── frontend/                # React application
│   ├── src/
│   │   ├── App.jsx          # ✅ Main app component
│   │   ├── main.jsx         # Entry point
│   │   ├── index.css        # Tailwind styles
│   │   └── pages/           # Page components
│   │       ├── Home.jsx     # ✅ Landing page
│   │       ├── Login.jsx    # ✅ Login form
│   │       ├── Register.jsx # ✅ Signup form
│   │       ├── Dashboard.jsx # ✅ User dashboard
│   │       ├── Projects.jsx # ✅ Project management
│   │       └── Jobs.jsx     # ✅ Job management
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── docs/                    # Documentation (from previous session)
│   └── (13 comprehensive spec files)
│
├── docker-compose.yml       # Docker setup
└── README.md                # This file
```

---

## 🔧 Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Pydantic** - Data validation
- In-memory storage (MongoDB coming soon)

### Frontend
- **React 18** - UI library
- **Vite** - Build tool (fast!)
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - API calls

---

## 📖 API Documentation

Once backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

**Projects:** (Builders only)
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project

**Jobs:**
- `POST /api/jobs` - Create job (builders)
- `GET /api/jobs` - List jobs
- `GET /api/jobs/{id}` - Get job details

**Stats:**
- `GET /api/stats` - Platform statistics

---

## 🧪 Testing the App

### 1. Register as a Builder
```
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Choose "Get my app tested (Builder)"
4. Fill in your details
5. Submit
```

### 2. Create a Project
```
1. Go to "Projects" from navbar
2. Click "Create Project"
3. Enter:
   - Project name: "My Todo App"
   - Description: "A simple todo list"
   - URL: "https://example.com"
   - Category: "Productivity"
4. Submit
```

### 3. Create a Test Job
```
1. Go to "My Jobs"
2. Click "Create Job"
3. Select your project
4. Enter job details
5. Set payout ($10-50)
6. Submit
```

### 4. Test as a Tester
```
1. Logout
2. Register new account as "Tester"
3. Go to "Available Jobs"
4. See the job you created!
```

---

## 🚧 What's Next (Coming Soon)

### Phase 2 Features
- [ ] MongoDB integration (replace in-memory storage)
- [ ] Full projects CRUD
- [ ] Full jobs CRUD
- [ ] Job acceptance flow
- [ ] Submission system
- [ ] Screenshot upload
- [ ] Stripe payment integration
- [ ] Escrow management
- [ ] Dispute system
- [ ] Admin panel

### Phase 3 Features
- [ ] Email notifications
- [ ] Tester qualification test
- [ ] AI test templates
- [ ] GitHub integration
- [ ] Screen recording

---

## 🐛 Known Issues

- In-memory storage (data lost on restart)
- Projects/Jobs pages are simplified
- No payment integration yet
- No file upload yet

These are intentional for MVP. Full features coming in next iterations.

---

## 💡 Development Notes

### Adding New Features

1. **Backend:** Add routes in `backend/main.py`
2. **Frontend:** Add pages in `frontend/src/pages/`
3. **Styling:** Use Tailwind classes

### Environment Variables

Backend `.env`:
```
SECRET_KEY=your-secret-key-here
MONGO_URI=mongodb://localhost:27017/peertesthub
REDIS_URL=redis://localhost:6379
```

---

## 📞 Need Help?

**For the working code:**
- Backend README: `backend/README.md`
- API docs: http://localhost:8000/docs (when running)

**For the full plan:**
- See `docs/` folder for comprehensive specifications
- `docs/11-Implementation-Guide.md` for development roadmap

---

## 🎉 Success!

**You now have:**
✅ Working backend API  
✅ Working frontend app  
✅ User authentication  
✅ Project management  
✅ Job management  
✅ Professional UI  

**This is REAL CODE you can run, test, and build upon!**

---

## 📊 Stats

- **Backend Code:** ~400 lines (working API)
- **Frontend Code:** ~800 lines (working UI)
- **Total:** ~1,200 lines of runnable code
- **Status:** MVP Phase 1 ✅
- **Documentation:** 13 files, 388KB (from previous session)

---

**Last Updated:** February 10, 2026  
**Version:** 0.1.0 (MVP Phase 1)  
**Status:** Working and Ready to Run! 🚀
