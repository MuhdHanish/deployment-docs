# Deploying React/Next.js Application on AWS EC2 Ubuntu Instance

## Complete Step-by-Step Guide

This comprehensive guide covers the complete process of deploying React and Next.js applications on an AWS EC2 Ubuntu instance, including server configuration, application build, and production-ready web server setup with Nginx serving static files.

---

## Overview: React vs Next.js Deployment

### React (Create React App / Vite)
- **Build Output**: Static files (HTML, CSS, JS)
- **Deployment**: Nginx serves the `build` or `dist` folder directly
- **No Server Required**: Pure frontend application

### Next.js
- **Build Output**: Can be static or dynamic
- **Two Deployment Options**:
  1. **Static Export**: Nginx serves static files (like React)
  2. **Node.js Server**: Nginx proxies to Next.js server (for SSR/API routes)

---

## Step 1: Launch an EC2 Instance

### 1.1 AWS Console Setup

- Log in to your AWS Management Console and navigate to the EC2 dashboard
- Click on 'Launch Instance' to start the instance creation process

### 1.2 Instance Configuration

- **AMI Selection**: Select Ubuntu Server AMI (recommended: Ubuntu Server 22.04 LTS or 24.04 LTS)
- **Instance Type**: Choose an appropriate instance type
  - `t2.micro` for testing/small apps
  - `t2.small` or `t2.medium` for production
- **Configure Instance**: Set instance details according to your requirements
- **Storage**: Add storage (minimum 8GB, 20GB+ recommended for production)

### 1.3 Security Group Configuration

Configure inbound rules to allow:

- **Port 22 (SSH)** - For server access
- **Port 80 (HTTP)** - For web traffic
- **Port 443 (HTTPS)** - For secure web traffic
- **Port 3000** (Optional) - For Next.js server mode

### 1.4 Key Pair

- Create a new key pair or select an existing one
- Download the `.pem` file and store it securely
- **Important**: This file is required for SSH access and cannot be recovered if lost

---

## Step 2: Connect to the EC2 Instance

### 2.1 Configure SSH Key Permissions

```bash
chmod 400 /path/to/your-key.pem
```

### 2.2 Connect via SSH

```bash
ssh -i /path/to/your-key.pem ubuntu@<your-instance-public-ip>
```

---

## Step 3: Prepare the Server Environment

### 3.1 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 3.2 Install Node.js and npm (Using NVM - Recommended)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# Load NVM
source ~/.bashrc

# Install latest Node.js LTS version
nvm install --lts

# Use the installed version
nvm use --lts

# Verify installation
node --version
npm --version
```

### 3.3 Install Git

```bash
sudo apt install git -y
```

### 3.4 Install Nginx

```bash
sudo apt install nginx -y
```

### 3.5 Choose Your Deployment Directory

You have two options for where to place your application:

**Option A: /var/www (Traditional Web Server Directory)**
```bash
# Create directory
sudo mkdir -p /var/www

# Change ownership to ubuntu user
sudo chown -R $USER:$USER /var/www

# Set proper permissions
sudo chmod -R 755 /var/www
```

**Option B: Home Directory (Simpler, User-Owned)**
```bash
# Applications will be in /home/ubuntu
# No need to create additional directories
# Just ensure proper permissions (covered in Step 4.5)
```

---

## Step 4: Deploy Your Application

### 4.1 Clone Your Repository

**For /var/www deployment:**
```bash
# Navigate to web directory
cd /var/www

# Clone your repository
git clone <your-repository-url> my-app

# Navigate to application directory
cd my-app
```

**For home directory deployment:**
```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone <your-repository-url> my-app

# Navigate to application directory
cd my-app
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Configure Environment Variables

Create a `.env.production` file:

```bash
nano .env.production
```

Add your production environment variables:

```env
# React
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production

# Next.js
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 4.4 Build Your Application

**Option A: React Application (CRA, Vite, etc.)**

```bash
# Create React App
npm run build

# Vite
npm run build

# Build output will be in 'build' or 'dist' folder
```

**Option B: Next.js Static Export**

```bash
# Add to next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig

# Build the application
npm run build

# Output will be in 'out' folder
```

**Option C: Next.js with Server (SSR/API Routes)**

```bash
# Build the application
npm run build

# Test locally
npm start
```

### 4.5 Set Proper Permissions (For Home Directory Deployment)

If you're deploying from your home directory, you need to set proper permissions:

```bash
# Give execute permission to home directory (allows Nginx to access subdirectories)
chmod +x /home/ubuntu

# Set read and execute permissions for the application directory
chmod -R 755 ~/my-app
```

**Important Notes:**
- `chmod +x /home/ubuntu` - Allows Nginx (www-data user) to traverse through your home directory
- `chmod -R 755 ~/my-app` - Gives read and execute permissions to everyone for your app files
- Without these permissions, you'll get **403 Forbidden** errors

---

## Step 5: Configure Nginx

You have two deployment approaches based on where your application is located.

---

## Step 6: Nginx Configuration - Method 1: /var/www Deployment

This is for React apps and Next.js static exports deployed in `/var/www`.

### 6.1 Create Nginx Configuration File

```bash
sudo nano /etc/nginx/sites-available/my-app
```

### 6.2 Configuration for React (Create React App) - /var/www

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;
    # Or use EC2 IP: server_name <EC2-PUBLIC-IP>;

    root /var/www/my-app/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

### 6.3 Configuration for React (Vite) - /var/www

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/my-app/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. {
        deny all;
    }
}
```

### 6.4 Configuration for Next.js Static Export - /var/www

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/my-app/out;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }

    # Cache static assets
    location /_next/static/ {
        alias /var/www/my-app/out/_next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. {
        deny all;
    }
}
```

---

## Step 7: Nginx Configuration - Method 2: Home Directory Deployment

This method is **simpler** and serves directly from your home directory without moving files to `/var/www`.

### 7.1 Create Nginx Configuration File

```bash
sudo nano /etc/nginx/sites-available/my-app
```

### 7.2 Configuration for React (Create React App) - Home Directory

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;
    # Or use EC2 IP: server_name <EC2-PUBLIC-IP>;

    root /home/ubuntu/my-app/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

### 7.3 Configuration for React (Vite) - Home Directory

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;

    root /home/ubuntu/my-app/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. {
        deny all;
    }
}
```

### 7.4 Configuration for Next.js Static Export - Home Directory

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;

    root /home/ubuntu/my-app/out;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }

    # Cache static assets
    location /_next/static/ {
        alias /home/ubuntu/my-app/out/_next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\. {
        deny all;
    }
}
```

**Critical Permission Requirements for Home Directory Deployment:**

Before enabling the configuration, ensure permissions are set:

```bash
# Give execute permission to home directory
chmod +x /home/ubuntu

# Set read and execute permissions for the application
chmod -R 755 ~/my-app
```

**Why These Permissions Are Needed:**
- Nginx runs as the `www-data` user
- Without `+x` on `/home/ubuntu`, Nginx cannot traverse into subdirectories
- Without `755` on the app directory, Nginx cannot read your files
- This results in **403 Forbidden** errors if not set correctly

---

## Step 8: Nginx Configuration for Next.js Server Mode (Any Location)

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets from Next.js
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Important Notes:**

- **`root`**: Points to your build output directory
- **`index`**: Default file to serve (usually index.html)
- **`try_files`**: Handles client-side routing (SPA behavior)
- **`server_name`**: Your domain or EC2 IP address
- **`listen 80`**: HTTP port (443 for HTTPS with SSL)

---

## Step 9: Enable the Configuration ⭐

### 9.1 Create Symbolic Link

```bash
sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
```

**This step is crucial** - it activates your configuration by linking it to the `sites-enabled` directory.

### 9.2 Remove Default Configuration (Optional)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 9.3 Test Nginx Configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 9.4 Restart Nginx

```bash
sudo systemctl restart nginx
```

### 9.5 Enable Nginx to Start on Boot

```bash
sudo systemctl enable nginx
```

### 9.6 Check Nginx Status

```bash
sudo systemctl status nginx
```

---

## Step 10: Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow Nginx
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

---

## Step 11: Setup PM2 for Next.js Server Mode (If Using SSR)

If you're running Next.js in server mode, use PM2 to manage the process.

### 11.1 Install PM2

```bash
sudo npm install -g pm2
```

### 11.2 Start Next.js Application

**For /var/www deployment:**
```bash
cd /var/www/my-app
pm2 start npm --name "my-next-app" -- start
```

**For home directory deployment:**
```bash
cd ~/my-app
pm2 start npm --name "my-next-app" -- start
```

### 11.3 Configure PM2 Startup

```bash
pm2 save
pm2 startup
# Follow the instructions provided
```

### 11.4 Useful PM2 Commands

```bash
pm2 list          # List all processes
pm2 logs          # View logs
pm2 restart my-next-app
pm2 stop my-next-app
pm2 delete my-next-app
```

---

## Step 12: Configure SSL with Let's Encrypt

### 12.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 12.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 12.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

After SSL is configured, your Nginx config will be automatically updated to redirect HTTP to HTTPS.

---

## Step 13: Access Your Application

Your application is now accessible:

- **HTTP**: `http://yourdomain.com` or `http://<EC2-PUBLIC-IP>`
- **HTTPS**: `https://yourdomain.com` (after SSL setup)

---

## Deployment Workflows for Updates

### For Static Builds (React, Next.js Static Export)

**Method 1: /var/www deployment**
```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@<your-instance-public-ip>

# Navigate to app directory
cd /var/www/my-app

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Build the application
npm run build

# No need to restart anything - Nginx serves the new files immediately!
```

**Method 2: Home directory deployment**
```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@<your-instance-public-ip>

# Navigate to app directory
cd ~/my-app

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Build the application
npm run build

# Verify permissions (if needed)
chmod -R 755 ~/my-app

# No need to restart Nginx - it serves the new files immediately!
```

### For Next.js Server Mode

**Any location (/var/www or home directory):**
```bash
# SSH into server
ssh -i /path/to/your-key.pem ubuntu@<your-instance-public-ip>

# Navigate to app directory (adjust path accordingly)
cd ~/my-app  # or cd /var/www/my-app

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Build the application
npm run build

# Restart PM2 process
pm2 restart my-next-app
```

---

## Multiple Applications on Same Server

You can host multiple React/Next.js apps on the same EC2 instance using different domains or ports.

### Example: Multiple Apps with Different Domains

**App 1 Configuration** (`/etc/nginx/sites-available/app1`):

```nginx
server {
    listen 80;
    server_name app1.yourdomain.com;
    root /home/ubuntu/app1/build;  # or /var/www/app1/build
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

**App 2 Configuration** (`/etc/nginx/sites-available/app2`):

```nginx
server {
    listen 80;
    server_name app2.yourdomain.com;
    root /home/ubuntu/app2/dist;  # or /var/www/app2/dist
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

Enable both:

```bash
sudo ln -s /etc/nginx/sites-available/app1 /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app2 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**For home directory deployments, ensure permissions:**
```bash
chmod +x /home/ubuntu
chmod -R 755 ~/app1
chmod -R 755 ~/app2
```

### Example: Multiple Apps on Different Ports

You can also use different ports with the same domain:

```nginx
# App on port 80
server {
    listen 80;
    server_name yourdomain.com;
    root /home/ubuntu/app1/build;
    index index.html;
    location / {
        try_files $uri /index.html;
    }
}

# App on port 8080
server {
    listen 8080;
    server_name yourdomain.com;
    root /home/ubuntu/app2/build;
    index index.html;
    location / {
        try_files $uri /index.html;
    }
}
```

Don't forget to allow the port in security group and firewall:

```bash
sudo ufw allow 8080/tcp
```

---

## Understanding the Directory Structure

### Option 1: /var/www Deployment

```
/var/www/
├── my-app/                    # Your repository root
│   ├── src/                   # Source code
│   ├── public/                # Public assets
│   ├── build/                 # React build output (CRA)
│   ├── dist/                  # React build output (Vite)
│   ├── out/                   # Next.js static export output
│   ├── .next/                 # Next.js build cache
│   ├── package.json
│   └── node_modules/
```

**Important Paths:**
- **Nginx root**: Points to the build output folder (`/var/www/my-app/build`, `dist`, or `out`)
- **Application code**: Remains in `/var/www/my-app`
- **Git operations**: Performed in `/var/www/my-app`

### Option 2: Home Directory Deployment

```
/home/ubuntu/
├── my-app/                    # Your repository root
│   ├── src/                   # Source code
│   ├── public/                # Public assets
│   ├── build/                 # React build output (CRA)
│   ├── dist/                  # React build output (Vite)
│   ├── out/                   # Next.js static export output
│   ├── .next/                 # Next.js build cache
│   ├── package.json
│   └── node_modules/
```

**Important Paths:**
- **Nginx root**: Points to the build output folder (`/home/ubuntu/my-app/build`, `dist`, or `out`)
- **Application code**: Remains in `/home/ubuntu/my-app`
- **Git operations**: Performed in `/home/ubuntu/my-app`
- **Permissions**: Must set `chmod +x /home/ubuntu` and `chmod -R 755 ~/my-app`

---

## Comparison: /var/www vs Home Directory Deployment

| Aspect | /var/www | Home Directory |
|--------|----------|----------------|
| **Setup Complexity** | Requires creating directory & setting ownership | Works out of the box |
| **Permissions** | Standard web server permissions | Requires `chmod +x` on home directory |
| **Best Practice** | Traditional web server approach | Simpler for single-user deployments |
| **Security** | More isolated from user files | User's home directory is accessible |
| **Recommended For** | Production environments, multiple users | Development, single-user setups |
| **Management** | Requires sudo for some operations | Easier file management (no sudo) |

**When to Use Each:**

- **Use /var/www** for:
  - Production deployments
  - Multiple applications from different users
  - Following web server best practices
  - Better security isolation

- **Use Home Directory** for:
  - Quick setups and testing
  - Single-user applications
  - Easier development workflow
  - When you want simpler file management

---

## Understanding sites-available vs sites-enabled

### Directory Purpose

**`/etc/nginx/sites-available/`**
- Stores all your Nginx configuration files
- Files here are inactive until linked to `sites-enabled`
- Think of it as your configuration storage

**`/etc/nginx/sites-enabled/`**
- Contains symbolic links to configurations in `sites-available`
- Only linked configurations are used by Nginx
- Allows easy enable/disable without deleting configs

### Common Operations

```bash
# Enable a site
sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/

# Disable a site (remove symlink)
sudo rm /etc/nginx/sites-enabled/my-app

# List enabled sites
ls -la /etc/nginx/sites-enabled/

# Check which config is being used
sudo nginx -T

# Test configuration
sudo nginx -t

# Reload Nginx after changes
sudo systemctl reload nginx
```

---

## Monitoring and Logs

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Specific site logs (if configured)
sudo tail -f /var/log/nginx/my-app-access.log
```

### PM2 Logs (For Next.js Server Mode)

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs my-next-app

# Clear logs
pm2 flush
```

### Check Disk Space

```bash
df -h
```

---

## Troubleshooting

### Issue: 403 Forbidden

**Causes:**
- Wrong file permissions
- Nginx user doesn't have access to files
- Missing execute permission on parent directories (common with home directory deployment)

**Solutions:**

**For /var/www deployment:**
```bash
# Check permissions
ls -la /var/www/my-app/build

# Fix ownership
sudo chown -R www-data:www-data /var/www/my-app/build

# Fix permissions
sudo chmod -R 755 /var/www/my-app/build
```

**For home directory deployment:**
```bash
# Critical: Give execute permission to home directory
chmod +x /home/ubuntu

# Fix application permissions
chmod -R 755 ~/my-app

# Check if Nginx can access the directory
sudo -u www-data test -r /home/ubuntu/my-app/build && echo "Can read" || echo "Cannot read"
```

### Issue: 404 Not Found on Refresh

**Cause:** Client-side routing not configured

**Solution:** Add `try_files $uri /index.html;` in your Nginx location block

### Issue: Nginx fails to start

```bash
# Check syntax
sudo nginx -t

# Check if port is already in use
sudo netstat -tulpn | grep :80

# Check Nginx status
sudo systemctl status nginx

# View detailed errors
sudo journalctl -u nginx -n 50
```

### Issue: Changes not reflecting

```bash
# Clear browser cache
# Or hard refresh: Ctrl + Shift + R

# Check if build was updated
ls -lht ~/my-app/build  # or /var/www/my-app/build

# Verify Nginx is serving correct directory
sudo nginx -T | grep root

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: Out of disk space

```bash
# Check disk usage
df -h

# Find large files
du -h ~/my-app | sort -rh | head -20

# Clean npm cache
npm cache clean --force

# Remove old builds (be careful!)
rm -rf ~/my-app/node_modules
npm install
```

### Issue: Permission denied errors with home directory

```bash
# This is the most common issue with home directory deployments

# Check if home directory has execute permission
ls -ld /home/ubuntu

# Should show drwxr-xr-x (755) or drwx--x--x (711)
# If not, fix it:
chmod +x /home/ubuntu

# Check application directory permissions
ls -la ~/my-app

# Fix if needed
chmod -R 755 ~/my-app

# Verify Nginx can read the directory
sudo -u www-data ls /home/ubuntu/my-app/build
```

---

## Performance Optimization

### 1. Enable Gzip Compression

Already included in the configurations above. Verify it's working:

```bash
curl -H "Accept-Encoding: gzip" -I http://yourdomain.com
```

### 2. Browser Caching

Configure cache headers for static assets (already in configs):

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Use CDN

For static assets, consider using a CDN like:
- Cloudflare
- AWS CloudFront
- Vercel Edge Network

### 4. Optimize Images

```bash
# Install image optimization tools
sudo apt install imagemagick webp -y

# Convert images to WebP
for img in *.jpg; do
    cwebp -q 80 "$img" -o "${img%.jpg}.webp"
done
```

### 5. Monitor Performance

```bash
# Install htop for system monitoring
sudo apt install htop

# Run htop
htop
```

---

## Security Best Practices

### 1. Keep System Updated

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Configure Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 'Nginx Full'
```

### 3. Implement Rate Limiting in Nginx

Add to your server block:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;

server {
    location / {
        limit_req zone=mylimit burst=20;
        # ... rest of configuration
    }
}
```

### 4. Hide Nginx Version

Add to `/etc/nginx/nginx.conf`:

```nginx
http {
    server_tokens off;
    # ... rest of configuration
}
```

### 5. Setup Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 6. Restrict Home Directory Access (For Home Directory Deployment)

While we need to give execute permission to `/home/ubuntu` for Nginx to work, you can still restrict access to other directories:

```bash
# Only allow access to specific app directories
chmod 711 /home/ubuntu  # Others can execute but not read/list

# Keep other directories private
chmod 700 ~/private-folder
```

---

## Backup Strategy

### Automated Backup Script

Create `/home/ubuntu/backup.sh`:

```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
APP_DIR="/home/ubuntu/my-app"  # or /var/www/my-app

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/app-$DATE.tar.gz -C $APP_DIR .

# Keep only last 7 backups
ls -t $BACKUP_DIR/app-*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: app-$DATE.tar.gz"
```

Make it executable and schedule:

```bash
chmod +x /home/ubuntu/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/ubuntu/backup.sh
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to EC2
      env:
        PRIVATE_KEY: ${{ secrets.EC2_SSH_KEY }}
        HOST: ${{ secrets.EC2_HOST }}
        USER: ubuntu
      run: |
        echo "$PRIVATE_KEY" > private_key && chmod 600 private_key
        ssh -o StrictHostKeyChecking=no -i private_key ${USER}@${HOST} '
          cd ~/my-app &&
          git pull origin main &&
          npm install &&
          npm run build &&
          chmod -R 755 ~/my-app &&
          pm2 restart my-next-app || true
        '
```

---

## Quick Reference Commands

```bash
# Nginx
sudo nginx -t                    # Test configuration
sudo systemctl restart nginx     # Restart Nginx
sudo systemctl reload nginx      # Reload configuration
sudo systemctl status nginx      # Check status

# PM2 (for Next.js server)
pm2 list                        # List processes
pm2 restart all                 # Restart all apps
pm2 logs                        # View logs
pm2 monit                       # Monitor processes

# Git
git pull origin main            # Pull latest code
git status                      # Check status

# Build commands
npm run build                   # Build React/Next.js
npm install                     # Install dependencies

# File permissions (/var/www)
sudo chown -R $USER:$USER /var/www
sudo chmod -R 755 /var/www

# File permissions (home directory)
chmod +x /home/ubuntu           # Critical for Nginx access
chmod -R 755 ~/my-app           # Application permissions

# Disk space
df -h                          # Check disk usage
du -sh ~/*                     # Check directory sizes

# Test Nginx access to home directory
sudo -u www-data ls /home/ubuntu/my-app/build
```

---

## Conclusion

You have successfully deployed a React or Next.js application on AWS EC2 with Nginx. Your application is now production-ready with proper configuration, caching, security headers, and SSL support.

### Key Takeaways:

- ✅ **Two deployment methods**: `/var/www` (traditional) and home directory (simpler)
- ✅ **Home directory deployment** requires `chmod +x /home/ubuntu` and `chmod -R 755 ~/my-app`
- ✅ Nginx serves static files directly from the `build`/`dist`/`out` folder
- ✅ The `root` directive points to your build output
- ✅ `try_files` handles client-side routing for SPAs
- ✅ Symbolic links in `sites-enabled` activate your configuration
- ✅ SSL with Let's Encrypt provides HTTPS encryption
- ✅ PM2 manages Next.js server processes (when needed)

### Deployment Method Decision Guide:

**Choose /var/www when:**
- You want to follow traditional web server practices
- You have multiple users or applications
- You need better security isolation
- You're deploying to production

**Choose Home Directory when:**
- You want a simpler setup
- You're the only user on the server
- You want easier file management
- You're testing or in development

### Common Permission Issues:

**403 Forbidden with home directory?**
```bash
chmod +x /home/ubuntu
chmod -R 755 ~/my-app
```

**Can't read files?**
```bash
# Test access as www-data user
sudo -u www-data ls /home/ubuntu/my-app/build
```

### Resources:

- **React Documentation**: https://react.dev/
- **Next.js Documentation**: https://nextjs.org/docs
- **Nginx Documentation**: https://nginx.org/en/docs/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

---

*Document created for AWS EC2 React/Next.js deployment reference - Updated with home directory deployment method*
