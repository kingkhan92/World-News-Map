# Simple Deployment Quick Reference

## 🚀 One-Command Deployment

### Linux/Mac
```bash
git clone https://github.com/kingkhan92/interactive-world-news-map.git && cd interactive-world-news-map && chmod +x deploy-simple.sh && ./deploy-simple.sh
```

### Windows PowerShell
```powershell
git clone https://github.com/kingkhan92/interactive-world-news-map.git; cd interactive-world-news-map; .\deploy-simple.ps1
```

## 📋 What You Need

### Prerequisites
- ✅ Docker (20.10+)
- ✅ Docker Compose (2.0+)
- ✅ Git
- ✅ 4GB RAM
- ✅ Internet connection

### API Keys (Free)
- 🔑 NewsAPI - https://newsapi.org/
- 🔑 Guardian API - https://open-platform.theguardian.com/
- 🔑 Geocoding API - Google Maps/MapBox
- 🔑 OpenAI API - https://platform.openai.com/

## 🎯 Access Points

After successful deployment:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend API** | http://localhost:3001 | API endpoints |
| **Health Check** | http://localhost:3001/api/health | System status |

## 🛠 Management Commands

```bash
# Check status
docker-compose -f docker-compose.simple.yml ps

# View logs (all services)
docker-compose -f docker-compose.simple.yml logs -f

# View logs (specific service)
docker-compose -f docker-compose.simple.yml logs -f backend

# Stop application
docker-compose -f docker-compose.simple.yml down

# Restart application
docker-compose -f docker-compose.simple.yml restart

# Rebuild and restart
docker-compose -f docker-compose.simple.yml up -d --build

# Complete reset (removes data)
docker-compose -f docker-compose.simple.yml down -v
```

## 🔧 Configuration

### Environment File Location
```
interactive-world-news-map/.env
```

### Required Configuration
```bash
# Security (CHANGE THESE!)
POSTGRES_PASSWORD=your_secure_postgres_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters-long

# API Keys (REQUIRED)
NEWS_API_KEY=your_actual_news_api_key
GUARDIAN_API_KEY=your_actual_guardian_api_key
GEOCODING_API_KEY=your_actual_geocoding_api_key
OPENAI_API_KEY=your_actual_openai_api_key
```

## 🚨 Troubleshooting

### Common Issues

**"Docker is not installed"**
- Install Docker Desktop from https://docs.docker.com/get-docker/

**"Permission denied"**
```bash
chmod +x deploy-simple.sh
```

**"Port already in use"**
```bash
# Check what's using the port
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Or change ports in .env file
FRONTEND_PORT=3010
BACKEND_PORT=3011
```

**"Services not starting"**
```bash
# Check logs
docker-compose -f docker-compose.simple.yml logs

# Restart services
docker-compose -f docker-compose.simple.yml restart
```

### Get Help

1. **Check logs first:** `docker-compose -f docker-compose.simple.yml logs -f`
2. **Read troubleshooting guide:** [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
3. **Report issues:** GitHub Issues with complete log output

## ✅ Success Checklist

- [ ] All services show "Up (healthy)" in `docker-compose ps`
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend health check returns 200 at http://localhost:3001/api/health
- [ ] No error messages in logs
- [ ] API keys configured correctly

## 🎉 You're Done!

Once all services are running and healthy, you can:

1. **Access the application** at http://localhost:3000
2. **Explore the interactive map** with global news
3. **Test the bias analysis** features
4. **Create user accounts** and save preferences

The Simple Deployment includes everything you need to run the full application locally!