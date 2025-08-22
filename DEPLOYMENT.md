# Interactive World News Map - Deployment Guide

This guide provides comprehensive instructions for deploying the Interactive World News Map application using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB free disk space
- Internet connection for API access

## Quick Start

1. **Clone and prepare the environment:**
   ```bash
   git clone <repository-url>
   cd interactive-world-news-map
   cp .env.production .env.production.local
   ```

2. **Configure environment variables:**
   Edit `.env.production.local` and set your API keys and passwords:
   ```bash
   # Required: Set secure passwords
   POSTGRES_PASSWORD=your-secure-postgres-password
   REDIS_PASSWORD=your-secure-redis-password
   JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters

   # Required: Set your API keys
   NEWS_API_KEY=your-news-api-key
   GUARDIAN_API_KEY=your-guardian-api-key
   GEOCODING_API_KEY=your-geocoding-api-key
   
   # LLM Provider Configuration (choose one or more)
   BIAS_ANALYSIS_PROVIDER=openai
   OPENAI_API_KEY=your-openai-api-key
   # Optional: Configure additional providers
   # GROK_API_KEY=your-grok-api-key
   # OLLAMA_BASE_URL=http://localhost:11434
   ```

3. **Deploy the application:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

4. **Access the application:**
   - Web Application: http://localhost
   - API Health Check: http://localhost/api/health

## Deployment Options

### Development Deployment

For development with hot reloading:

```bash
docker-compose up -d
```

### Production Deployment

For production with optimized builds:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Local LLM Deployment (Ollama)

To deploy with local Ollama LLM support:

```bash
# Start with Ollama service
docker-compose -f docker-compose.prod.yml --profile ollama up -d

# Wait for Ollama to start, then pull a model
docker exec news-map-ollama ollama pull llama2:7b

# Configure to use Ollama as primary provider
echo "BIAS_ANALYSIS_PROVIDER=ollama" >> .env.production.local
echo "OLLAMA_MODEL=llama2:7b" >> .env.production.local
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes | - |
| `REDIS_PASSWORD` | Redis password | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `NEWS_API_KEY` | NewsAPI.org API key | Yes | - |
| `GUARDIAN_API_KEY` | Guardian API key | Yes | - |
| `GEOCODING_API_KEY` | Geocoding service API key | Yes | - |
| `BIAS_ANALYSIS_PROVIDER` | Primary LLM provider | No | openai |
| `OPENAI_API_KEY` | OpenAI API key | Conditional | - |
| `GROK_API_KEY` | Grok API key | Conditional | - |
| `OLLAMA_BASE_URL` | Ollama service URL | Conditional | http://ollama:11434 |
| `HTTP_PORT` | HTTP port for nginx | No | 80 |
| `HTTPS_PORT` | HTTPS port for nginx | No | 443 |
| `LOG_LEVEL` | Application log level | No | info |
| `CORS_ORIGIN` | CORS allowed origin | No | http://localhost |

### API Keys Setup

1. **NewsAPI.org**: Register at https://newsapi.org/
2. **Guardian API**: Register at https://open-platform.theguardian.com/
3. **Geocoding**: Use Google Maps, MapBox, or similar service

### LLM Provider Setup

The application supports multiple LLM providers for bias analysis. Choose one or configure multiple for fallback:

#### OpenAI (Recommended)
1. **Get API Key**: Register at https://platform.openai.com/
2. **Set Environment Variables**:
   ```bash
   BIAS_ANALYSIS_PROVIDER=openai
   OPENAI_API_KEY=sk-your-openai-api-key
   OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4
   ```

#### Grok (xAI)
1. **Get API Key**: Register at https://x.ai/
2. **Set Environment Variables**:
   ```bash
   BIAS_ANALYSIS_PROVIDER=grok
   GROK_API_KEY=your-grok-api-key
   GROK_MODEL=grok-beta
   ```

#### Ollama (Local/Self-hosted)
1. **Deploy with Ollama Profile**:
   ```bash
   docker-compose -f docker-compose.prod.yml --profile ollama up -d
   ```
2. **Pull Required Models**:
   ```bash
   # Wait for Ollama service to start
   docker exec news-map-ollama ollama pull llama2:7b
   # Or use other models: mistral, codellama, etc.
   ```
3. **Set Environment Variables**:
   ```bash
   BIAS_ANALYSIS_PROVIDER=ollama
   OLLAMA_BASE_URL=http://ollama:11434
   OLLAMA_MODEL=llama2:7b
   ```

#### Multi-Provider Configuration (Recommended)
Configure multiple providers for redundancy:
```bash
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,grok,ollama
OPENAI_API_KEY=your-openai-key
GROK_API_KEY=your-grok-key
OLLAMA_BASE_URL=http://ollama:11434
```

### SSL/HTTPS Configuration

For production with HTTPS:

1. **Obtain SSL certificates:**
   ```bash
   mkdir ssl
   # Copy your certificates to ssl/cert.pem and ssl/key.pem
   ```

2. **Update nginx configuration:**
   - Uncomment HTTPS server block in `nginx.prod.conf`
   - Update domain name and certificate paths

3. **Update environment:**
   ```bash
   HTTPS_PORT=443
   CORS_ORIGIN=https://your-domain.com
   ```

## Service Architecture

The application consists of 5 main services:

1. **PostgreSQL** (port 5432): Primary database
2. **Redis** (port 6379): Cache and session storage
3. **Backend** (port 3001): Node.js API server
4. **Frontend** (port 3000): React application
5. **NGINX** (port 80/443): Reverse proxy and load balancer

## Health Monitoring

### Health Check Script

Run comprehensive health checks:

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### LLM Provider Health Checks

Validate LLM provider configuration:

```bash
# Validate configuration
node scripts/validate-llm-config.js

# Check specific provider health
docker-compose -f docker-compose.prod.yml exec backend npm run validate-config

# Test Ollama specifically (if using)
docker exec news-map-ollama ollama list
curl http://localhost:11434/api/tags
```

### Individual Service Health

- **Overall**: http://localhost/health
- **Backend API**: http://localhost/api/health
- **Frontend**: http://localhost/
- **Database**: `docker exec news-map-postgres pg_isready`
- **Redis**: `docker exec news-map-redis redis-cli ping`

### Monitoring Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Error logs only
docker-compose -f docker-compose.prod.yml logs -f | grep ERROR
```

## Database Management

### Backup Database

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Backups are stored in `./backups/` directory and automatically compressed.

### Restore Database

```bash
chmod +x scripts/restore.sh
./scripts/restore.sh ./backups/news_map_backup_20240101_120000.sql.gz
```

### Manual Database Operations

```bash
# Connect to database
docker exec -it news-map-postgres psql -U news_map_user -d news_map_db

# Run migrations manually
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Reset database (development only)
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:rollback
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## Scaling and Performance

### Resource Limits

The production configuration includes resource limits:

- **Backend**: 512MB RAM limit, 256MB reserved
- **Frontend**: 128MB RAM limit, 64MB reserved
- **NGINX**: 128MB RAM limit, 64MB reserved

### Horizontal Scaling

To scale backend services:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

Update nginx upstream configuration to include multiple backend instances.

### Performance Optimization

1. **Database Indexing**: All necessary indexes are created automatically
2. **Redis Caching**: API responses and session data are cached
3. **NGINX Compression**: Gzip compression enabled for static assets
4. **CDN**: Consider using a CDN for static assets in production

## Security Considerations

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules (only expose ports 80, 443)
- [ ] Regular security updates for Docker images
- [ ] Monitor logs for suspicious activity
- [ ] Set up rate limiting (configured in nginx)
- [ ] Use non-root users in containers (implemented)

### Network Security

The application uses a custom Docker network (`news-map-network`) for service isolation.

### Data Security

- Passwords are hashed using bcrypt
- JWT tokens have configurable expiration
- Database connections use SSL in production
- Input validation and sanitization implemented

## Troubleshooting

### Common Issues

1. **Services not starting:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs
   
   # Restart services
   docker-compose -f docker-compose.prod.yml restart
   ```

2. **Database connection errors:**
   ```bash
   # Check database health
   docker exec news-map-postgres pg_isready -U news_map_user
   
   # Reset database connection
   docker-compose -f docker-compose.prod.yml restart backend
   ```

3. **API key errors:**
   - Verify API keys in `.env.production.local`
   - Check API key quotas and limits
   - Ensure API keys have necessary permissions

4. **LLM Provider issues:**
   ```bash
   # Check provider configuration
   node scripts/validate-llm-config.js
   
   # Test bias analysis endpoint
   curl -X POST http://localhost/api/news/test-bias \
     -H "Content-Type: application/json" \
     -d '{"content": "Test article content"}'
   
   # Check Ollama models (if using)
   docker exec news-map-ollama ollama list
   ```

4. **Memory issues:**
   ```bash
   # Check resource usage
   docker stats
   
   # Increase resource limits in docker-compose.prod.yml
   ```

### Debug Mode

Enable debug logging:

```bash
# Set in environment file
LOG_LEVEL=debug

# Restart services
docker-compose -f docker-compose.prod.yml restart backend
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

## Maintenance

### Regular Maintenance Tasks

1. **Daily:**
   - Monitor service health
   - Check log files for errors

2. **Weekly:**
   - Database backup
   - Update news data
   - Review resource usage

3. **Monthly:**
   - Update Docker images
   - Security patches
   - Performance review

### Updates and Upgrades

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Rebuild with latest code
docker-compose -f docker-compose.prod.yml build --no-cache

# Rolling update
docker-compose -f docker-compose.prod.yml up -d
```

## Additional Resources

### Configuration Guides
- **[LLM Provider Configuration Guide](LLM_PROVIDER_CONFIGURATION_GUIDE.md)**: Comprehensive guide for configuring OpenAI, Grok, and Ollama providers
- **[Security Hardening Guide](SECURITY_HARDENING.md)**: Security best practices and hardening procedures
- **[Test Documentation](TEST_DOCUMENTATION.md)**: Testing procedures and validation

### Setup Scripts
- **Ollama Model Setup**: 
  - Linux/Mac: `./scripts/setup-ollama-models.sh`
  - Windows: `./scripts/setup-ollama-models.ps1`
- **Configuration Validation**: `node scripts/validate-llm-config.js`

## Support

For issues and support:

1. Check this deployment guide and the LLM Provider Configuration Guide
2. Review application logs
3. Run health check script and configuration validation
4. Check GitHub issues
5. Contact development team

## License

This deployment configuration is part of the Interactive World News Map project and follows the same license terms.