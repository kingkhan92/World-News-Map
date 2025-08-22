# Docker-Only Deployment

Deploy the Interactive World News Map using only Docker images - no additional files needed!

## Quick Start

### Option 1: Build from Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/kingkhan92/interactive-world-news-map.git
cd interactive-world-news-map

# Set your API keys (required)
export NEWS_API_KEY="your-news-api-key"
export GUARDIAN_API_KEY="your-guardian-api-key" 
export GEOCODING_API_KEY="your-geocoding-api-key"
export OPENAI_API_KEY="your-openai-api-key"

# Set secure passwords (recommended)
export POSTGRES_PASSWORD="your-secure-postgres-password"
export REDIS_PASSWORD="your-secure-redis-password"
export JWT_SECRET="your-very-secure-jwt-secret-at-least-32-characters"

# Deploy with local build
docker-compose -f docker-compose.minimal-local.yml up -d --build
```

### Option 2: Pre-built Images (If Available)

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/docker-compose.minimal-standalone.yml

# Set your API keys and deploy
# (Set environment variables as shown above)
docker-compose -f docker-compose.minimal-standalone.yml up -d
```

**Note**: If you get "denied" errors when pulling images, the pre-built images may not be available yet. Use Option 1 to build from source.

### Option 2: Inline Docker Compose

Create this `docker-compose.yml` file and run `docker-compose up -d`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: news_map_db
      POSTGRES_USER: news_map_user
      POSTGRES_PASSWORD: change_this_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - news-map-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass change_this_password --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - news-map-network

  backend:
    image: ghcr.io/kingkhan92/interactive-world-news-map-backend:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://news_map_user:change_this_password@postgres:5432/news_map_db
      REDIS_URL: redis://:change_this_password@redis:6379
      JWT_SECRET: change-this-to-a-very-secure-secret-at-least-32-characters
      NEWS_API_KEY: your-news-api-key
      GUARDIAN_API_KEY: your-guardian-api-key
      GEOCODING_API_KEY: your-geocoding-api-key
      OPENAI_API_KEY: your-openai-api-key
      RUN_MIGRATIONS: "true"
    ports:
      - "3001:3001"
    networks:
      - news-map-network
    depends_on:
      - postgres
      - redis

  frontend:
    image: ghcr.io/kingkhan92/interactive-world-news-map-frontend:latest
    environment:
      VITE_API_URL: http://localhost:3001
      VITE_SOCKET_URL: http://localhost:3001
    ports:
      - "3000:3000"
    networks:
      - news-map-network
    depends_on:
      - backend

networks:
  news-map-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

## Required Configuration

### API Keys (Required)

You must obtain these API keys before deployment:

1. **NewsAPI**: Get from https://newsapi.org/
2. **Guardian API**: Get from https://open-platform.theguardian.com/
3. **Geocoding API**: Get from Google Maps, MapBox, etc.
4. **OpenAI API**: Get from https://platform.openai.com/

### Security Settings (Recommended)

Change these default values for production:

- `POSTGRES_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password  
- `JWT_SECRET`: JWT signing secret (32+ characters)

## Environment Variables

Set these environment variables or modify the compose file:

```bash
# Required API Keys
export NEWS_API_KEY="your-news-api-key"
export GUARDIAN_API_KEY="your-guardian-api-key"
export GEOCODING_API_KEY="your-geocoding-api-key"
export OPENAI_API_KEY="your-openai-api-key"

# Security (change these!)
export POSTGRES_PASSWORD="your-secure-postgres-password"
export REDIS_PASSWORD="your-secure-redis-password"
export JWT_SECRET="your-very-secure-jwt-secret-at-least-32-characters"

# Optional: External Ollama
export OLLAMA_BASE_URL="http://your-ollama-server:11434"
export BIAS_ANALYSIS_PROVIDER="ollama"  # or "openai" (default)

# Optional: Custom ports
export FRONTEND_PORT="3000"
export BACKEND_PORT="3001"
export POSTGRES_PORT="5432"
export REDIS_PORT="6379"
```

## Access Points

After deployment:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## What's Included

This deployment includes:

✅ **PostgreSQL Database** - Data storage  
✅ **Redis Cache** - Session and data caching  
✅ **Backend API** - Node.js/Express application  
✅ **Frontend** - React application  
✅ **Automatic Database Migration** - Schema setup on first run  

## What's NOT Included

❌ **nginx** - Use your own reverse proxy  
❌ **ollama** - Connect to external instance if needed  
❌ **SSL/TLS** - Handle in your reverse proxy  

## Management Commands

```bash
# View status
docker-compose -f docker-compose.minimal-standalone.yml ps

# View logs
docker-compose -f docker-compose.minimal-standalone.yml logs -f

# Stop services
docker-compose -f docker-compose.minimal-standalone.yml down

# Update to latest images
docker-compose -f docker-compose.minimal-standalone.yml pull
docker-compose -f docker-compose.minimal-standalone.yml up -d
```

## Reverse Proxy Integration

### nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Traefik Example

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`your-domain.com`)"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`your-domain.com`) && PathPrefix(`/api`)"
      - "traefik.http.services.backend.loadbalancer.server.port=3001"
```

## Troubleshooting

### Common Issues

1. **"denied" errors when pulling images**: 
   - The pre-built Docker images may not be available yet
   - Use the local build option: `docker-compose -f docker-compose.minimal-local.yml up -d --build`
   - Or clone the repository and build from source

2. **Services won't start**: Check API keys are set correctly

3. **Database connection errors**: Ensure PostgreSQL is healthy before backend starts

4. **Frontend can't reach backend**: Check CORS_ORIGIN environment variable

5. **Build failures**: Ensure you have cloned the full repository with all source code

### Health Checks

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:3000

# Check database
docker exec news-map-postgres pg_isready -U news_map_user
```

## Resource Requirements

- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space
- **CPU**: 2 cores minimum
- **Network**: Internet access for API calls

## Security Notes

For production deployment:

1. Change all default passwords
2. Use environment files instead of inline secrets
3. Configure proper firewall rules
4. Use HTTPS in your reverse proxy
5. Regular security updates for Docker images

## Support

- Documentation: [GitHub Repository](https://github.com/kingkhan92/interactive-world-news-map)
- Issues: [GitHub Issues](https://github.com/kingkhan92/interactive-world-news-map/issues)
- Full deployment options: See `DEPLOYMENT_OPTIONS.md`