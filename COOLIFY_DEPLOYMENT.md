# Coolify Deployment Guide

Deploy the Interactive World News Map directly in Coolify using pre-built Docker images - no repository cloning required!

## 🚀 Quick Coolify Deployment

### Option 1: Direct Docker Compose Deployment

1. **In Coolify Dashboard:**
   - Click "New Resource" → "Docker Compose"
   - Name: `world-news-map`
   - Paste the contents of `docker-compose.coolify.yml`

2. **Configure Environment Variables:**
   Copy the variables from `.env.coolify` and set them in Coolify's environment section:

   **Required Variables:**
   ```bash
   POSTGRES_PASSWORD=your_secure_postgres_password
   REDIS_PASSWORD=your_secure_redis_password
   JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters
   NEWS_API_KEY=your_news_api_key
   GUARDIAN_API_KEY=your_guardian_api_key
   GEOCODING_API_KEY=your_geocoding_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

   **Domain Configuration (Coolify will auto-configure):**
   ```bash
   VITE_API_URL=https://your-domain.com
   VITE_SOCKET_URL=https://your-domain.com
   CORS_ORIGIN=https://your-domain.com
   ```

3. **Deploy:**
   - Click "Deploy"
   - Coolify will pull the pre-built images and start all services

### Option 2: GitHub Repository Deployment

1. **In Coolify Dashboard:**
   - Click "New Resource" → "Public Repository"
   - Repository URL: `https://github.com/kingkhan92/World-News-Map.git`
   - Branch: `main`
   - Docker Compose File: `docker-compose.coolify.yml`

2. **Configure Environment Variables** (same as Option 1)

3. **Deploy**

## 📋 Required API Keys

Get these API keys before deployment:

| Service | Purpose | Free Tier | Get API Key |
|---------|---------|-----------|-------------|
| **NewsAPI** | News articles | ✅ 1000 requests/day | https://newsapi.org/ |
| **Guardian API** | News articles | ✅ 12,000 requests/day | https://open-platform.theguardian.com/ |
| **Geocoding** | Location data | ✅ Varies by provider | Google Maps, MapBox, etc. |
| **OpenAI** | AI bias analysis | ✅ $5 free credit | https://platform.openai.com/ |

## 🔧 Coolify-Specific Configuration

### Service Ports and Domains

Coolify will automatically handle:
- **Frontend**: Accessible via your configured domain
- **Backend API**: Accessible via `your-domain.com/api`
- **WebSocket**: Accessible via `your-domain.com/socket.io`

### Health Checks

All services include health checks:
- **PostgreSQL**: Database connectivity
- **Redis**: Cache connectivity  
- **Backend**: API health endpoint
- **Frontend**: Static file serving
- **NGINX**: Reverse proxy health

### Resource Limits

Configured for efficient resource usage:
- **Backend**: 512MB RAM limit, 256MB reserved
- **Frontend**: 128MB RAM limit, 64MB reserved
- **NGINX**: 128MB RAM limit, 64MB reserved
- **PostgreSQL**: Uses default limits
- **Redis**: Uses default limits

## 🎯 Deployment Advantages

### Why This Works Great in Coolify:

1. **No Repository Cloning**: Uses pre-built Docker images
2. **Automatic SSL**: Coolify handles HTTPS certificates
3. **Domain Management**: Automatic subdomain/domain configuration
4. **Environment Variables**: Easy configuration through Coolify UI
5. **Health Monitoring**: Built-in health checks for all services
6. **Automatic Restarts**: Services restart automatically on failure
7. **Resource Management**: Proper resource limits and reservations

### Pre-built Images Used:

- **Backend**: `ghcr.io/kingkhan92/world-news-map-backend:latest`
- **Frontend**: `ghcr.io/kingkhan92/world-news-map-frontend:latest`
- **Database**: `postgres:15-alpine`
- **Cache**: `redis:7-alpine`
- **Proxy**: `nginx:alpine`

## 🔍 Verification Steps

After deployment in Coolify:

1. **Check Service Status**: All services should show "Running" in Coolify
2. **Test Frontend**: Visit your configured domain
3. **Test API**: Visit `your-domain.com/api/health`
4. **Check Logs**: Review logs in Coolify for any errors

## 🛠 Customization Options

### Remove NGINX (if Coolify handles routing):

Remove the `nginx` service from the Docker Compose file and expose frontend directly:

```yaml
frontend:
  # ... existing config
  ports:
    - "3000:3000"  # Add this line
```

### Add External Ollama:

Set these environment variables:
```bash
BIAS_ANALYSIS_PROVIDER=ollama
OLLAMA_BASE_URL=http://your-ollama-server:11434
OLLAMA_MODEL=llama2:7b
```

### Custom Domain Configuration:

Update these variables with your actual domain:
```bash
VITE_API_URL=https://your-actual-domain.com
VITE_SOCKET_URL=https://your-actual-domain.com
CORS_ORIGIN=https://your-actual-domain.com
```

## 🚨 Troubleshooting

### Common Issues:

1. **Images Not Found**: 
   - Ensure GitHub Actions have built and published the images
   - Check image names match exactly

2. **Environment Variables Not Set**:
   - Verify all required variables are configured in Coolify
   - Check for typos in variable names

3. **Database Connection Issues**:
   - Ensure PostgreSQL service is healthy
   - Check database credentials

4. **API Key Errors**:
   - Verify API keys are valid and have proper permissions
   - Check API key quotas haven't been exceeded

### Debug Commands:

In Coolify terminal/logs:
```bash
# Check service health
docker-compose ps

# View backend logs
docker-compose logs backend

# Test database connection
docker-compose exec postgres pg_isready -U news_map_user

# Test Redis connection
docker-compose exec redis redis-cli ping
```

## 🎉 Success!

Once deployed, you'll have:
- ✅ **Full-featured news map application**
- ✅ **Automatic HTTPS** via Coolify
- ✅ **Scalable architecture** with health monitoring
- ✅ **Easy updates** by redeploying
- ✅ **Professional deployment** ready for production use

The application will be accessible at your configured domain with all features working including real-time updates, bias analysis, and interactive mapping!