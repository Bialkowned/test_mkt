# PeerTest Hub - Deployment Setup

## Overview

This document provides comprehensive deployment instructions for PeerTest Hub. The application runs as native processes managed by **pm2**, talking to a **native MongoDB** (`mongod`) on `127.0.0.1:27017` and, where used, a native Redis on `127.0.0.1:6379`. There is no container runtime — the backend (Uvicorn/FastAPI) and frontend (Vite build served by nginx) run directly on the host.

**Deployment Targets:**
- Local Development (native services + pm2)
- Production (Linux VPS - DigitalOcean, AWS EC2, etc.)
- CI/CD (GitHub Actions)

---

## Table of Contents

1. [Process & Service Setup](#1-process--service-setup)
2. [Local Development](#2-local-development)
3. [Production Deployment](#3-production-deployment)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [SSL/HTTPS Setup](#5-sslhttps-setup)
6. [Monitoring & Logging](#6-monitoring--logging)
7. [Backup & Recovery](#7-backup--recovery)
8. [Maintenance](#8-maintenance)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Process & Service Setup

### 1.1 Native Services

MongoDB and Redis run natively on the host (installed via the OS package manager) and are managed by systemd:

```bash
# MongoDB — listens on 127.0.0.1:27017
sudo systemctl enable --now mongod
mongosh mongodb://127.0.0.1:27017

# Redis (if used) — listens on 127.0.0.1:6379
sudo systemctl enable --now redis
redis-cli ping
```

### 1.2 Backend Process

The FastAPI backend is run with Uvicorn under pm2:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 1.3 Frontend

The frontend is a Vite build. In development it runs the Vite dev server; in production the static `dist/` bundle is served by nginx (see section 3).

```bash
cd frontend
npm ci
npm run build   # produces dist/ for production
```

### 1.4 pm2 Ecosystem File

pm2 manages all long-running app processes. A single `ecosystem.config.js` at the repo root defines them:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'peertest-backend',
      cwd: './backend',
      script: './venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      env: {
        MONGODB_URL: 'mongodb://127.0.0.1:27017/peertest_hub',
        REDIS_URL: 'redis://127.0.0.1:6379',
        ENVIRONMENT: 'production'
      }
    },
    {
      name: 'peertest-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        VITE_API_URL: 'http://localhost:8000/api/v1'
      }
    }
  ]
};
```

In production the frontend is served as a static build by nginx rather than the Vite dev server, so the `peertest-frontend` process is typically only used in development.

### 1.5 Nginx Configuration

```nginx
# /etc/nginx/nginx.conf (or a site under /etc/nginx/sites-available)
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    server {
        listen 80;
        server_name _;
        root /var/www/peertest/frontend/dist;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy to the pm2-managed backend
        location /api {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 1.6 MongoDB Initialization

Create collections and indexes against the native mongod:

```javascript
// scripts/mongo-init.js  — run with: mongosh mongodb://127.0.0.1:27017 scripts/mongo-init.js
db = db.getSiblingDB('peertest_hub');

// Create collections
db.createCollection('users');
db.createCollection('projects');
db.createCollection('jobs');
db.createCollection('submissions');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.jobs.createIndex({ status: 1, published_at: -1 });
db.submissions.createIndex({ job_id: 1, tester_id: 1 });

print('Database initialized successfully');
```

---

## 2. Local Development

### 2.1 Quick Start

```bash
# Clone repository
git clone https://github.com/Bialkowned/test_mkt.git
cd test_mkt

# Create .env file
cat > .env << EOL
SECRET_KEY=$(openssl rand -hex 32)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOL

# Ensure native services are running
sudo systemctl start mongod
sudo systemctl start redis   # if Redis is used

# Start all app processes with pm2
pm2 start ecosystem.config.js

# View status and logs
pm2 status
pm2 logs
```

### 2.2 Access Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: mongodb://127.0.0.1:27017
- **Redis**: redis://127.0.0.1:6379

### 2.3 Development Commands

```bash
# Stop all app processes
pm2 stop ecosystem.config.js

# Restart after code changes
pm2 restart peertest-backend

# View logs for a specific process
pm2 logs peertest-backend

# Open a shell against MongoDB
mongosh mongodb://127.0.0.1:27017/peertest_hub
```

### 2.4 Seed Database

```bash
# Run seed script (backend venv active)
cd backend && source venv/bin/activate
python scripts/seed_database.py

# Or inspect via mongosh
mongosh mongodb://127.0.0.1:27017/peertest_hub
db.ai_test_templates.find()
```

---

## 3. Production Deployment

### 3.1 Server Requirements

**Minimum Specifications:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 50GB SSD
- OS: Ubuntu 22.04 LTS
- Network: Public IP with ports 80, 443 open

**Recommended Providers:**
- DigitalOcean Droplet ($24/month)
- AWS EC2 t3.medium
- Linode Shared CPU
- Hetzner Cloud CX21

### 3.2 Initial Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install runtimes and services
apt install -y nginx nodejs npm python3 python3-venv python3-pip mongodb redis

# Install pm2 globally
npm install -g pm2

# Enable native services
systemctl enable --now mongod
systemctl enable --now redis

# Create app user
adduser --disabled-password peertest
su - peertest
```

### 3.3 Production Environment Variables

Create a production `.env` (never commit it):

```bash
# .env.prod
SECRET_KEY=<generated>
MONGODB_URL=mongodb://127.0.0.1:27017/peertest_hub
REDIS_URL=redis://127.0.0.1:6379
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://peertest.io
ENVIRONMENT=production
```

### 3.4 Production Nginx Configuration

```nginx
# /etc/nginx/sites-available/peertest
events {
    worker_connections 2048;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Optimize
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name peertest.io www.peertest.io api.peertest.io;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # Main application (static frontend build)
    server {
        listen 443 ssl http2;
        server_name peertest.io www.peertest.io;

        # SSL
        ssl_certificate /etc/letsencrypt/live/peertest.io/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/peertest.io/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        root /var/www/peertest/frontend/dist;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }

    # API (proxied to the pm2-managed backend)
    server {
        listen 443 ssl http2;
        server_name api.peertest.io;

        # SSL
        ssl_certificate /etc/letsencrypt/live/api.peertest.io/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.peertest.io/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;

        # API rate limiting
        location / {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # CORS headers (if needed)
            add_header 'Access-Control-Allow-Origin' 'https://peertest.io' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        }

        # Stricter rate limit for auth endpoints
        location /api/v1/auth {
            limit_req zone=auth_limit burst=5 nodelay;
            proxy_pass http://127.0.0.1:8000;
        }

        # Webhooks (no rate limit)
        location /api/v1/webhooks {
            proxy_pass http://127.0.0.1:8000;
        }
    }
}
```

### 3.5 Deploy to Production

```bash
# Transfer code to the server
rsync -avz --exclude 'node_modules' --exclude '__pycache__' --exclude 'venv' \
  ./ peertest@your-server-ip:/var/www/peertest/

# On the server
cd /var/www/peertest

# Backend deps
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd ..

# Frontend build
cd frontend && npm ci && npm run build && cd ..

# Start (or reload) app processes with pm2
pm2 start ecosystem.config.js --env production
pm2 save

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Verify
curl https://api.peertest.io/health
```

Persist pm2 across reboots:

```bash
pm2 startup    # prints a command to run once (installs the systemd unit)
pm2 save       # snapshot the current process list
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install backend dependencies
      working-directory: ./backend
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-asyncio pytest-cov

    - name: Run backend tests
      working-directory: ./backend
      run: pytest tests/ --cov=app --cov-report=xml

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install frontend dependencies
      working-directory: ./frontend
      run: npm ci

    - name: Run frontend tests
      working-directory: ./frontend
      run: npm test

    - name: Build frontend
      working-directory: ./frontend
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest

    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/peertest
          git pull origin main
          cd backend && source venv/bin/activate && pip install -r requirements.txt && cd ..
          cd frontend && npm ci && npm run build && cd ..
          pm2 reload ecosystem.config.js --env production
          sudo nginx -t && sudo systemctl reload nginx
```

### 4.2 GitHub Secrets Configuration

Add these secrets in GitHub Repository Settings:

```
SERVER_HOST=your-server-ip
SERVER_USER=peertest
SSH_PRIVATE_KEY=<your-ssh-private-key>
```

---

## 5. SSL/HTTPS Setup

### 5.1 Obtain SSL Certificates

Use the system Certbot package with the nginx plugin:

```bash
# On server
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d peertest.io -d www.peertest.io -d api.peertest.io \
  --email your@email.com \
  --agree-tos
```

### 5.2 Auto-Renewal

The Certbot package installs a systemd timer that renews certificates automatically. Verify with:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 6. Monitoring & Logging

### 6.1 Log Management

```bash
# Application logs (pm2)
pm2 logs peertest-backend
pm2 logs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Rotate pm2 logs
pm2 install pm2-logrotate
```

### 6.2 Application Monitoring

```bash
# Real-time process metrics
pm2 monit
```

### 6.3 Uptime Monitoring

Use external services:
- UptimeRobot (free)
- Pingdom
- StatusCake

### 6.4 Error Tracking

Already configured with Sentry in application code.

---

## 7. Backup & Recovery

### 7.1 Database Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/home/peertest/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mongodb_backup_${DATE}.gz"

# Create backup against the native mongod
mongodump \
  --uri="mongodb://127.0.0.1:27017/peertest_hub" \
  --gzip \
  --archive=${BACKUP_DIR}/${BACKUP_FILE}

# Keep only last 7 days
find ${BACKUP_DIR} -name "mongodb_backup_*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### 7.2 Automated Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /var/www/peertest/scripts/backup.sh >> /home/peertest/logs/backup.log 2>&1
```

### 7.3 Restore from Backup

```bash
mongorestore \
  --uri="mongodb://127.0.0.1:27017" \
  --gzip \
  --archive=/home/peertest/backups/mongodb_backup_20240210_020000.gz
```

---

## 8. Maintenance

### 8.1 Update Application

```bash
cd /var/www/peertest
git pull origin main

cd backend && source venv/bin/activate && pip install -r requirements.txt && cd ..
cd frontend && npm ci && npm run build && cd ..

pm2 reload ecosystem.config.js --env production
```

### 8.2 Database Maintenance

```bash
# Compact a collection
mongosh mongodb://127.0.0.1:27017/peertest_hub \
  --eval "db.runCommand({ compact: 'users' })"

# Check indexes
mongosh mongodb://127.0.0.1:27017/peertest_hub \
  --eval "db.jobs.getIndexes()"
```

### 8.3 Clean Up Resources

```bash
# Flush pm2 logs
pm2 flush

# Remove old build artifacts
rm -rf frontend/dist && cd frontend && npm run build && cd ..
```

---

## 9. Troubleshooting

### 9.1 Common Issues

**Issue: Backend process won't start**
```bash
# Check logs
pm2 logs peertest-backend

# Check if port is in use
sudo lsof -i :8000

# Restart the process
pm2 restart peertest-backend
```

**Issue: Database connection failed**
```bash
# Check MongoDB is running
systemctl status mongod

# Test connection
mongosh mongodb://127.0.0.1:27017
```

**Issue: SSL certificate error**
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew
sudo systemctl reload nginx
```

**Issue: Out of disk space**
```bash
# Check disk usage
df -h

# Find large files
du -sh /var/www/peertest/*
pm2 flush
```

### 9.2 Performance Issues

```bash
# Check process resource usage
pm2 monit

# Check MongoDB performance
mongosh mongodb://127.0.0.1:27017/peertest_hub \
  --eval "db.currentOp()"

# Check slow queries
mongosh mongodb://127.0.0.1:27017/peertest_hub \
  --eval "db.system.profile.find().sort({ts:-1}).limit(5)"
```

---

## Security Checklist

- [ ] All secrets in environment variables
- [ ] Strong authentication for the database
- [ ] MongoDB bound to 127.0.0.1 only (not exposed publicly)
- [ ] HTTPS enabled with valid certificate
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] SSH key-based authentication only
- [ ] Regular security updates
- [ ] Database backups enabled
- [ ] Rate limiting on API
- [ ] CORS properly configured
- [ ] Security headers in nginx
- [ ] Error messages don't expose internals
- [ ] Monitoring and alerts set up

---

## Production Checklist

**Before Launch:**
- [ ] All tests passing
- [ ] Database indexed properly
- [ ] SSL certificate valid
- [ ] Environment variables set
- [ ] Backup system configured
- [ ] Monitoring enabled
- [ ] Error tracking (Sentry) configured
- [ ] Domain DNS configured
- [ ] Email service working
- [ ] Payment system tested
- [ ] Legal pages live (Terms, Privacy)

**After Launch:**
- [ ] Monitor logs first 24 hours
- [ ] Test all critical paths
- [ ] Verify backups working
- [ ] Check SSL auto-renewal
- [ ] Monitor error rates
- [ ] Track performance metrics

---

## Quick Reference Commands

```bash
# Start all app processes
pm2 start ecosystem.config.js --env production

# Stop all app processes
pm2 stop ecosystem.config.js

# View logs
pm2 logs [process]

# Reload (zero-downtime) after a deploy
pm2 reload ecosystem.config.js --env production

# Backup database
./scripts/backup.sh

# Check health
curl https://api.peertest.io/health

# View resource usage
pm2 monit
```

---

## Support & Resources

- **GitHub Issues**: https://github.com/Bialkowned/test_mkt/issues
- **pm2 Docs**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **MongoDB Docs**: https://www.mongodb.com/docs/
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/
- **Nginx Docs**: https://nginx.org/en/docs/

---

## Summary

This deployment guide covers everything needed to run PeerTest Hub in production on native services managed by pm2. Follow the steps carefully, test thoroughly, and monitor closely after deployment.

**Key Takeaways:**
1. Run app processes under pm2 against a native mongod on 127.0.0.1:27017
2. Automate with CI/CD
3. Monitor everything
4. Backup regularly
5. Keep security tight

Good luck with your deployment! 🚀
