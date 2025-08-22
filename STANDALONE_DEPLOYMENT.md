# Interactive World News Map - Standalone Deployment

Deploy the Interactive World News Map application without cloning the repository using pre-built Docker images.

## Deployment Options

### Full Deployment (Includes nginx + ollama)

**Option 1: One-Command Deployment (Linux/Mac)**
```bash
curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.sh | bash
```

**Option 2: One-Command Deployment (Windows PowerShell)**
```powershell
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.ps1'))
```

### Minimal Deployment (No nginx/ollama)

For users who have nginx and ollama deployed separately:

**Option 1: One-Command Deployment (Linux/Mac)**
```bash
curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.sh | bash
```

**Option 2: One-Command Deployment (Windows PowerShell)**
```powershell
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-minimal.ps1'))
```

**See [MINIMAL_DEPLOYMENT.md](MINIMAL_DEPLOYMENT.md) for detailed minimal deployment instructions.**

### Option 3: Manual Deployment

1. **Download deployment files:**
   ```bash
   mkdir news-map-deployment && cd news-map-deployment
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/docker-compose.standalone.yml
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/.env.standalone
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/nginx.conf
   curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/init-db.sh
   ```

2. **Configure environment:**
   ```bash
   cp .env.standalone .env
   # Edit .env file with your configuration
   ```

3. **Deploy:**
   ```bash
   docker-compose -f docker-compose.standalone.yml up -d
   ```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB free disk space
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
# Database passwords (change these!)
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password

# JWT secret (change this!)
JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters

# Required API keys
NEWS_API_KEY=your-news-api-key
GUARDIAN_API_KEY=your-guardian-api-key
GEOCODING_API_KEY=your-geocoding-api-key
OPENAI_API_KEY=your-openai-api-key

# LLM Provider Configuration
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama
```

## Deployment Options

### Standard Deployment

Deploy with OpenAI bias analysis:

```bash
docker-compose -f docker-compose.standalone.yml up -d
```

### With Local LLM (Ollama)

Deploy with local Ollama support:

```bash
# Start with Ollama
docker-compose -f docker-compose.standalone.yml --profile ollama up -d

# Pull a model (after Ollama starts)
docker exec news-map-ollama ollama pull llama2:7b

# Configure to use Ollama
echo "BIAS_ANALYSIS_PROVIDER=ollama" >> .env
echo "OLLAMA_MODEL=llama2:7b" >> .env

# Restart backend to pick up new config
docker-compose -f docker-compose.standalone.yml restart backend
```

## Access Points

After deployment, access your application at:

- **Web Application**: http://localhost
- **API Health Check**: http://localhost/api/health
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000

## Management Commands

### View Status
```bash
docker-compose -f docker-compose.standalone.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.standalone.yml logs -f

# Specific service
docker-compose -f docker-compose.standalone.yml logs -f backend
```

### Stop Application
```bash
docker-compose -f docker-compose.standalone.yml down
```

### Stop and Remove Data
```bash
docker-compose -f docker-compose.standalone.yml down -v
```

### Update to Latest Version
```bash
docker-compose -f docker-compose.standalone.yml pull
docker-compose -f docker-compose.standalone.yml up -d
```

## Health Monitoring

### Check Service Health
```bash
# Overall health
curl http://localhost/health

# Backend API health
curl http://localhost:3001/api/health

# Individual service status
docker-compose -f docker-compose.standalone.yml ps
```

### Monitor Resource Usage
```bash
docker stats
```

## Troubleshooting

### Common Issues

1. **Services not starting:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.standalone.yml logs
   
   # Restart services
   docker-compose -f docker-compose.standalone.yml restart
   ```

2. **Database connection errors:**
   ```bash
   # Check database health
   docker exec news-map-postgres pg_isready -U news_map_user
   
   # Reset database connection
   docker-compose -f docker-compose.standalone.yml restart backend
   ```

3. **API key errors:**
   - Verify API keys in `.env` file
   - Check API key quotas and limits
   - Ensure API keys have necessary permissions

4. **LLM Provider issues:**
   ```bash
   # Test bias analysis endpoint
   curl -X POST http://localhost:3001/api/news/test-bias \
     -H "Content-Type: application/json" \
     -d '{"content": "Test article content"}'
   
   # Check Ollama models (if using)
   docker exec news-map-ollama ollama list
   ```

### Performance Issues

1. **Slow map rendering:**
   - Check browser console for WebGL errors
   - Verify adequate GPU resources
   - Consider reducing pin density

2. **Slow API responses:**
   - Check Redis cache status
   - Monitor database query performance
   - Review API rate limits

## Security Considerations

### Production Deployment

For production use:

1. **Change all default passwords**
2. **Use strong JWT secrets (32+ characters)**
3. **Enable HTTPS with valid SSL certificates**
4. **Configure firewall rules (only expose ports 80, 443)**
5. **Regular security updates for Docker images**
6. **Monitor logs for suspicious activity**

### Network Security

The application uses a custom Docker network (`news-map-network`) for service isolation.

### Data Security

- Passwords are hashed using bcrypt
- JWT tokens have configurable expiration
- Database connections use SSL in production
- Input validation and sanitization implemented

## Scaling

### Horizontal Scaling

To scale backend services:

```bash
docker-compose -f docker-compose.standalone.yml up -d --scale backend=3
```

Update nginx upstream configuration to include multiple backend instances.

### Resource Limits

The configuration includes resource limits:

- **Backend**: 512MB RAM limit, 256MB reserved
- **Frontend**: 128MB RAM limit, 64MB reserved
- **NGINX**: 128MB RAM limit, 64MB reserved

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
docker run --rm -v news-map-deployment_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
docker run --rm -v news-map-deployment_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .
```

## Support

For issues and support:

1. Check this deployment guide
2. Review application logs
3. Check GitHub issues: https://github.com/kingkhan92/interactive-world-news-map/issues
4. Review the main documentation: https://github.com/kingkhan92/interactive-world-news-map

## License

This deployment configuration is part of the Interactive World News Map project and follows the same license terms.