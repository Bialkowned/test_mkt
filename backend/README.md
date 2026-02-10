# PeerTest Hub Backend

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The API will be available at: http://localhost:8000

API Documentation: http://localhost:8000/docs

## Endpoints

### Authentication
- POST `/api/auth/register` - Register new user (builder or tester)
- POST `/api/auth/login` - Login and get JWT token
- GET `/api/auth/me` - Get current user info

### Projects (Builders only)
- POST `/api/projects` - Create new project
- GET `/api/projects` - List projects
- GET `/api/projects/{id}` - Get project details

### Jobs
- POST `/api/jobs` - Create test job (builders only)
- GET `/api/jobs` - List jobs (open jobs for testers, own jobs for builders)
- GET `/api/jobs/{id}` - Get job details

### Stats
- GET `/api/stats` - Platform statistics

## Testing

```bash
# Register a builder
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "builder@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe",
    "role": "builder"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "builder@example.com",
    "password": "password123"
  }'
```

## Current Status

✅ Working features:
- User registration (builders and testers)
- JWT authentication
- Project CRUD (create, read)
- Job CRUD (create, read)
- Role-based access control
- Platform statistics

🚧 In-memory storage (will be replaced with MongoDB)

📋 Next features:
- MongoDB integration
- Tester job acceptance
- Submission system
- Escrow payments
- Dispute resolution
