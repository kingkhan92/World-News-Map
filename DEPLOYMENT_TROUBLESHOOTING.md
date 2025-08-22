# Deployment Troubleshooting Guide

This guide helps resolve common deployment issues with the Interactive World News Map application.

## Quick Solutions

### 🚨 Docker Image Pull Errors

If you get "denied" errors when pulling Docker images:

```bash
Error Head "https://ghcr.io/v2/kingkhan92/interactive-world-news-map-backend/manifests/latest": denied
```

**Solution: Use the Simple Deployment (builds from source)**
```bash
git clone https://github.com/kingkhan92/interactive-world-news-map.git
cd interactive-world-news-map
./deploy-simple.sh  # Linux/Mac
# or
.\deploy-simple.ps1  # Windows
```

### 🚨 Database Connection Errors

If backend fails to connect to database:

**Check database status:**
```bash
docker-compose -f docker-compose.simple.yml exec postgres pg_isready -U news_map_user
```

**Restart database:**
```bash
docker-compose -f docker-compose.simple.yml restart postgres
```

**Check logs:**
```bash
docker-compose -f docker-compose.simple.yml logs postgres
```

### 🚨 API Key Configuration Errors

If you see "API key not configured" errors:

1. **Edit your .env file:**
   ```bash
   nano .env  # or your preferred editor
   ```

2. **Set required API keys:**
   ```bash
   NEWS_API_KEY=your_actual_api_key_here
   GUARDIAN_API_KEY=your_actual_api_key_here
   GEOCODING_API_KEY=your_actual_api_key_here
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **Restart services:**
   ```bash
   docker-compose -f docker-compose.simple.yml restart backend
   ```

## Deployment Options Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Simple Deployment** | Always works, builds from source | Longer initial build time | First-time users, development |
| **Standalone Deployment** | Fast deployment, pre-built images | May fail if images not accessible | Production, quick testing |
| **Minimal Deployment** | Excludes nginx/ollama, smaller footprint | Requires external reverse proxy | Advanced users with existing infrastructure |

## Step-by-Step Troubleshooting

### 1. Check Prerequisites

**Docker Installation:**
```bash
docker --version
docker-compose --version
```

**Expected output:**
```
Docker version 20.10.0 or higher
Docker Compose version 2.0.0 or higher
```

### 2. Verify Project Structure

If building from source, ensure you have the complete project:
```bash
ls -la
# Should show: packages/, docker-compose.*.yml, package.json, etc.
```

### 3. Check Environment Configuration

**Verify .env file exists:**
```bash
ls -la .env
```

**Check for placeholder values:**
```bash
grep -E "your_.*_here|your-.*-here|change_this" .env
```

If this returns results, you need to configure those values.

### 4. Test Individual Services

**Start only database:**
```bash
docker-compose -f docker-compose.simple.yml up -d postgres
```

**Check database health:**
```bash
docker-compose -f docker-compose.simple.yml exec postgres pg_isready -U news_map_user
```

**Start only redis:**
```bash
docker-compose -f docker-compose.simple.yml up -d redis
```

**Check redis health:**
```bash
docker-compose -f docker-compose.simple.yml exec redis redis-cli -a your_redis_password ping
```

### 5. Check Service Logs

**All services:**
```bash
docker-compose -f docker-compose.simple.yml logs -f
```

**Specific service:**
```bash
docker-compose -f docker-compose.simple.yml logs -f backend
```

**Recent errors only:**
```bash
docker-compose -f docker-compose.simple.yml logs --tail=50 | grep -i error
```

## Common Error Messages and Solutions

### "Error: Docker is not installed"

**Solution:**
- **Windows:** Install Docker Desktop from https://docs.docker.com/desktop/windows/
- **Mac:** Install Docker Desktop from https://docs.docker.com/desktop/mac/
- **Linux:** Follow instructions at https://docs.docker.com/engine/install/

### "Error: Docker Compose is not installed"

**Solution:**
- **Docker Desktop:** Compose is included
- **Linux:** Install separately: https://docs.docker.com/compose/install/

### "Error: This script must be run from the project root directory"

**Solution:**
```bash
git clone https://github.com/kingkhan92/interactive-world-news-map.git
cd interactive-world-news-map
# Then run the deployment script
```

### "Failed to pull Docker images"

**Solution 1 - Use Simple Deployment:**
```bash
./deploy-simple.sh  # Builds from source instead of pulling images
```

**Solution 2 - Manual Build:**
```bash
docker-compose -f docker-compose.simple.yml build --no-cache
docker-compose -f docker-compose.simple.yml up -d
```

### "Database connection failed"

**Check database is running:**
```bash
docker-compose -f docker-compose.simple.yml ps postgres
```

**Check database logs:**
```bash
docker-compose -f docker-compose.simple.yml logs postgres
```

**Restart database:**
```bash
docker-compose -f docker-compose.simple.yml restart postgres
```

### "Backend health check failed"

**Check backend logs:**
```bash
docker-compose -f docker-compose.simple.yml logs backend
```

**Common causes:**
1. Database not ready - wait longer or restart
2. Missing API keys - check .env file
3. Port conflicts - check if port 3001 is in use

### "Frontend not accessible"

**Check frontend logs:**
```bash
docker-compose -f docker-compose.simple.yml logs frontend
```

**Test direct access:**
```bash
curl http://localhost:3000/health
```

**Common causes:**
1. Backend not ready - wait for backend health check
2. Port conflicts - check if port 3000 is in use
3. Build failures - check build logs

## Port Conflicts

If you get port binding errors:

**Check what's using the port:**
```bash
# Linux/Mac
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
```

**Use different ports:**
Edit your .env file:
```bash
FRONTEND_PORT=3010
BACKEND_PORT=3011
POSTGRES_PORT=5433
```

## Performance Issues

### Slow Build Times

**Use build cache:**
```bash
docker-compose -f docker-compose.simple.yml build
```

**Clean build (if cache is corrupted):**
```bash
docker-compose -f docker-compose.simple.yml build --no-cache
```

### High Memory Usage

**Check resource usage:**
```bash
docker stats
```

**Reduce resource limits in docker-compose file:**
```yaml
deploy:
  resources:
    limits:
      memory: 256M
```

## Network Issues

### Services Can't Communicate

**Check network:**
```bash
docker network ls
docker network inspect interactive-world-news-map_news-map-network
```

**Recreate network:**
```bash
docker-compose -f docker-compose.simple.yml down
docker-compose -f docker-compose.simple.yml up -d
```

## Complete Reset

If nothing else works, perform a complete reset:

```bash
# Stop all services
docker-compose -f docker-compose.simple.yml down -v

# Remove all containers and images
docker system prune -a

# Remove volumes (WARNING: This deletes all data)
docker volume prune

# Start fresh
docker-compose -f docker-compose.simple.yml up -d --build
```

## Getting Help

### Collect Debug Information

Before asking for help, collect this information:

```bash
# System info
docker --version
docker-compose --version
uname -a  # Linux/Mac
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"  # Windows

# Service status
docker-compose -f docker-compose.simple.yml ps

# Recent logs
docker-compose -f docker-compose.simple.yml logs --tail=100

# Environment (remove sensitive data)
cat .env | grep -v "PASSWORD\|SECRET\|KEY"
```

### Support Channels

1. **GitHub Issues:** https://github.com/kingkhan92/interactive-world-news-map/issues
2. **Documentation:** Check all .md files in the repository
3. **Docker Logs:** Always include relevant log output

### Reporting Issues

When reporting issues, include:

1. **Deployment method used** (simple, standalone, minimal)
2. **Operating system** and version
3. **Docker version** and Docker Compose version
4. **Complete error message** (not just the last line)
5. **Service logs** (use `docker-compose logs`)
6. **Steps to reproduce** the issue

## Alternative Deployment Methods

If Docker deployment continues to fail:

### Manual Installation

1. **Install Node.js 18+**
2. **Install PostgreSQL 15**
3. **Install Redis 7**
4. **Clone repository and install dependencies:**
   ```bash
   git clone https://github.com/kingkhan92/interactive-world-news-map.git
   cd interactive-world-news-map
   npm install
   ```
5. **Configure environment variables**
6. **Run database migrations**
7. **Start services manually:**
   ```bash
   # Terminal 1
   cd packages/backend && npm run dev
   
   # Terminal 2
   cd packages/frontend && npm run dev
   ```

### Cloud Deployment

Consider using cloud platforms that handle Docker deployment:

- **Railway:** Connect GitHub repository for automatic deployment
- **Render:** Docker-based deployment with automatic builds
- **DigitalOcean App Platform:** Container-based deployment
- **Heroku:** Container registry deployment

These platforms often handle the Docker complexity for you.