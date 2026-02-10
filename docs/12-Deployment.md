# PeerTest Hub - Deployment & Docker Setup

## Overview

This document provides comprehensive deployment instructions for PeerTest Hub, including Docker containerization, local development setup, production deployment on a Linux server, CI/CD pipeline configuration, and monitoring/maintenance procedures.

**Deployment Targets:**
- Local Development (Docker Compose)
- Production (Linux VPS - DigitalOcean, AWS EC2, etc.)
- CI/CD (GitHub Actions)

---

## Table of Contents

1. [Docker Setup](#1-docker-setup)
2. [Local Development](#2-local-development)
3. [Production Deployment](#3-production-deployment)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [SSL/HTTPS Setup](#5-sslhttps-setup)
6. [Monitoring & Logging](#6-monitoring--logging)
7. [Backup & Recovery](#7-backup--recovery)
8. [Maintenance](#8-maintenance)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Docker Setup

### 1.1 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.2 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 1.3 Nginx Configuration

```nginx
# frontend/nginx.conf
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
        root /usr/share/nginx/html;
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

        # API proxy (for development)
        location /api {
            proxy_pass http://backend:8000;
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

### 1.4 Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:5.0
    container_name: peertest-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: peertest_hub
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./docker/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - peertest-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: peertest-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - peertest-network
    command: redis-server --appendonly yes

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: peertest-backend
    restart: unless-stopped
    environment:
      - MONGODB_URL=mongodb://root:password123@mongodb:27017/peertest_hub?authSource=admin
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - FRONTEND_URL=http://localhost:5173
      - ENVIRONMENT=development
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - /app/__pycache__
    depends_on:
      - mongodb
      - redis
    networks:
      - peertest-network
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: peertest-frontend
    restart: unless-stopped
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1
      - VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - peertest-network
    command: npm run dev

volumes:
  mongodb_data:
  redis_data:

networks:
  peertest-network:
    driver: bridge
```

### 1.5 Development Dockerfile for Frontend

```dockerfile
# frontend/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

### 1.6 MongoDB Initialization Script

```javascript
// docker/mongo-init.js
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
git clone https://github.com/yourusername/peertest-hub.git
cd peertest-hub

# Create .env file
cat > .env << EOL
SECRET_KEY=$(openssl rand -hex 32)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOL

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 2.2 Access Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: mongodb://root:password123@localhost:27017
- **Redis**: redis://localhost:6379

### 2.3 Development Commands

```bash
# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View logs for specific service
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend bash
docker-compose exec mongodb mongosh

# Reset everything (WARNING: deletes data)
docker-compose down -v
```

### 2.4 Seed Database

```bash
# Run seed script
docker-compose exec backend python scripts/seed_database.py

# Or manually via mongosh
docker-compose exec mongodb mongosh -u root -p password123 --authenticationDatabase admin
use peertest_hub
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

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Create app user
adduser --disabled-password peertest
usermod -aG docker peertest
su - peertest
```

### 3.3 Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:5.0
    container_name: peertest-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: peertest_hub
    volumes:
      - mongodb_data:/data/db
      - ./backups:/backups
    networks:
      - peertest-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Redis
  redis:
    image: redis:7-alpine
    container_name: peertest-redis
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - peertest-network
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: peertest-backend
    restart: always
    environment:
      - MONGODB_URL=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/peertest_hub?authSource=admin
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - FRONTEND_URL=https://peertest.io
      - ENVIRONMENT=production
    depends_on:
      - mongodb
      - redis
    networks:
      - peertest-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=https://api.peertest.io/api/v1
        - VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}
    container_name: peertest-frontend
    restart: always
    networks:
      - peertest-network

  # Nginx (Reverse Proxy)
  nginx:
    image: nginx:alpine
    container_name: peertest-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_data:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend
    networks:
      - peertest-network

  # Certbot (SSL Certificates)
  certbot:
    image: certbot/certbot
    container_name: peertest-certbot
    volumes:
      - certbot_data:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  mongodb_data:
  redis_data:
  certbot_data:
  certbot_conf:

networks:
  peertest-network:
    driver: bridge
```

### 3.4 Production Nginx Configuration

```nginx
# nginx/nginx.conf
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

    # Main application (Frontend)
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

        location / {
            proxy_pass http://frontend:80;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # API (Backend)
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
            
            proxy_pass http://backend:8000;
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
            proxy_pass http://backend:8000;
        }

        # Webhooks (no rate limit)
        location /api/v1/webhooks {
            proxy_pass http://backend:8000;
        }
    }
}
```

### 3.5 Deploy to Production

```bash
# On your local machine
# Build and push images (if using registry)
docker build -t yourusername/peertest-backend:latest ./backend
docker build -t yourusername/peertest-frontend:latest ./frontend
docker push yourusername/peertest-backend:latest
docker push yourusername/peertest-frontend:latest

# Or transfer files directly
rsync -avz --exclude 'node_modules' --exclude '__pycache__' \
  ./ peertest@your-server-ip:/home/peertest/app/

# On server
cd /home/peertest/app

# Create production .env
nano .env.prod
# Add all production environment variables

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Verify
curl https://api.peertest.io/health
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

env:
  REGISTRY: ghcr.io
  IMAGE_NAME_BACKEND: ${{ github.repository }}/backend
  IMAGE_NAME_FRONTEND: ${{ github.repository }}/frontend

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

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:${{ github.sha }}
    
    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}:latest
          ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /home/peertest/app
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
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

```bash
# On server
# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Get certificates
docker run -it --rm \
  -v $(pwd)/certbot_conf:/etc/letsencrypt \
  -v $(pwd)/certbot_data:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d peertest.io -d www.peertest.io -d api.peertest.io \
  --email your@email.com \
  --agree-tos

# Start nginx
docker-compose -f docker-compose.prod.yml start nginx
```

### 5.2 Auto-Renewal

Certbot container in docker-compose will auto-renew certificates every 12 hours.

---

## 6. Monitoring & Logging

### 6.1 Log Management

```bash
# View logs
docker-compose logs -f backend
docker-compose logs --tail=100 frontend

# Save logs to file
docker-compose logs > logs-$(date +%Y%m%d).txt

# Rotate logs automatically (configured in docker-compose)
```

### 6.2 Application Monitoring

**Install monitoring tools:**

```bash
# Prometheus + Grafana (optional advanced setup)
docker run -d --name=prometheus -p 9090:9090 prom/prometheus
docker run -d --name=grafana -p 3000:3000 grafana/grafana
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

# Create backup
docker exec peertest-mongodb mongodump \
  --username root \
  --password password123 \
  --authenticationDatabase admin \
  --db peertest_hub \
  --gzip \
  --archive=/backups/${BACKUP_FILE}

# Keep only last 7 days
find ${BACKUP_DIR} -name "mongodb_backup_*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

### 7.2 Automated Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /home/peertest/app/scripts/backup.sh >> /home/peertest/logs/backup.log 2>&1
```

### 7.3 Restore from Backup

```bash
# Restore specific backup
docker exec peertest-mongodb mongorestore \
  --username root \
  --password password123 \
  --authenticationDatabase admin \
  --gzip \
  --archive=/backups/mongodb_backup_20240210_020000.gz
```

---

## 8. Maintenance

### 8.1 Update Application

```bash
# Pull latest code
cd /home/peertest/app
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Or use CI/CD (push to main)
```

### 8.2 Database Maintenance

```bash
# Compact database
docker exec peertest-mongodb mongosh \
  -u root -p password123 --authenticationDatabase admin \
  --eval "db.runCommand({ compact: 'users' })"

# Check indexes
docker exec peertest-mongodb mongosh \
  -u root -p password123 --authenticationDatabase admin \
  peertest_hub --eval "db.jobs.getIndexes()"
```

### 8.3 Clean Up Docker Resources

```bash
# Remove unused images
docker image prune -a -f

# Remove stopped containers
docker container prune -f

# Remove unused volumes
docker volume prune -f

# Full cleanup
docker system prune -a -f
```

---

## 9. Troubleshooting

### 9.1 Common Issues

**Issue: Container won't start**
```bash
# Check logs
docker-compose logs backend

# Check if port is in use
sudo lsof -i :8000

# Restart container
docker-compose restart backend
```

**Issue: Database connection failed**
```bash
# Check MongoDB is running
docker ps | grep mongodb

# Test connection
docker exec peertest-mongodb mongosh \
  -u root -p password123 --authenticationDatabase admin

# Check network
docker network inspect peertest-network
```

**Issue: SSL certificate error**
```bash
# Check certificate expiry
docker run --rm -v $(pwd)/certbot_conf:/etc/letsencrypt \
  certbot/certbot certificates

# Renew manually
docker-compose run --rm certbot renew
docker-compose restart nginx
```

**Issue: Out of disk space**
```bash
# Check disk usage
df -h

# Find large files
du -sh /var/lib/docker/*
docker system df

# Clean up
docker system prune -a -f --volumes
```

### 9.2 Performance Issues

```bash
# Check resource usage
docker stats

# Check MongoDB performance
docker exec peertest-mongodb mongosh \
  -u root -p password123 --authenticationDatabase admin \
  --eval "db.currentOp()"

# Check slow queries
docker exec peertest-mongodb mongosh \
  -u root -p password123 --authenticationDatabase admin \
  --eval "db.system.profile.find().sort({ts:-1}).limit(5)"
```

---

## Security Checklist

- [ ] All secrets in environment variables
- [ ] Strong passwords for database
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
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Stop all services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Backup database
./scripts/backup.sh

# Check health
curl https://api.peertest.io/health

# View resource usage
docker stats

# Clean up
docker system prune -af
```

---

## Support & Resources

- **GitHub Issues**: https://github.com/yourusername/peertest-hub/issues
- **Documentation**: https://docs.peertest.io
- **Docker Docs**: https://docs.docker.com/
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/
- **Nginx Docs**: https://nginx.org/en/docs/

---

## Summary

This deployment guide covers everything needed to run PeerTest Hub in production. Follow the steps carefully, test thoroughly, and monitor closely after deployment.

**Key Takeaways:**
1. Use Docker for consistency
2. Automate with CI/CD
3. Monitor everything
4. Backup regularly
5. Keep security tight

Good luck with your deployment! 🚀

