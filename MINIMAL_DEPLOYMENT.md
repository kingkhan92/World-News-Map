# Interactive World News Map - Minimal Deployment

Deploy the Interactive World News Map application without nginx and ollama services for users who have these services deployed separately.

## Quick Start

### Option 1: One-Command Deployment (Linux/Mac)

```bash
curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.sh | bash
```

### Option 2: One-Command Deployment (Windows PowerShell)

```powershell
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.ps1'))
```

### Option 3: Manual Deployment

1. **Download deployment files:**
   ```bash
   mkdir news-map-minimal && cd news-map-minimal
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/docker-compose.minimal.yml
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/.env.minimal
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/init-db.sh
   ```

2. **Configure environment:**
   ```bash
   cp .env.minimal .env
   # Edit .env file with your configuration
   ```

3. **Deploy:**
   ```bash
   docker-compose -f docker-compose.minimal.yml up -d
   ```

### Option 4: Build from Source (If Images Not Available)

If you encounter "denied" errors when pulling Docker images:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kingkhan92/interactive-world-news-map.git
   cd interactive-world-news-map
   ```

2. **Configure environment:**
   ```bash
   cp .env.minimal .env
   # Edit .env file with your configuration
   ```

3. **Deploy with local build:**
   ```bash
   docker-compose -f docker-compose.minimal-local.yml up -d --build
   ```

## What's Included

This minimal deployment includes only the essential services:

- **PostgreSQL Database** - Data storage
- **Redis Cache** - Session and data caching
- **Backend API** - Node.js/Express application
- **Frontend** - React application

## What's Excluded

Services not included (assuming you have them deployed separately):

- **nginx** - Reverse proxy and load balancer
- **ollama** - Local LLM service

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- 5GB free disk space
- Internet connection for API access

## Configuration

### Required API Keys

Before deployment, you need to obtain the following API keys:

1. **NewsAPI.org**: Register at https://newsapi.org/
2. **Guardian API**: Register at https://open-platform.theguardian.com/
3. **Geocoding API**: Use Google Maps, MapBox, or similar service
4. **OpenAI API** (for bias analysis): Get key from https://platform.openai.com/

### Environment Configuration

Edit the `.env` file and configure:

```bash
# Security (CHANGE THESE!)
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters

# Required API keys
NEWS_API_KEY=your-news-api-key
GUARDIAN_API_KEY=your-guardian-api-key
GEOCODING_API_KEY=your-geocoding-api-key
OPENAI_API_KEY=your-openai-api-key

# LLM Provider Configuration
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,grok

# Optional: External Ollama (if you have it running separately)
OLLAMA_BASE_URL=http://your-ollama-host:11434
```

## Deployment

### Standard Deployment

Deploy with OpenAI bias analysis:

```bash
docker-compose -f docker-compose.minimal.yml up -d
```

### With External Ollama

If you have Ollama running on another server:

```bash
# Configure Ollama URL in .env
echo "OLLAMA_BASE_URL=http://your-ollama-server:11434" >> .env
echo "BIAS_ANALYSIS_PROVIDER=ollama" >> .env

# Deploy
docker-compose -f docker-compose.minimal.yml up -d
```

## Access Points

After deployment, the services are available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **Database**: localhost:5432
- **Redis**: localhost:6379

## Reverse Proxy Configuration

Since nginx is not included, you'll need to configure your external reverse proxy to route traffic to the services.

### nginx Configuration Example

```nginx
upstream frontend {
    server localhost:3000;
}

upstream backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for real-time updates
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik Configuration Example

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.frontend.entrypoints=web"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`your-domain.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.backend.entrypoints=web"
      - "traefik.http.services.backend.loadbalancer.server.port=3001"
```

## Management Commands

### View Status
```bash
docker-compose -f docker-compose.minimal.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.minimal.yml logs -f

# Specific service
docker-compose -f docker-compose.minimal.yml logs -f backend
```

### Stop Application
```bash
docker-compose -f docker-compose.minimal.yml down
```

### Stop and Remove Data
```bash
docker-compose -f docker-compose.minimal.yml down -v
```

### Update to Latest Version
```bash
docker-compose -f docker-compose.minimal.yml pull
docker-compose -f docker-compose.minimal.yml up -d
```

## Health Monitoring

### Check Service Health
```bash
# Backend API health
curl http://localhost:3001/api/health

# Frontend accessibility
curl http://localhost:3000

# Individual service status
docker-compose -f docker-compose.minimal.yml ps
```

### Monitor Resource Usage
```bash
docker stats
```

## External Service Integration

### Using External Ollama

If you have Ollama running on another server:

1. **Configure the URL in .env:**
   ```bash
   OLLAMA_BASE_URL=http://your-ollama-server:11434
   BIAS_ANALYSIS_PROVIDER=ollama
   ```

2. **Ensure network connectivity:**
   - The backend container must be able to reach your Ollama server
   - If Ollama is on the same host, use `host.docker.internal:11434`
   - If Ollama is on another host, ensure firewall rules allow access

3. **Test connectivity:**
   ```bash
   # From inside the backend container
   docker exec news-map-backend curl http://your-ollama-server:11434/api/tags
   ```

### Using External nginx

Your external nginx should:

1. **Route frontend traffic** to `http://localhost:3000`
2. **Route API traffic** to `http://localhost:3001`
3. **Support WebSocket connections** for real-time updates
4. **Handle SSL termination** if using HTTPS

## Troubleshooting

### Common Issues

1. **Docker image pull errors ("denied"):**
   - The pre-built images may not be available yet
   - Use the local build option: `docker-compose -f docker-compose.minimal-local.yml up -d --build`
   - Ensure you have cloned the full repository

2. **Services not starting:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.minimal.yml logs
   
   # Restart services
   docker-compose -f docker-compose.minimal.yml restart
   ```

2. **Database connection errors:**
   ```bash
   # Check database health
   docker exec news-map-postgres pg_isready -U news_map_user
   
   # Reset database connection
   docker-compose -f docker-compose.minimal.yml restart backend
   ```

3. **External service connectivity:**
   ```bash
   # Test Ollama connectivity
   docker exec news-map-backend curl http://your-ollama-server:11434/api/tags
   
   # Check network connectivity
   docker exec news-map-backend ping your-ollama-server
   ```

4. **CORS issues with external proxy:**
   - Update `CORS_ORIGIN` in .env to match your domain
   - Ensure proxy passes correct headers

### Performance Considerations

Since this minimal deployment excludes nginx:

1. **Static file serving** is handled by the React dev server (less efficient)
2. **No built-in caching** for static assets
3. **No load balancing** if scaling backend services

For production use, consider:
- Using a proper reverse proxy (nginx, Traefik, etc.)
- Implementing CDN for static assets
- Adding load balancing for multiple backend instances

## Security Considerations

### Production Deployment

For production use:

1. **Change all default passwords**
2. **Use strong JWT secrets (32+ characters)**
3. **Configure proper CORS origins**
4. **Use HTTPS with your reverse proxy**
5. **Limit exposed ports (only expose what's needed)**
6. **Regular security updates for Docker images**

### Network Security

- The application uses a custom Docker network for service isolation
- Only necessary ports are exposed to the host
- Database and Redis are not directly accessible from outside the Docker network

## Scaling

### Horizontal Scaling

To scale backend services:

```bash
docker-compose -f docker-compose.minimal.yml up -d --scale backend=3
```

Update your external load balancer to include multiple backend instances.

### Resource Limits

The configuration includes resource limits:

- **Backend**: 512MB RAM limit, 256MB reserved
- **Frontend**: 128MB RAM limit, 64MB reserved

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker exec news-map-postgres pg_dump -U news_map_user news_map_db > backup.sql

# Restore backup
docker exec -i news-map-postgres psql -U news_map_user -d news_map_db < backup.sql
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm -v news-map-minimal_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
docker run --rm -v news-map-minimal_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

## Comparison with Full Deployment

| Feature | Full Deployment | Minimal Deployment |
|---------|----------------|-------------------|
| nginx | ✅ Included | ❌ External |
| ollama | ✅ Included | ❌ External |
| PostgreSQL | ✅ Included | ✅ Included |
| Redis | ✅ Included | ✅ Included |
| Backend API | ✅ Included | ✅ Included |
| Frontend | ✅ Included | ✅ Included |
| SSL/TLS | ✅ Built-in | ❌ External |
| Load Balancing | ✅ Built-in | ❌ External |
| Resource Usage | Higher | Lower |
| Setup Complexity | Higher | Lower |

## Support

For issues and support:

1. Check this deployment guide
2. Review application logs
3. Check GitHub issues: https://github.com/kingkhan92/interactive-world-news-map/issues
4. Review the main documentation: https://github.com/kingkhan92/interactive-world-news-map

## License

This deployment configuration is part of the Interactive World News Map project and follows the same license terms.