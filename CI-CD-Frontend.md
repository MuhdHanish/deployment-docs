# CI/CD Pipeline for Frontend Deployment on AWS EC2

## Complete Guide for Automated React/Next.js/Vite Deployment

This guide covers setting up automated deployment pipelines using GitHub Actions to deploy frontend applications to AWS EC2 instances.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Secrets Setup](#github-secrets-setup)
4. [Workflow File Structure](#workflow-file-structure)
5. [Basic Deployment Workflow](#basic-deployment-workflow)
6. [Advanced Workflows](#advanced-workflows)
7. [Optimization Techniques](#optimization-techniques)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

### What is CI/CD?

**Continuous Integration (CI)**: Automatically test and build code when changes are pushed
**Continuous Deployment (CD)**: Automatically deploy built code to servers

### Benefits

✅ **Automated Deployments** - No manual SSH required  
✅ **Consistency** - Same deployment process every time  
✅ **Speed** - Deploy in minutes, not hours  
✅ **Rollback** - Easy to revert to previous versions  
✅ **Testing** - Catch errors before production  

### How It Works

```
Push Code → GitHub Actions Triggered → SSH to EC2 → Pull Code → Build → Deploy
```

---

## Prerequisites

### On Your EC2 Server

1. **Application already deployed** using one of the manual methods
2. **SSH access** configured
3. **Git repository** cloned on server
4. **Node.js & npm** installed via NVM
5. **Nginx** configured and running

### On GitHub

1. **Repository** with your code
2. **GitHub Actions** enabled (enabled by default)
3. **Secrets** configured (we'll set this up)

---

## GitHub Secrets Setup

Secrets store sensitive information securely in GitHub.

### Step 1: Generate/Get Your SSH Private Key

Your SSH private key is the `.pem` file you use to connect to EC2.

```bash
# If you don't have the key content, display it:
cat /path/to/your-key.pem
```

Copy the entire output including:
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

### Step 2: Get Your EC2 Public IP

```bash
# From AWS Console, copy your EC2 instance's public IP
# Example: 54.123.45.67
```

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `DEV_SERVER_HOST` | EC2 Public IP | `54.123.45.67` |
| `DEV_SERVER_SSH_KEY` | SSH Private Key | `-----BEGIN RSA...` |
| `PROD_SERVER_HOST` | Production IP | `54.98.76.54` |
| `PROD_SERVER_SSH_KEY` | Production Key | `-----BEGIN RSA...` |

**Important:** 
- Secret names are case-sensitive
- Values are encrypted and hidden
- Never commit these to your repository

---

## Workflow File Structure

GitHub Actions workflows live in `.github/workflows/` directory in your repository.

### Directory Structure

```
your-repo/
├── .github/
│   └── workflows/
│       ├── deploy-dev.yml          # Dev deployment
│       ├── deploy-prod.yml         # Production deployment
│       └── deploy-staging.yml      # Staging deployment
├── src/
├── package.json
└── README.md
```

---

## Basic Deployment Workflow

### Workflow for React/Vite (Home Directory Deployment)

Create `.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to Dev Server

on:
  push:
    branches: [ dev ]  # Triggers on push to dev branch

jobs:
  deploy:
    runs-on: ubuntu-latest  # GitHub's virtual machine
    
    steps:
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DEV_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.DEV_SERVER_SSH_KEY }}
        port: 22
        script: |
          # Load NVM (Node Version Manager)
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          # Navigate to project
          cd ~/my-app
          
          # Pull latest code
          git pull origin dev
          
          # Install dependencies
          npm install
          
          # Build application
          npm run build
          
          # Fix permissions for Nginx
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app
          
          echo "Deployment completed!"
```

### Workflow Explanation

```yaml
on:
  push:
    branches: [ dev ]
```
**Trigger**: Runs when code is pushed to `dev` branch

```yaml
runs-on: ubuntu-latest
```
**Runner**: GitHub provides a fresh Ubuntu VM for each run

```yaml
uses: appleboy/ssh-action@master
```
**SSH Action**: Third-party action that handles SSH connections

```yaml
host: ${{ secrets.DEV_SERVER_HOST }}
key: ${{ secrets.DEV_SERVER_SSH_KEY }}
```
**Secrets**: Pulls values from GitHub Secrets (secure)

```yaml
script: |
  # Your deployment commands
```
**Commands**: Runs on your EC2 server via SSH

---

## Advanced Workflows

### 1. Optimized Workflow with Smart npm Install

Only installs dependencies when `package.json` changes:

```yaml
name: Deploy Admin Frontend to Dev

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
          # Fix git ownership (if needed)
          sudo chown -R ubuntu:ubuntu /home/ubuntu/my-app
          git config --global --add safe.directory /home/ubuntu/my-app
          
          # Load NVM
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          # Navigate to project
          cd ~/my-app
          
          # Store old package.json hash
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          
          # Pull latest changes
          git pull origin dev
          
          # Get new package.json hash
          NEW_HASH=$(md5sum package.json)
          
          # Only install if package.json changed
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            echo "📦 package.json changed - installing dependencies..."
            npm ci
          else
            echo "✅ package.json unchanged - skipping npm install"
          fi
          
          # Build the application
          npm run build
          
          # Fix permissions for Nginx
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app
          
          # Reload Nginx (optional, for static sites not needed)
          sudo systemctl reload nginx
          
          echo "🚀 Deployment Completed!"
```

**Benefits:**
- ⚡ **Faster**: Skips npm install when dependencies haven't changed
- 💾 **Efficient**: Uses `npm ci` for clean installs
- 🔒 **Safe**: Checks file hash before/after pull

---

### 2. Multi-Environment Deployment

Deploy to different environments based on branch:

**Dev Environment** - `.github/workflows/deploy-dev.yml`:
```yaml
name: Deploy to Dev

on:
  push:
    branches: [ dev ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: development  # GitHub environment
    
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
          
          cd ~/my-app-dev
          git pull origin dev
          npm ci
          npm run build
          
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app-dev
          
          echo "✅ Dev deployment completed!"
```

**Production Environment** - `.github/workflows/deploy-prod.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    
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
          
          cd ~/my-app-prod
          git pull origin main
          npm ci
          npm run build
          
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app-prod
          
          echo "🚀 Production deployment completed!"
```

---

### 3. Workflow with Build Artifacts

Upload build artifacts to GitHub for download:

```yaml
name: Deploy with Artifacts

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    # Step 1: Checkout code
    - name: Checkout repository
      uses: actions/checkout@v3
    
    # Step 2: Setup Node.js
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    # Step 3: Install and build locally
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    # Step 4: Upload build artifacts
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: dist/  # or build/ for CRA
        retention-days: 7
    
    # Step 5: Deploy to server
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
          
          cd ~/my-app
          git pull origin main
          npm ci
          npm run build
          
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app
```

---

### 4. Workflow with Next.js Server Mode (PM2)

For Next.js apps running with PM2:

```yaml
name: Deploy Next.js App

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
          # Load NVM
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          # Navigate to project
          cd ~/my-nextjs-app
          
          # Check package.json changes
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          # Conditional npm install
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            npm ci
          fi
          
          # Build Next.js
          npm run build
          
          # Restart PM2 process
          pm2 restart my-nextjs-app || pm2 start npm --name "my-nextjs-app" -- start
          
          # Save PM2 configuration
          pm2 save
          
          echo "✅ Next.js deployment completed!"
```

---

### 5. Workflow with Environment Variables

Deploy with different environment variables:

```yaml
name: Deploy with Environment Variables

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
          
          cd ~/my-app
          git pull origin main
          
          # Create/update .env.production
          cat > .env.production << EOF
          REACT_APP_API_URL=${{ secrets.API_URL }}
          REACT_APP_ENV=production
          REACT_APP_VERSION=$(git rev-parse --short HEAD)
          EOF
          
          npm ci
          npm run build
          
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app
          
          echo "✅ Deployment completed!"
```

**Add these secrets to GitHub:**
- `API_URL` - Your API endpoint
- Other environment-specific variables

---

### 6. Workflow with Slack Notifications

Get notified on Slack when deployment completes:

```yaml
name: Deploy with Notifications

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
          
          cd ~/my-app
          git pull origin main
          npm ci
          npm run build
          
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app
    
    # Notify on success
    - name: Slack Notification (Success)
      if: success()
      uses: slackapi/slack-github-action@v1.24.0
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        payload: |
          {
            "text": "✅ Deployment to Production Successful!",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Deployment Successful* 🚀\n*Branch:* main\n*Commit:* ${{ github.sha }}"
                }
              }
            ]
          }
    
    # Notify on failure
    - name: Slack Notification (Failure)
      if: failure()
      uses: slackapi/slack-github-action@v1.24.0
      with:
        webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        payload: |
          {
            "text": "❌ Deployment to Production Failed!",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Deployment Failed* ❌\n*Branch:* main\n*Commit:* ${{ github.sha }}"
                }
              }
            ]
          }
```

---

## Optimization Techniques

### 1. Smart Dependency Installation

```yaml
# Store old package.json hash
OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")

# Pull changes
git pull origin main

# Get new hash
NEW_HASH=$(md5sum package.json)

# Only install if changed
if [ "$OLD_HASH" != "$NEW_HASH" ]; then
  npm ci  # Use ci for faster, cleaner installs
else
  echo "Skipping npm install"
fi
```

**Benefits:**
- ⚡ Saves 30-60 seconds on average
- 💾 Reduces disk I/O
- 🔒 More reliable with `npm ci`

---

### 2. Caching npm Dependencies

```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v3
  
  - name: Setup Node.js with cache
    uses: actions/setup-node@v3
    with:
      node-version: '18'
      cache: 'npm'  # Automatically caches node_modules
  
  - name: Install dependencies
    run: npm ci
```

---

### 3. Parallel Deployments

Deploy to multiple servers simultaneously:

```yaml
name: Deploy to Multiple Servers

on:
  push:
    branches: [ main ]

jobs:
  deploy-server-1:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Server 1
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_1_HOST }}
          # ... deployment script
  
  deploy-server-2:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Server 2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_2_HOST }}
          # ... deployment script
```

Both jobs run in parallel!

---

### 4. Skip CI for Docs Changes

Don't trigger deployment for documentation changes:

```yaml
on:
  push:
    branches: [ main ]
    paths-ignore:
      - 'README.md'
      - 'docs/**'
      - '**.md'
```

---

### 5. Build Once, Deploy Many

Build on GitHub Actions, then deploy to multiple servers:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      # Upload build artifacts
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
  
  deploy-dev:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      
      # Deploy to dev server
      # (Copy dist/ to server via SCP or rsync)
  
  deploy-prod:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      
      # Deploy to prod server
```

---

## Troubleshooting

### Issue: "Permission denied (publickey)"

**Cause:** SSH key not set correctly

**Solution:**
```yaml
# Ensure your secret contains the FULL private key:
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----

# Including the BEGIN and END lines
```

---

### Issue: "git pull" fails with ownership error

**Cause:** Git directory owned by wrong user

**Solution:** Add to script:
```bash
sudo chown -R ubuntu:ubuntu /home/ubuntu/my-app
git config --global --add safe.directory /home/ubuntu/my-app
```

---

### Issue: NVM command not found

**Cause:** NVM not loaded in SSH session

**Solution:** Always load NVM:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
```

---

### Issue: Build succeeds but site shows old version

**Cause:** Browser cache or Nginx not updated

**Solution:**
```bash
# Clear build directory first
rm -rf dist/ # or build/
npm run build

# Or add cache-busting query params in your code
```

---

### Issue: Workflow hangs indefinitely

**Cause:** Script waiting for input or long-running command

**Solution:** Add timeout:
```yaml
steps:
  - name: Deploy to EC2
    timeout-minutes: 10  # Fail after 10 minutes
    uses: appleboy/ssh-action@master
    # ...
```

---

### Issue: 403 Forbidden after deployment

**Cause:** Permissions not set correctly

**Solution:** Add to script:
```bash
# For home directory deployment
chmod +x /home/ubuntu
chmod 755 /home/ubuntu/my-app
chmod 755 /home/ubuntu/my-app/dist
chmod -R 644 /home/ubuntu/my-app/dist/*
find /home/ubuntu/my-app/dist -type d -exec chmod 755 {} \;
```

---

## Best Practices

### 1. Use Different Branches for Different Environments

```
dev branch    → Deploy to Dev Server
staging branch → Deploy to Staging Server
main branch   → Deploy to Production Server
```

### 2. Always Use `npm ci` Instead of `npm install`

```bash
npm ci  # ✅ Faster, more reliable
npm install  # ❌ Slower, can cause version mismatches
```

### 3. Add Deployment Status Checks

```yaml
- name: Check if deployment was successful
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com)
    if [ $response -eq 200 ]; then
      echo "✅ Site is up and running!"
    else
      echo "❌ Site returned $response"
      exit 1
    fi
```

### 4. Use Environment Protection Rules

In GitHub Settings → Environments:
- Add **reviewers** for production deployments
- Set **wait timer** before deployment
- Add **branch protection** rules

### 5. Keep Secrets Secure

- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate SSH keys periodically
- ✅ Use different keys for dev/prod
- ❌ Never log secret values
- ❌ Never commit secrets to repository

### 6. Add Deployment Logs

```yaml
script: |
  echo "🚀 Starting deployment..."
  echo "📍 Server: $(hostname)"
  echo "📅 Date: $(date)"
  echo "👤 User: $(whoami)"
  echo "📂 Directory: $(pwd)"
  
  # ... deployment commands ...
  
  echo "✅ Deployment completed at $(date)"
```

### 7. Test Locally First

Before pushing:
```bash
# Test build locally
npm run build

# Test if files are created
ls -la dist/  # or build/

# Test if site works
npm run preview  # Vite
# or
npx serve -s build  # CRA
```

### 8. Monitor Deployment Times

```yaml
- name: Deploy to EC2
  id: deploy
  # ... deployment steps

- name: Log deployment time
  run: |
    echo "⏱️ Deployment took: ${{ steps.deploy.outcome }}"
```

---

## Complete Example: Production-Ready Workflow

```yaml
name: Production Deployment

on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Allow manual trigger

env:
  NODE_VERSION: '18'
  APP_NAME: 'my-app'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: 📦 Checkout code
      uses: actions/checkout@v3
    
    - name: 🚀 Deploy to Production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.PROD_SERVER_SSH_KEY }}
        port: 22
        command_timeout: 10m
        script: |
          set -e  # Exit on any error
          
          echo "🚀 Starting deployment for ${{ env.APP_NAME }}..."
          echo "📅 Date: $(date)"
          echo "👤 User: $(whoami)"
          
          # Load NVM
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          
          # Verify Node version
          echo "📦 Node version: $(node --version)"
          echo "📦 npm version: $(npm --version)"
          
          # Navigate to app
          cd ~/${{ env.APP_NAME }}
          
          # Git operations
          git config --global --add safe.directory /home/ubuntu/${{ env.APP_NAME }}
          
          echo "📥 Pulling latest changes..."
          OLD_HASH=$(md5sum package.json 2>/dev/null || echo "none")
          git pull origin main
          NEW_HASH=$(md5sum package.json)
          
          # Smart npm install
          if [ "$OLD_HASH" != "$NEW_HASH" ]; then
            echo "📦 package.json changed - installing dependencies..."
            npm ci --production=false
          else
            echo "✅ package.json unchanged - skipping install"
          fi
          
          # Build
          echo "🔨 Building application..."
          npm run build
          
          # Set permissions
          echo "🔒 Setting permissions..."
          chmod +x /home/ubuntu
          chmod 755 /home/ubuntu/${{ env.APP_NAME }}
          chmod 755 /home/ubuntu/${{ env.APP_NAME }}/dist
          chmod -R 644 /home/ubuntu/${{ env.APP_NAME }}/dist/*
          find /home/ubuntu/${{ env.APP_NAME }}/dist -type d -exec chmod 755 {} \;
          
          # Verify build
          if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
            echo "❌ Build failed - dist directory is empty!"
            exit 1
          fi
          
          echo "✅ Deployment completed successfully!"
          echo "📊 Build size: $(du -sh dist | cut -f1)"
    
    - name: 🔍 Health Check
      run: |
        sleep 5  # Wait for site to be ready
        response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com)
        if [ $response -eq 200 ]; then
          echo "✅ Site is healthy (HTTP $response)"
        else
          echo "⚠️ Site returned HTTP $response"
        fi
    
    - name: 📢 Notify Success
      if: success()
      run: |
        echo "🎉 Deployment successful!"
        echo "🔗 Site: https://yourdomain.com"
        echo "⏱️ Completed at: $(date)"
```

---

## Quick Start Checklist

- [ ] Add SSH key to GitHub Secrets (`DEV_SERVER_SSH_KEY`)
- [ ] Add server IP to GitHub Secrets (`DEV_SERVER_HOST`)
- [ ] Create `.github/workflows/` directory in your repo
- [ ] Create `deploy-dev.yml` workflow file
- [ ] Push code to trigger first deployment
- [ ] Check Actions tab in GitHub to monitor progress
- [ ] Verify deployment on your server
- [ ] Test the live site

---

## Common Workflow Templates

### Minimal Template (Quick Setup)

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ubuntu
        key: ${{ secrets.SSH_KEY }}
        script: |
          export NVM_DIR="$HOME/.nvm"
          [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
          cd ~/my-app
          git pull
          npm ci
          npm run build
          chmod +x /home/ubuntu
          chmod -R 755 ~/my-app
```

---

## Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **SSH Action**: https://github.com/appleboy/ssh-action
- **Workflow Syntax**: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- **Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

*Complete CI/CD Guide for Frontend Deployment - Updated December 2024*
