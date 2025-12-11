# AWS EC2 Deployment Guides

Complete step-by-step guides for deploying applications on AWS EC2 Ubuntu instances.

---

## 📚 Available Guides

### [🟢 Node.js Backend Deployment](./Node.md)
Complete guide for deploying Node.js/Express backend applications with PM2, Nginx reverse proxy, and SSL configuration.

**What's Covered:**
- EC2 instance setup and configuration
- Node.js and NVM installation
- PM2 process management
- Nginx reverse proxy configuration
- SSL/TLS with Let's Encrypt
- MongoDB installation and configuration
- Environment variables management
- Deployment workflows and updates
- Multiple backend applications on same server
- Security best practices
- Monitoring and logging

**Best For:**
- REST APIs
- Express.js applications
- Backend services
- Microservices
- Real-time applications with Socket.io

---

### [⚛️ React/Next.js Frontend Deployment](./React-Next.md)
Comprehensive guide for deploying React and Next.js frontend applications with Nginx serving static files.

**What's Covered:**
- EC2 instance setup and configuration
- Static file deployment with Nginx
- Next.js static export vs server mode
- Multiple deployment directory options (home vs /var/www)
- SSL/TLS with Let's Encrypt
- Client-side routing configuration
- Multiple frontend applications on same server
- Build optimization and caching
- Performance optimization
- Troubleshooting common issues

**Best For:**
- React applications (CRA, Vite)
- Next.js static sites
- Next.js with SSR/API routes
- Single Page Applications (SPAs)
- Progressive Web Apps (PWAs)

---

## 🚀 Quick Start

### Prerequisites
- AWS account with EC2 access
- Domain name (optional, can use EC2 IP)
- SSH client installed
- Git installed locally
- Basic command line knowledge

### Choose Your Guide

#### Deploying a Backend API?
→ Follow the [Node.js Deployment Guide](./Node.md)

#### Deploying a Frontend Application?
→ Follow the [React/Next.js Deployment Guide](./React-Next.md)

#### Full Stack Application?
→ Follow both guides:
1. Deploy backend using [Node.js Guide](./Node.md)
2. Deploy frontend using [React/Next.js Guide](./React-Next.md)
3. Configure CORS and API connections

---

## 🏗️ Common Architecture Patterns

### Pattern 1: Separate Backend and Frontend

```
EC2 Instance: 13.126.242.164

Backend (Node.js)
├── Domain: api.yourdomain.com
├── Port: 5000 (internal)
├── Nginx: Reverse proxy on port 80/443
└── PM2: Process management

Frontend (React/Next.js)
├── Domain: app.yourdomain.com
├── Port: 80/443 (Nginx serves static files)
└── Connects to: api.yourdomain.com
```

### Pattern 2: Multiple Applications on Same Server

```
EC2 Instance: 13.126.242.164

Application 1 (Admin Panel)
├── Domain: admin.yourdomain.com
├── Type: React (Vite)
└── Nginx: Serves /dist on port 80/443

Application 2 (Hospital Website)
├── Domain: hospital.yourdomain.com
├── Type: Next.js Static
└── Nginx: Serves /out on port 80/443

Application 3 (Booking API)
├── Domain: api.yourdomain.com
├── Type: Node.js/Express
└── Nginx: Reverse proxy to PM2 on port 5000

Application 4 (Mobile API)
├── Domain: mobile-api.yourdomain.com
├── Type: Node.js/Express
└── Nginx: Reverse proxy to PM2 on port 5001
```

### Pattern 3: Monorepo Deployment

```
Repository Structure:
my-fullstack-app/
├── backend/          → Follow Node.js Guide
│   ├── src/
│   ├── package.json
│   └── .env
└── frontend/         → Follow React/Next.js Guide
    ├── src/
    ├── package.json
    └── .env.production

Deployment:
├── Backend: PM2 runs Node.js server
└── Frontend: Nginx serves built static files
```

---

## 🔒 Security Checklist

Use this checklist regardless of which guide you follow:

- [ ] Configure AWS Security Groups properly
- [ ] Enable UFW firewall on EC2
- [ ] Setup SSH key-based authentication only
- [ ] Disable password authentication
- [ ] Install and configure Fail2Ban
- [ ] Setup SSL/TLS with Let's Encrypt
- [ ] Configure security headers in Nginx
- [ ] Use environment variables for secrets
- [ ] Keep system packages updated
- [ ] Implement rate limiting
- [ ] Setup automated backups
- [ ] Configure log rotation
- [ ] Use non-root user for deployments
- [ ] Disable unnecessary services

---

## 🌐 DNS Configuration Guide

To host multiple applications on one IP, configure DNS records:

### Example DNS Setup

```
Type    Host                Value               TTL
A       @                   13.126.242.164      3600
A       www                 13.126.242.164      3600
A       admin               13.126.242.164      3600
A       api                 13.126.242.164      3600
A       hospital            13.126.242.164      3600
A       booking             13.126.242.164      3600
```

All subdomains point to the **same IP**, and Nginx routes them based on the domain name.

---

## 📊 Comparison: Node.js vs React/Next.js Deployment

| Aspect | Node.js Backend | React/Next.js Frontend |
|--------|----------------|------------------------|
| **Server** | Node.js runtime required | No runtime needed (static files) |
| **Process Manager** | PM2 (required) | Not needed |
| **Nginx Role** | Reverse proxy | Direct file serving |
| **Port** | Custom (e.g., 5000) | 80/443 only |
| **Updates** | Rebuild + PM2 restart | Rebuild only (instant) |
| **Memory** | Runtime memory usage | No runtime memory |
| **Scaling** | PM2 cluster mode | CDN distribution |

---

## 🛠️ Useful Commands Reference

### System Management
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h

# Check memory usage
free -m

# Monitor system
htop
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (no downtime)
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### PM2 Commands (Backend)
```bash
# List all processes
pm2 list

# View logs
pm2 logs

# Restart app
pm2 restart app-name

# Monitor
pm2 monit

# Stop app
pm2 stop app-name
```

### Git Commands
```bash
# Pull latest changes
git pull origin main

# Check status
git status

# View commit history
git log --oneline -10
```

---

## 🔄 CI/CD Integration

Both guides support automated deployment with GitHub Actions. Example workflow:

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
    
    - name: Deploy Backend
      run: |
        # SSH and deploy backend
        # See Node.js guide for complete workflow
    
    - name: Deploy Frontend
      run: |
        # SSH and deploy frontend
        # See React/Next.js guide for complete workflow
```

---

## 📈 Monitoring and Maintenance

### Daily Tasks
- Check application logs
- Monitor disk space usage
- Review error logs

### Weekly Tasks
- System package updates
- Review PM2 process status
- Check SSL certificate expiry

### Monthly Tasks
- Review and rotate logs
- Update Node.js version if needed
- Security audit
- Performance optimization review

---

## 🆘 Troubleshooting

### Common Issues and Solutions

#### "502 Bad Gateway" (Backend)
```bash
# Check if PM2 process is running
pm2 list

# Check backend logs
pm2 logs

# Restart application
pm2 restart app-name
```

#### "404 Not Found" (Frontend)
```bash
# Check build folder exists
ls -la ~/my-app/dist  # or /out or /build

# Check Nginx configuration
sudo nginx -t

# Verify Nginx is serving correct directory
sudo nginx -T | grep root
```

#### "Connection Refused"
```bash
# Check if service is running
sudo systemctl status nginx
pm2 status

# Check firewall
sudo ufw status

# Check security group in AWS console
```

---

## 📝 Additional Resources

### Official Documentation
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Useful Tools
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [GTmetrix](https://gtmetrix.com/) - Performance testing
- [Cloudflare](https://www.cloudflare.com/) - CDN and DDoS protection
- [UptimeRobot](https://uptimerobot.com/) - Uptime monitoring

---

## 🤝 Contributing

Found an issue or want to improve these guides? Contributions are welcome!

---

## 📄 License

These guides are provided as-is for educational and reference purposes.

---

## ⭐ Quick Decision Tree

```
Do you need to deploy an application?
│
├─ YES → What type?
│   │
│   ├─ Backend API / Server
│   │   └─ Use Node.js Guide
│   │
│   ├─ Frontend Application
│   │   └─ Use React/Next.js Guide
│   │
│   └─ Full Stack (Both)
│       ├─ Deploy Backend first (Node.js Guide)
│       └─ Then deploy Frontend (React/Next.js Guide)
│
└─ NO → Bookmark for later! 🔖
```

---

## 📞 Support

If you encounter issues not covered in these guides:

1. Check the troubleshooting section in the respective guide
2. Review AWS EC2 console for security group and instance issues
3. Check application logs (`pm2 logs` or Nginx logs)
4. Verify DNS settings if using custom domains
5. Test with `curl` commands to isolate issues

---

## 🎯 Best Practices Summary

### Security First
- Always use SSL/TLS in production
- Never commit sensitive data to Git
- Use environment variables for configuration
- Keep systems updated

### Performance
- Enable Gzip compression
- Implement caching strategies
- Use CDN for static assets
- Optimize images and assets

### Reliability
- Setup automated backups
- Monitor application health
- Implement proper logging
- Use PM2 for Node.js processes

### Maintainability
- Document custom configurations
- Use version control
- Implement CI/CD pipelines
- Keep dependencies updated

---

**Ready to deploy? Choose your guide above and get started! 🚀**

---

*Last Updated: December 2025*
*Tested on: Ubuntu 22.04 LTS & 24.04 LTS*
