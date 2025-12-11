# CI/CD Pipeline for Backend API Deployment on AWS EC2

## Complete Guide for Automated Node.js/Express Backend Deployment

This guide covers setting up automated deployment pipelines using GitHub Actions to deploy backend APIs (Node.js, Express, NestJS, etc.) to AWS EC2 instances with PM2 process management.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Secrets Setup](#github-secrets-setup)
4. [Understanding PM2](#understanding-pm2)
5. [Basic Backend Deployment Workflow](#basic-backend-deployment-workflow)
6. [Advanced Workflows](#advanced-workflows)
7. [Environment Variables & Configuration](#environment-variables--configuration)
8. [Database Migrations](#database-migrations)
9. [Health Checks & Monitoring](#health-checks--monitoring)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Overview

### Backend Deployment vs Frontend Deployment

| Aspect | Frontend | Backend API |
|--------|----------|-------------|
| **Build Output** | Static files (HTML, CSS, JS) | Live Node.js process |
| **Server** | Nginx serves files | PM2 manages Node process |
| **Restart Required?** | No (just replace files) | Yes (restart process) |
| **Zero Downtime** | Automatic | Needs PM2 clustering |
| **Port** | 80/443 (Nginx) | 3000, 5000, 8000, etc. |

### How Backend Deployment Works

```
Push Code → GitHub Actions → SSH to EC2 → Pull Code → Install Deps → Restart PM2 → API Live
```

### What is PM2?

**PM2** is a production process manager for Node.js applications that:
- ✅ Keeps your API running 24/7
- ✅ Auto-restarts on crashes
- ✅ Manages multiple processes
- ✅ Provides zero-downtime reloads
- ✅ Monitors CPU/memory usage
- ✅ Handles logs

---

## Prerequisites

### On Your EC2 Server

1. **Node.js installed** via NVM
2. **PM2 installed globally**: `sudo npm install -g pm2`
3. **Git repository cloned** on server
4. **Application tested manually** and working
5. **Environment variables configured** (`.env` file)
6. **PM2 startup configured**: `pm2 startup`

### Initial Manual Setup (First Time Only)

```bash
# SSH into your server
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to directory
cd ~/api

# Clone your repository
git clone <your-repo-url> my-backend-api
cd my-backend-api

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start index.js --name api

# Save PM2 process list
pm2 save

# Configure PM2 to start on system boot
pm2 startup
# Follow the instructions provided

# Check status
pm2 status
```

---

## GitHub Secrets Setup

### Step 1: Prepare Your SSH Key

```bash
# Display your private key
cat /path/to/your-key.pem

# Copy the entire output including BEGIN and END lines
```

### Step 2: Get Server Information

- EC2 Public IP (e.g., `54.123.45.67`)
- Your application port (e.g., `5000`)
- API URL for health checks

### Step 3: Add Secrets to GitHub

Go to **Repository → Settings → Secrets and variables → Actions**

| Secret Name | Value | Example |
|-------------|-------|---------|
| `DEV_SERVER_HOST` | EC2 Public IP | `54.123.45.67` |
| `DEV_SERVER_SSH_KEY` | SSH Private Key | `-----BEGIN RSA...` |
| `PROD_SERVER_HOST` | Production IP | `54.98.76.54` |
| `PROD_SERVER_SSH_KEY` | Production Key | `-----BEGIN RSA...` |
| `API_PORT` | Application Port | `5000` |
| `DATABASE_URL` | Database Connection | `mongodb://...` |
| `JWT_SECRET` | JWT Secret Key | `your-secret-key` |

---

## Understanding PM2

### PM2 Basic Commands

```bash
# Start application
pm2 start app.js --name my-api

# Start with ecosystem file
pm2 start ecosystem.config.js

# List all processes
pm2 list

# Restart application
pm2 restart my-api

# Stop application
pm2 stop my-api

# Delete process
pm2 delete my-api

# View logs
pm2 logs my-api

# Monitor resources
pm2 monit

# Show process details
pm2 describe my-api

# Save process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### PM2 Ecosystem File

Create `ecosystem.config.js` in your project root:

```javascript
module.exports = {
  apps: [{
    name: 'api',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    instance_var: 'INSTANCE_ID'
  }]
}
```

---

## Basic Backend Deployment Workflow

### Minimal Backend Deployment

Create `.github/workflows/deploy-backend-dev.yml`:

```yaml
name: Deploy Backend to Dev

on:
  push:
    branches: [ dev ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DEV_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.DEV_SERVER_SSH_KEY }}
        port: 22
        script: |
          # Load NVM
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          # Navigate to project
          cd ~/api/my-backend-api
          
          # Pull latest code
          git pull origin dev
          
          # Install dependencies
          npm install
          
          # Restart PM2 process
          pm2 restart api
          
          echo "✅ Backend deployment completed!"
```

---

## Advanced Workflows

### 1. Optimized Backend Deployment (Your Workflow)

This is the **production-ready** workflow you're using:

```yaml
name: Deploy Backend to Dev

on:
  push:
    branches: [ dev ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DEV_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.DEV_SERVER_SSH_KEY }}
        port: 22
        script: |
          # Fix git ownership issue
          sudo chown -R ubuntu:ubuntu /home/ubuntu/api/nextdoor-backend
          git config --global --add safe.directory /home/ubuntu/api/nextdoor-backend
          
          # Load nvm and npm
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
          
          # Navigate to project directory
          cd ~/api/nextdoor-backend
          
          # Store the old package.json hash before pulling
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          
          # Pull latest changes
          git pull origin dev
          
          # Get the new package.json hash
          NEW_HASH=$(md5sum package.json)
          
          # Check if package.json changed
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            echo "📦 package.json changed - installing dependencies..."
            npm ci
          else
            echo "✅ package.json unchanged - skipping npm install"
          fi

          # Restart application with PM2
          pm2 restart api || pm2 start index.js --name api
          
          # Save PM2 process list
          pm2 save
          
          # Show PM2 status
          pm2 status
          
          echo "🚀 Dev Deployment Completed!"
```

**Key Features of This Workflow:**

✅ **Smart Dependency Installation** - Only runs `npm ci` when `package.json` changes  
✅ **Git Ownership Fix** - Handles permission issues automatically  
✅ **Fallback Start** - Uses `pm2 restart || pm2 start` for first-time deployments  
✅ **Process Persistence** - Saves PM2 list for server reboots  
✅ **Status Verification** - Shows PM2 status after deployment  

---

### 2. Zero-Downtime Deployment with PM2 Reload

```yaml
name: Deploy Backend with Zero Downtime

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to Production with Zero Downtime
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api
          
          # Backup current version
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          cp -r . ../backup_$TIMESTAMP
          
          # Git operations
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          # Install dependencies if needed
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci --production
          fi
          
          # Zero-downtime reload (keeps connections alive)
          pm2 reload api --update-env
          
          # Wait for application to be ready
          sleep 5
          
          # Verify the API is responding
          if curl -f http://localhost:5000/health; then
            echo "✅ API is healthy after deployment"
            # Clean old backups (keep last 5)
            cd ~/api
            ls -t backup_* | tail -n +6 | xargs rm -rf
          else
            echo "❌ API health check failed! Rolling back..."
            # Rollback
            cd ~/api
            rm -rf my-backend-api
            cp -r backup_$TIMESTAMP my-backend-api
            cd my-backend-api
            pm2 restart api
            exit 1
          fi
          
          pm2 save
          pm2 status
```

**PM2 Reload vs Restart:**
- **`pm2 restart`** - Stops then starts (brief downtime)
- **`pm2 reload`** - Zero-downtime (gradually replaces processes)

---

### 3. Multi-Environment Deployment

**Dev Environment** - `.github/workflows/deploy-backend-dev.yml`:
```yaml
name: Deploy Backend to Dev

on:
  push:
    branches: [ dev ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: development
    
    steps:
    - name: Deploy to Dev Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DEV_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.DEV_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api-dev
          
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin dev
          NEW_HASH=$(md5sum package.json)
          
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci
          fi
          
          pm2 restart api-dev || pm2 start index.js --name api-dev
          pm2 save
          
          echo "✅ Dev deployment completed!"
```

**Production Environment** - `.github/workflows/deploy-backend-prod.yml`:
```yaml
name: Deploy Backend to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    
    steps:
    - name: Deploy to Production Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api-prod
          
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci --production
          fi
          
          # Use reload for zero-downtime
          pm2 reload api-prod --update-env
          pm2 save
          
          # Health check
          sleep 5
          curl -f http://localhost:5000/health || exit 1
          
          echo "🚀 Production deployment completed!"
```

---

### 4. Deployment with Ecosystem File

```yaml
name: Deploy with PM2 Ecosystem

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api
          
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci --production
          fi
          
          # Use ecosystem file for deployment
          pm2 reload ecosystem.config.js --env production
          
          # Or start if not running
          pm2 startOrReload ecosystem.config.js --env production
          
          pm2 save
          pm2 status
```

---

### 5. Deployment with Database Migrations

```yaml
name: Deploy with Database Migration

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api
          
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci --production
          fi
          
          # Run database migrations
          echo "🗄️ Running database migrations..."
          npm run migrate:up
          
          # Or with Sequelize
          # npx sequelize-cli db:migrate
          
          # Or with TypeORM
          # npm run typeorm migration:run
          
          # Or with Prisma
          # npx prisma migrate deploy
          
          # Restart API
          pm2 restart api
          pm2 save
          
          echo "✅ Deployment with migrations completed!"
```

---

### 6. Deployment with Pre-deployment Tests

```yaml
name: Deploy with Tests

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint

  deploy:
    needs: test  # Only deploy if tests pass
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to Production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api
          
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci --production
          fi
          
          pm2 reload api --update-env
          pm2 save
```

---

### 7. Deployment with Slack Notifications

```yaml
name: Deploy with Notifications

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Notify deployment started
      uses: slackapi/slack-github-action@v1.24.0
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        payload: |
          {
            "text": "🚀 Backend deployment to Production started..."
          }
    
    - name: Deploy to Production
      id: deploy
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          cd ~/api/my-backend-api
          
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci --production
          fi
          
          pm2 reload api --update-env
          pm2 save
          pm2 status
    
    - name: Notify success
      if: success()
      uses: slackapi/slack-github-action@v1.24.0
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        payload: |
          {
            "text": "✅ Backend deployment successful!",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Deployment Successful* ✅\n*Branch:* main\n*Commit:* ${{ github.sha }}\n*API:* https://api.yourdomain.com"
                }
              }
            ]
          }
    
    - name: Notify failure
      if: failure()
      uses: slackapi/slack-github-action@v1.24.0
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        payload: |
          {
            "text": "❌ Backend deployment failed!",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Deployment Failed* ❌\n*Branch:* main\n*Commit:* ${{ github.sha }}\n*Check:* ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                }
              }
            ]
          }
```

---

## Environment Variables & Configuration

### Method 1: Update .env File via SSH

```yaml
script: |
  cd ~/api/my-backend-api
  
  # Create/update .env file
  cat > .env << EOF
  NODE_ENV=production
  PORT=5000
  DATABASE_URL=${{ secrets.DATABASE_URL }}
  JWT_SECRET=${{ secrets.JWT_SECRET }}
  API_KEY=${{ secrets.API_KEY }}
  EOF
  
  git pull origin main
  npm ci --production
  pm2 restart api
```

### Method 2: Use PM2 Ecosystem File with Environment

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './index.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Don't put secrets here - use .env file
    }
  }]
}
```

### Method 3: Pass Environment Variables to PM2

```bash
pm2 restart api --update-env \
  --env NODE_ENV=production \
  --env PORT=5000
```

### Best Practice: Use .env File (Not in Git)

```bash
# On your server, create .env file once manually
nano ~/api/my-backend-api/.env

# Add your secrets
NODE_ENV=production
PORT=5000
DATABASE_URL=mongodb://...
JWT_SECRET=your-secret-key

# In your code, use dotenv
require('dotenv').config();

const port = process.env.PORT || 3000;
```

---

## Database Migrations

### With Sequelize

```yaml
script: |
  cd ~/api/my-backend-api
  git pull origin main
  npm ci --production
  
  # Run migrations
  npx sequelize-cli db:migrate
  
  pm2 restart api
```

### With TypeORM

```yaml
script: |
  cd ~/api/my-backend-api
  git pull origin main
  npm ci --production
  
  # Run migrations
  npm run typeorm migration:run
  
  pm2 restart api
```

### With Prisma

```yaml
script: |
  cd ~/api/my-backend-api
  git pull origin main
  npm ci --production
  
  # Run migrations
  npx prisma migrate deploy
  
  # Generate Prisma Client
  npx prisma generate
  
  pm2 restart api
```

### With Knex

```yaml
script: |
  cd ~/api/my-backend-api
  git pull origin main
  npm ci --production
  
  # Run migrations
  npx knex migrate:latest
  
  pm2 restart api
```

---

## Health Checks & Monitoring

### Add Health Check Endpoint

```javascript
// In your Express app
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('./package.json').version
  });
});

// Advanced health check with database
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await database.ping();
    
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

### Health Check in Workflow

```yaml
script: |
  cd ~/api/my-backend-api
  git pull origin main
  npm ci --production
  pm2 reload api
  
  # Wait for API to start
  sleep 5
  
  # Health check
  MAX_RETRIES=5
  RETRY_COUNT=0
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:5000/health; then
      echo "✅ API is healthy!"
      break
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      echo "❌ Health check failed. Retry $RETRY_COUNT/$MAX_RETRIES"
      sleep 3
    fi
  done
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ API failed to start properly!"
    pm2 logs api --lines 50
    exit 1
  fi
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# CPU and memory usage
pm2 list

# Detailed metrics
pm2 describe api

# View logs in real-time
pm2 logs api

# View last 100 lines
pm2 logs api --lines 100

# View error logs only
pm2 logs api --err
```

---

## Troubleshooting

### Issue: PM2 Process Not Found

**Symptom:**
```
[PM2] Process api not found
```

**Cause:** Process was deleted or never started

**Solution:**
```yaml
# Use fallback start
pm2 restart api || pm2 start index.js --name api

# Or check and start
pm2 list | grep api || pm2 start index.js --name api
```

---

### Issue: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Cause:** Old process still running

**Solution:**
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or restart PM2
pm2 restart api
```

---

### Issue: PM2 Not Starting After Server Reboot

**Symptom:** API down after server restart

**Solution:**
```bash
# Configure PM2 startup
pm2 startup

# Save current process list
pm2 save

# Test by rebooting
sudo reboot

# After reboot, check
pm2 list
```

---

### Issue: Environment Variables Not Loaded

**Symptom:** `process.env.VARIABLE` is undefined

**Solution:**
```bash
# Check .env file exists
ls -la ~/api/my-backend-api/.env

# Restart with --update-env flag
pm2 restart api --update-env

# Or use ecosystem file
pm2 startOrReload ecosystem.config.js --env production
```

---

### Issue: High Memory Usage

**Symptom:** API consuming too much memory

**Solution:**
```javascript
// Add to ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './index.js',
    max_memory_restart: '500M',  // Restart if exceeds 500MB
    instances: 1,
    exec_mode: 'fork'
  }]
}
```

---

### Issue: Deployment Succeeds But API Returns 502

**Cause:** API failed to start properly

**Solution:**
```yaml
script: |
  cd ~/api/my-backend-api
  git pull origin main
  npm ci --production
  pm2 restart api
  
  # Check if process is running
  sleep 3
  if ! pm2 list | grep -q "online.*api"; then
    echo "❌ API failed to start!"
    pm2 logs api --lines 50
    exit 1
  fi
  
  # Verify API responds
  if ! curl -f http://localhost:5000/health; then
    echo "❌ API not responding!"
    pm2 logs api --lines 50
    exit 1
  fi
```

---

### Issue: Git Pull Fails with "dirty working tree"

**Symptom:**
```
error: Your local changes to the following files would be overwritten
```

**Solution:**
```yaml
script: |
  cd ~/api/my-backend-api
  
  # Stash local changes
  git stash
  
  # Pull latest
  git pull origin main
  
  # Or force reset (be careful!)
  git fetch origin
  git reset --hard origin/main
```

---

## Best Practices

### 1. Use PM2 Ecosystem File

**Benefits:**
- Version-controlled configuration
- Environment-specific settings
- Easier to manage multiple apps

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api-prod',
    script: './index.js',
    instances: 2,  // Use cluster mode
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

---

### 2. Implement Graceful Shutdown

```javascript
// In your Express app
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  
  // Close database connections
  await database.close();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});
```

---

### 3. Use npm ci Instead of npm install

```bash
# ✅ Good - Faster, more reliable
npm ci --production

# ❌ Avoid - Slower, can cause issues
npm install --production
```

---

### 4. Always Run Health Checks After Deployment

```yaml
script: |
  pm2 reload api --update-env
  sleep 5
  curl -f http://localhost:5000/health || exit 1
```

---

### 5. Keep PM2 Logs Under Control

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

### 6. Use PM2 Cluster Mode for Production

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './index.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G'
  }]
}
```

```bash
# Start in cluster mode
pm2 start ecosystem.config.js

# Or specify instances
pm2 start index.js -i 2  # 2 instances
pm2 start index.js -i max  # All CPU cores
```

---

### 7. Monitor PM2 Processes

```bash
# Setup PM2 monitoring (optional)
pm2 install pm2-server-monit

# Or use PM2 Plus (cloud monitoring)
pm2 link <secret> <public>
```

---

### 8. Create Deployment Checklist

Before going live, ensure:
- [ ] Health check endpoint implemented
- [ ] PM2 configured with ecosystem file
- [ ] PM2 startup configured (`pm2 startup`)
- [ ] Environment variables secured in `.env`
- [ ] Database migrations tested
- [ ] Error logging implemented
- [ ] Nginx configured for API proxy
- [ ] SSL certificate installed
- [ ] Firewall rules configured
- [ ] Backup strategy in place

---

## Complete Production-Ready Workflow

```yaml
name: Deploy Backend API to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  APP_NAME: 'api'
  APP_DIR: '/home/ubuntu/api/my-backend-api'
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: 🚀 Deploy to Production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        command_timeout: 10m
        script: |
          set -e  # Exit on error
          
          echo "🚀 Starting deployment..."
          echo "📅 Date: $(date)"
          echo "👤 User: $(whoami)"
          
          # Load NVM
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          echo "📦 Node version: $(node --version)"
          
          # Navigate to app
          cd ${{ env.APP_DIR }}
          
          # Fix git ownership
          sudo chown -R ubuntu:ubuntu ${{ env.APP_DIR }}
          git config --global --add safe.directory ${{ env.APP_DIR }}
          
          # Check for changes
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          
          echo "📥 Pulling latest code..."
          git pull origin main
          
          NEW_HASH=$(md5sum package.json)
          
          # Install dependencies if needed
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            echo "📦 Dependencies changed - installing..."
            npm ci --production
          else
            echo "✅ Dependencies unchanged"
          fi
          
          # Run database migrations (if applicable)
          # echo "🗄️ Running migrations..."
          # npm run migrate
          
          # Zero-downtime reload
          echo "♻️ Reloading application..."
          pm2 reload ${{ env.APP_NAME }} --update-env || pm2 start ecosystem.config.js --env production
          
          # Save PM2 list
          pm2 save
          
          # Wait for app to start
          echo "⏳ Waiting for application to start..."
          sleep 5
          
          # Health check
          echo "🏥 Running health check..."
          MAX_RETRIES=5
          RETRY_COUNT=0
          
          while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if curl -f http://localhost:5000/health; then
              echo "✅ API is healthy!"
              break
            else
              RETRY_COUNT=$((RETRY_COUNT + 1))
              echo "⚠️ Health check failed. Retry $RETRY_COUNT/$MAX_RETRIES"
              sleep 3
            fi
          done
          
          if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "❌ API failed health check!"
            pm2 logs ${{ env.APP_NAME }} --lines 50 --nostream
            exit 1
          fi
          
          # Show status
          pm2 status
          
          echo "🎉 Deployment completed successfully!"
          echo "📊 API Status:"
          curl -s http://localhost:5000/health | jq '.'
    
    - name: 📢 Notify Success
      if: success()
      run: echo "✅ Deployment successful!"
    
    - name: 📢 Notify Failure
      if: failure()
      run: echo "❌ Deployment failed!"
```

---

## Quick Start Checklist

### Initial Setup (One Time)
- [ ] SSH into your EC2 server
- [ ] Install Node.js via NVM
- [ ] Install PM2 globally: `sudo npm install -g pm2`
- [ ] Clone your repository
- [ ] Create `.env` file with secrets
- [ ] Test your API manually
- [ ] Start with PM2: `pm2 start index.js --name api`
- [ ] Save PM2 list: `pm2 save`
- [ ] Configure startup: `pm2 startup`

### GitHub Actions Setup
- [ ] Add SSH key to GitHub Secrets
- [ ] Add server IP to GitHub Secrets
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Push code to trigger deployment
- [ ] Monitor deployment in Actions tab
- [ ] Verify API is running: `curl http://your-api/health`

---

## Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **Express.js**: https://expressjs.com/

---

*Complete CI/CD Guide for Backend API Deployment - Updated December 2024*
