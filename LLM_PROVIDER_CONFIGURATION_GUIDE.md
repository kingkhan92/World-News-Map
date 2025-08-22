# LLM Provider Configuration Guide

This guide provides comprehensive instructions for configuring and optimizing LLM providers for bias analysis in the Interactive World News Map application.

## Overview

The application supports three types of LLM providers:

1. **OpenAI API** - Cloud-based, high-quality analysis
2. **Grok API** - xAI's cloud service with competitive performance
3. **Ollama** - Local/self-hosted models for privacy and cost control

## Provider Selection Strategy

### Recommended Configurations

#### Production (High Volume)
```bash
# Primary: OpenAI for quality, Ollama for cost efficiency
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-3.5-turbo
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2:13b
```

#### Development/Testing
```bash
# Local-first for development
BIAS_ANALYSIS_PROVIDER=ollama
BIAS_ANALYSIS_FALLBACK_PROVIDERS=ollama,openai
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2:7b
OPENAI_API_KEY=sk-your-key
```

#### Privacy-Focused
```bash
# Ollama-only for complete data privacy
BIAS_ANALYSIS_PROVIDER=ollama
BIAS_ANALYSIS_FALLBACK_PROVIDERS=ollama
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2:13b
LLM_SKIP_HEALTH_CHECK=false
```

#### Cost-Optimized
```bash
# Grok primary, Ollama fallback
BIAS_ANALYSIS_PROVIDER=grok
BIAS_ANALYSIS_FALLBACK_PROVIDERS=grok,ollama
GROK_API_KEY=your-grok-key
GROK_MODEL=grok-beta
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=mistral:7b
```

## Provider-Specific Configuration

### OpenAI Configuration

#### Basic Setup
```bash
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
OPENAI_RATE_LIMIT=60
```

#### Model Selection
- **gpt-3.5-turbo**: Fast, cost-effective, good for high volume
- **gpt-4**: Higher quality analysis, more expensive
- **gpt-4-turbo**: Balance of speed and quality

#### Cost Optimization
```bash
# Reduce timeout for faster failover
OPENAI_TIMEOUT=15000
# Lower rate limit to control costs
OPENAI_RATE_LIMIT=30
# Use cheaper model for development
OPENAI_MODEL=gpt-3.5-turbo
```

#### Enterprise Setup
```bash
# Use Azure OpenAI for enterprise
OPENAI_BASE_URL=https://your-resource.openai.azure.com/
OPENAI_API_KEY=your-azure-key
OPENAI_MODEL=gpt-35-turbo  # Azure naming convention
```

### Grok Configuration

#### Basic Setup
```bash
GROK_API_KEY=your-grok-api-key
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1
GROK_TIMEOUT=30000
GROK_MAX_RETRIES=3
GROK_RATE_LIMIT=60
```

#### Performance Tuning
```bash
# Increase timeout for complex analysis
GROK_TIMEOUT=45000
# Adjust rate limiting based on your plan
GROK_RATE_LIMIT=100
```

### Ollama Configuration

#### Basic Setup
```bash
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2:7b
OLLAMA_TIMEOUT=60000
OLLAMA_MAX_RETRIES=2
OLLAMA_RATE_LIMIT=30
```

#### Model Recommendations

##### For Development (Low Resource)
```bash
OLLAMA_MODEL=llama2:7b        # 4GB RAM
# or
OLLAMA_MODEL=mistral:7b       # 4GB RAM, faster
```

##### For Production (Better Quality)
```bash
OLLAMA_MODEL=llama2:13b       # 8GB RAM
# or
OLLAMA_MODEL=codellama:13b    # 8GB RAM, good reasoning
```

##### For High-End Hardware
```bash
OLLAMA_MODEL=llama2:70b       # 40GB RAM, best quality
# or
OLLAMA_MODEL=mixtral:8x7b     # 26GB RAM, excellent performance
```

#### Performance Optimization

##### GPU Configuration
```yaml
# docker-compose.yml
ollama:
  image: ollama/ollama:latest
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

##### CPU-Only Optimization
```bash
# Increase timeout for CPU inference
OLLAMA_TIMEOUT=120000
# Reduce concurrent requests
OLLAMA_RATE_LIMIT=10
```

##### Memory Management
```bash
# Set Ollama memory limits
OLLAMA_NUM_PARALLEL=2
OLLAMA_MAX_LOADED_MODELS=1
```

## Multi-Provider Strategies

### Failover Configuration

#### Quality-First Failover
```bash
BIAS_ANALYSIS_PROVIDER=gpt-4
BIAS_ANALYSIS_FALLBACK_PROVIDERS=gpt-4,gpt-3.5-turbo,ollama
```

#### Cost-First Failover
```bash
BIAS_ANALYSIS_PROVIDER=ollama
BIAS_ANALYSIS_FALLBACK_PROVIDERS=ollama,grok,openai
```

#### Speed-First Failover
```bash
BIAS_ANALYSIS_PROVIDER=gpt-3.5-turbo
BIAS_ANALYSIS_FALLBACK_PROVIDERS=gpt-3.5-turbo,grok,ollama
```

### Load Balancing

#### Round-Robin (Future Enhancement)
```bash
# Not yet implemented - planned feature
BIAS_ANALYSIS_STRATEGY=round_robin
BIAS_ANALYSIS_PROVIDERS=openai,grok,ollama
```

## Environment-Specific Configurations

### Development Environment
```bash
# .env.development
BIAS_ANALYSIS_PROVIDER=ollama
BIAS_ANALYSIS_FALLBACK_PROVIDERS=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2:7b
LLM_HEALTH_CHECK_INTERVAL=60000
LLM_ENABLE_FAILOVER=true
LLM_SKIP_HEALTH_CHECK=false
```

### Staging Environment
```bash
# .env.staging
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama
OPENAI_API_KEY=sk-staging-key
OPENAI_MODEL=gpt-3.5-turbo
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2:13b
LLM_HEALTH_CHECK_INTERVAL=300000
```

### Production Environment
```bash
# .env.production
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,grok,ollama
OPENAI_API_KEY=sk-production-key
OPENAI_MODEL=gpt-4
GROK_API_KEY=production-grok-key
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama2:70b
LLM_HEALTH_CHECK_INTERVAL=300000
LLM_ENABLE_FAILOVER=true
```

## Best Practices

### Security

#### API Key Management
```bash
# Use different keys for different environments
OPENAI_API_KEY_DEV=sk-dev-key
OPENAI_API_KEY_PROD=sk-prod-key

# Rotate keys regularly
# Set up key rotation schedule in your CI/CD
```

#### Network Security
```bash
# Restrict Ollama access
OLLAMA_HOST=127.0.0.1  # Local only
# or
OLLAMA_HOST=0.0.0.0    # Docker network only
```

### Performance

#### Caching Strategy
```bash
# Enable aggressive caching for repeated content
BIAS_ANALYSIS_CACHE_TTL=86400  # 24 hours
REDIS_CACHE_PREFIX=bias_analysis_
```

#### Timeout Configuration
```bash
# Set appropriate timeouts based on provider
OPENAI_TIMEOUT=30000    # 30 seconds
GROK_TIMEOUT=30000      # 30 seconds  
OLLAMA_TIMEOUT=120000   # 2 minutes (CPU inference)
```

#### Rate Limiting
```bash
# Configure based on your API limits
OPENAI_RATE_LIMIT=60    # requests per minute
GROK_RATE_LIMIT=100     # requests per minute
OLLAMA_RATE_LIMIT=30    # requests per minute
```

### Monitoring

#### Health Check Configuration
```bash
# Regular health checks
LLM_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
LLM_ENABLE_FAILOVER=true

# Skip health checks in development
LLM_SKIP_HEALTH_CHECK=true  # Development only
```

#### Logging
```bash
# Enable detailed logging
LOG_LEVEL=debug
LLM_LOG_REQUESTS=true
LLM_LOG_RESPONSES=false  # Don't log response content
```

### Cost Management

#### Budget Controls
```bash
# Set conservative rate limits
OPENAI_RATE_LIMIT=30
GROK_RATE_LIMIT=30

# Use cheaper models for bulk processing
OPENAI_MODEL=gpt-3.5-turbo
```

#### Usage Optimization
```bash
# Prefer local models for development
BIAS_ANALYSIS_PROVIDER=ollama  # Development
BIAS_ANALYSIS_PROVIDER=openai  # Production only
```

## Troubleshooting

### Common Issues

#### Provider Not Available
```bash
# Check provider health
node scripts/validate-llm-config.js

# Test specific provider
curl -X POST http://localhost:3001/api/bias/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "content": "test"}'
```

#### Slow Response Times
```bash
# Check timeout settings
echo $OLLAMA_TIMEOUT
echo $OPENAI_TIMEOUT

# Monitor provider performance
docker-compose logs -f backend | grep "bias_analysis"
```

#### High Costs
```bash
# Review rate limits
echo $OPENAI_RATE_LIMIT
echo $GROK_RATE_LIMIT

# Check usage patterns
grep "bias_analysis" logs/backend.log | tail -100
```

### Debugging Commands

#### Configuration Validation
```bash
# Validate all providers
node scripts/validate-llm-config.js

# Test specific configuration
BIAS_ANALYSIS_PROVIDER=ollama node scripts/validate-llm-config.js
```

#### Provider Testing
```bash
# Test OpenAI
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Test Grok
curl -H "Authorization: Bearer $GROK_API_KEY" \
  https://api.x.ai/v1/models

# Test Ollama
curl http://localhost:11434/api/tags
```

## Migration Guide

### From Single Provider to Multi-Provider

#### Step 1: Add Fallback Configuration
```bash
# Current
BIAS_ANALYSIS_PROVIDER=openai

# New
BIAS_ANALYSIS_PROVIDER=openai
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama
```

#### Step 2: Deploy Ollama
```bash
docker-compose -f docker-compose.prod.yml --profile ollama up -d
docker exec news-map-ollama ollama pull llama2:7b
```

#### Step 3: Test Configuration
```bash
node scripts/validate-llm-config.js
```

### From Cloud to Local

#### Step 1: Deploy Ollama
```bash
docker-compose -f docker-compose.prod.yml --profile ollama up -d
```

#### Step 2: Pull Models
```bash
docker exec news-map-ollama ollama pull llama2:13b
```

#### Step 3: Update Configuration
```bash
BIAS_ANALYSIS_PROVIDER=ollama
BIAS_ANALYSIS_FALLBACK_PROVIDERS=ollama,openai
```

## Support and Resources

### Documentation
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Grok API Documentation](https://docs.x.ai/)
- [Ollama Documentation](https://ollama.ai/docs)

### Community
- [Ollama GitHub](https://github.com/ollama/ollama)
- [OpenAI Community](https://community.openai.com/)

### Monitoring Tools
- Provider health dashboard: http://localhost/admin/providers
- Configuration validator: `node scripts/validate-llm-config.js`
- Health check script: `./scripts/health-check.sh`