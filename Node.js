# Deploying Node.js Application on AWS EC2 Ubuntu Instance

## Complete Step-by-Step Guide

This comprehensive guide covers the complete process of deploying a Node.js application on an AWS EC2 Ubuntu instance, including server configuration, application deployment, process management, and production-ready web server setup with Nginx.

---

## Step 1: Launch an EC2 Instance

### 1.1 AWS Console Setup

- Log in to your AWS Management Console and navigate to the EC2 dashboard
- Click on 'Launch Instance' to start the instance creation process

### 1.2 Instance Configuration

- **AMI Selection**: Select Ubuntu Server AMI (recommended: Ubuntu Server 22.04 LTS or 24.04 LTS)
- **Instance Type**: Choose an appropriate instance type
  - `t2.micro` for testing/development
  - `t2.small` or larger for production
- **Configure Instance**: Set instance details according to your requirements
- **Storage**: Add storage (minimum 8GB, 20GB+ recommended for production)

### 1.3 Security Group Configuration

Configure inbound rules to allow:

- **Port 22 (SSH)** - For server access
- **Port 80 (HTTP)** - For web traffic
- **Port 443 (HTTPS)** - For secure web traffic
- **Port 3000** (or your app port) - For direct application access (optional, can be restricted)

### 1.4 Key Pair

- Create a new key pair or select an existing one
- Download the `.pem` file and store it securely
- **Important**: This file is required for SSH access and cannot be recovered if lost

---

## Step 2: Connect to the EC2 Instance

### 2.1 Configure SSH Key Permissions

Open your terminal and set the correct permissions for your `.pem` file:

```bash
chmod 400 /path/to/your-key.pem
```

### 2.2 Connect via SSH

```bash
ssh -i /path/to/your-key.pem ubuntu@<your-instance-public-ip>
```

Replace `<your-instance-public-ip>` with your EC2 instance's public IP address or DNS name.

---

## Step 3: Prepare the Server Environment

### 3.1 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 3.2 Install Node.js and npm (Method 1: Using NVM - Recommended)

NVM allows easy version management and switching between Node.js versions:

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

### 3.3 Install Node.js and npm (Method 2: Direct Installation)

```bash
sudo apt install nodejs npm -y
```

### 3.4 Install Git

```bash
sudo apt install git -y
```

---

## Step 4: Deploy Your Node.js Application

### 4.1 Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone <your-repository-url>

# Navigate to application directory
cd <your-application-directory>
```

### 4.2 Install Application Dependencies

```bash
npm install
```

### 4.3 Configure Environment Variables

Create a `.env` file with your application configuration:

```bash
nano .env
```

Add your environment variables (database URLs, API keys, ports, etc.)

---

## Step 5: Run the Application with PM2

PM2 is a production process manager for Node.js applications with built-in load balancing, monitoring, and automatic restarts.

### 5.1 Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 5.2 Start Your Application

```bash
pm2 start app.js --name "my-node-app"
```

### 5.3 Configure PM2 to Start on System Boot

```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by PM2 (usually requires running a command with sudo)
```

### 5.4 Useful PM2 Commands

```bash
# View all running processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart my-node-app

# Stop application
pm2 stop my-node-app

# Delete from PM2
pm2 delete my-node-app
```

---

## Step 6: Configure Nginx as Reverse Proxy

Nginx will act as a reverse proxy, forwarding requests from port 80/443 to your Node.js application running on port 3000 (or your configured port).

### 6.1 Install Nginx

```bash
sudo apt install nginx -y
```

### 6.2 Configure Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow Nginx HTTP
sudo ufw allow 'Nginx HTTP'

# Allow Nginx HTTPS
sudo ufw allow 'Nginx HTTPS'

# Check status
sudo ufw status
```

### 6.3 Create Nginx Configuration File

Create a new configuration file in the `sites-available` directory:

```bash
sudo nano /etc/nginx/sites-available/my-node-app
```

Add the following configuration (adjust as needed):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # Or use your EC2 public IP if no domain: server_name <EC2-PUBLIC-IP>;

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
}
```

**Important Configuration Notes:**

- Replace `your-domain.com` with your actual domain name, or use your EC2 public IP address
- Change port 3000 to your Node.js application's port if different
- The proxy headers ensure proper handling of client information and WebSocket connections

### 6.4 Enable the Configuration ⭐

Create a symbolic link from `sites-available` to `sites-enabled`:

```bash
sudo ln -s /etc/nginx/sites-available/my-node-app /etc/nginx/sites-enabled/
```

**This step is crucial** - it activates your configuration by linking it to the `sites-enabled` directory, which Nginx reads during startup.

### 6.5 Remove Default Nginx Configuration (Optional)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 6.6 Test Nginx Configuration

```bash
sudo nginx -t
```

You should see a message confirming the configuration is valid:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6.7 Restart Nginx

```bash
sudo systemctl restart nginx
```

### 6.8 Check Nginx Status

```bash
sudo systemctl status nginx
```

---

## Step 7: Configure SSL with Let's Encrypt (Optional but Recommended)

**Note:** This step requires a domain name pointed to your EC2 instance.

### 7.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts to complete SSL setup. Certbot will automatically configure your Nginx files.

### 7.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 8: Access Your Application

Your Node.js application is now deployed and accessible:

- **Without Nginx**: `http://<EC2-PUBLIC-IP>:3000`
- **With Nginx (HTTP)**: `http://<EC2-PUBLIC-IP>` or `http://your-domain.com`
- **With Nginx and SSL (HTTPS)**: `https://your-domain.com`

---

## Additional Tips and Best Practices

### 1. Monitoring and Logs

```bash
# View PM2 logs
pm2 logs my-node-app

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 2. Updating Your Application

```bash
# Navigate to app directory
cd ~/your-application-directory

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart the application
pm2 restart my-node-app
```

### 3. Security Recommendations

- Keep your system updated regularly: `sudo apt update && sudo apt upgrade`
- Use environment variables for sensitive information (`.env` file)
- Configure fail2ban to prevent brute-force attacks
- Use SSH keys instead of passwords
- Implement rate limiting in your application
- Set up regular backups of your application and data

### 4. Performance Optimization

- Enable gzip compression in Nginx
- Configure PM2 cluster mode for multi-core utilization
- Implement caching strategies
- Use a CDN for static assets

### 5. Troubleshooting Common Issues

**Application not starting:**
- Check PM2 logs: `pm2 logs my-node-app`
- Verify environment variables are set correctly

**502 Bad Gateway:**
- Ensure your Node.js application is running (`pm2 list`)
- Check if the port in Nginx config matches your app's port
- Review Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

**Can't connect to instance:**
- Verify security group rules allow traffic on required ports
- Check if the instance is running in AWS console
- Verify you're using the correct public IP or DNS

---

## Understanding sites-available vs sites-enabled

### What are these directories?

**`/etc/nginx/sites-available/`**
- Contains configuration files for all your sites/applications
- Files here are NOT active until they're linked to `sites-enabled`
- Think of this as your "configuration repository"

**`/etc/nginx/sites-enabled/`**
- Contains symbolic links to configuration files in `sites-available`
- Only configurations linked here are actually used by Nginx
- This allows you to easily enable/disable sites without deleting configurations

### Why use symbolic links?

The symbolic link approach provides several benefits:

1. **Easy enable/disable**: You can disable a site by removing the symlink without deleting the configuration
2. **Clean organization**: Keep all configurations in one place (`sites-available`)
3. **Quick rollback**: Easy to revert changes by switching symlinks
4. **Multiple environments**: Maintain different configs and switch between them

### Common Commands

```bash
# Enable a site (create symlink)
sudo ln -s /etc/nginx/sites-available/my-site /etc/nginx/sites-enabled/

# Disable a site (remove symlink)
sudo rm /etc/nginx/sites-enabled/my-site

# List enabled sites
ls -la /etc/nginx/sites-enabled/

# Test configuration before restart
sudo nginx -t

# Reload Nginx after changes
sudo systemctl reload nginx
```

---

## Conclusion

You have successfully deployed a Node.js application on AWS EC2 with Nginx as a reverse proxy. Your application is now production-ready with proper process management, monitoring capabilities, and web server configuration. Remember to regularly update your system, monitor logs, and implement security best practices to maintain a secure and efficient deployment.

### For Additional Help and Resources:

- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt Documentation**: https://letsencrypt.org/docs/

---

*Document created for AWS EC2 Node.js deployment reference*
