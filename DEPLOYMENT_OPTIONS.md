# Interactive World News Map - Deployment Options

This document outlines the different deployment options available for the Interactive World News Map application.

## Overview

The application offers three main deployment configurations to suit different infrastructure setups:

1. **Full Deployment** - Complete stack with all services
2. **Minimal Deployment** - Core services only (for users with existing infrastructure)
3. **Docker-Only Deployment** - Pure Docker images with no additional files needed

## Deployment Comparison

| Component | Full Deployment | Minimal Deployment | Docker-Only Deployment | Notes |
|-----------|----------------|-------------------|----------------------|-------|
| PostgreSQL Database | ✅ Included | ✅ Included | ✅ Included | Required for data storage |
| Redis Cache | ✅ Included | ✅ Included | ✅ Included | Required for sessions/caching |
| Backend API | ✅ Included | ✅ Included | ✅ Included | Core application logic |
| Frontend React App | ✅ Included | ✅ Included | ✅ Included | User interface |
| nginx Reverse Proxy | ✅ Included | ❌ External | ❌ External | Load balancing, SSL termination |
| Ollama Local LLM | ✅ Included | ❌ External | ❌ External | Optional local AI processing |
| Additional Files | 📁 Required | 📁 Required | ❌ None | init-db.sh, deployment scripts |

## Full Deployment

**Best for:** New deployments, development, testing, or when you want everything included.

### Features
- Complete application stack
- Built-in reverse proxy with nginx
- Local Ollama LLM support
- SSL/TLS termination
- Load balancing
- Static file serving optimization

### Quick Start
```bash
# Linux/Mac
curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.sh | bash

# Windows PowerShell
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.ps1'))
```

### Access Points
- **Application**: http://localhost (via nginx)
- **Direct Frontend**: http://localhost:3000
- **Direct Backend**: http://localhost:3001

### Documentation
See [STANDALONE_DEPLOYMENT.md](STANDALONE_DEPLOYMENT.md) for complete instructions.

## Minimal Deployment

**Best for:** Production environments with existing infrastructure, microservices architectures, or when you already have nginx/Ollama deployed.

### Features
- Core application services only
- Smaller resource footprint
- Integrates with existing reverse proxies
- Supports external Ollama instances
- Simplified service management

### Quick Start
```bash
# Linux/Mac
curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.sh | bash

# Windows PowerShell
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.ps1'))
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432 (internal)
- **Redis**: localhost:6379 (internal)

### Documentation
See [MINIMAL_DEPLOYMENT.md](MINIMAL_DEPLOYMENT.md) for complete instructions.

## Docker-Only Deployment

**Best for:** Users who want the simplest possible deployment with just Docker images.

### Features
- No additional files required
- Pure Docker Compose deployment
- Built-in database migrations
- Smallest setup footprint
- Perfect for testing and development

### Quick Start
```bash
# Download and deploy in one command
curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/docker-compose.minimal-standalone.yml
docker-compose -f docker-compose.minimal-standalone.yml up -d
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Documentation
See [DOCKER_ONLY_DEPLOYMENT.md](DOCKER_ONLY_DEPLOYMENT.md) for complete instructions.

## Resource Requirements

### Full Deployment
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **CPU**: 2 cores minimum
- **Network**: Internet access for APIs

### Minimal Deployment
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space
- **CPU**: 2 cores minimum
- **Network**: Internet access for APIs

### Docker-Only Deployment
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space
- **CPU**: 2 cores minimum
- **Network**: Internet access for APIs

## Use Cases

### Choose Full Deployment When:
- Setting up a new environment
- You want everything included out-of-the-box
- Development or testing environments
- You don't have existing nginx/proxy infrastructure
- You want to use local Ollama for AI processing
- You need SSL termination handled automatically

### Choose Minimal Deployment When:
- You have existing nginx or reverse proxy setup
- Running in a microservices architecture
- You want to minimize resource usage
- You have Ollama running on a separate server
- You need fine-grained control over proxy configuration
- Deploying in Kubernetes or similar orchestration platforms

### Choose Docker-Only Deployment When:
- You want the absolute simplest deployment
- Testing or development environments
- You don't want to download additional files
- You prefer pure Docker Compose workflows
- You need a quick proof-of-concept deployment
- You're comfortable configuring reverse proxy separately

## Integration Examples

### Minimal Deployment with External nginx

```nginx
# /etc/nginx/sites-available/news-map
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Minimal Deployment with External Ollama

```bash
# Configure external Ollama in .env
OLLAMA_BASE_URL=http://your-ollama-server:11434
BIAS_ANALYSIS_PROVIDER=ollama
OLLAMA_MODEL=llama2:7b
```

## Migration Between Deployments

### From Full to Minimal

1. **Backup your data:**
   ```bash
   docker exec news-map-postgres pg_dump -U news_map_user news_map_db > backup.sql
   ```

2. **Stop full deployment:**
   ```bash
   docker-compose -f docker-compose.standalone.yml down
   ```

3. **Deploy minimal version:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.sh | bash
   ```

4. **Restore data:**
   ```bash
   docker exec -i news-map-postgres psql -U news_map_user -d news_map_db < backup.sql
   ```

5. **Configure external services** (nginx, Ollama)

### From Minimal to Full

1. **Backup your data** (same as above)
2. **Stop minimal deployment**
3. **Deploy full version**
4. **Restore data**

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Full deployment uses ports 80, 443, 3000, 3001, 5432, 6379, 11434
   - Minimal deployment uses ports 3000, 3001, 5432, 6379

2. **External service connectivity:**
   - Ensure external Ollama is accessible from Docker containers
   - Check firewall rules for external services
   - Verify nginx configuration for proper routing

3. **Resource constraints:**
   - Monitor Docker container resource usage
   - Adjust resource limits in docker-compose files if needed

### Getting Help

1. Check the specific deployment documentation
2. Review Docker container logs
3. Test individual service connectivity
4. Check GitHub issues for known problems

## Security Considerations

### Full Deployment
- nginx handles SSL termination
- Built-in security headers
- Service isolation via Docker networks

### Minimal Deployment
- External proxy handles SSL termination
- Configure security headers in your proxy
- Ensure proper firewall rules for exposed ports

## Performance Considerations

### Full Deployment
- nginx provides static file caching
- Built-in load balancing capabilities
- Optimized for single-server deployment

### Minimal Deployment
- No built-in static file caching (handle in external proxy)
- More efficient resource usage
- Better suited for distributed deployments

## Conclusion

Choose the deployment option that best fits your infrastructure and requirements:

- **Full Deployment**: Complete, ready-to-use solution
- **Minimal Deployment**: Flexible, integrates with existing infrastructure

Both options provide the same core functionality with different levels of included infrastructure components.