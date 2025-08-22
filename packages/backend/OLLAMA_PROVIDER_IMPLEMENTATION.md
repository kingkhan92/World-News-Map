# Ollama Provider Implementation

This document describes the implementation of the Ollama provider for local LLM-based bias analysis in the News Map application.

## Overview

The Ollama provider enables the use of local Large Language Models (LLMs) for bias analysis, providing a privacy-focused alternative to cloud-based APIs like OpenAI and Grok. This implementation supports multiple Ollama models and includes automatic model management, health monitoring, and optimized prompts for local model performance.

## Features

### Core Functionality
- **Local LLM Integration**: Connects to local Ollama instances for bias analysis
- **Multi-Model Support**: Supports various models (Llama 2, Llama 3, Mistral, Phi, etc.)
- **Automatic Model Management**: Automatically pulls models if not available locally
- **Health Monitoring**: Comprehensive health checks for server and model availability
- **Optimized Prompts**: Model-specific prompts optimized for local performance

### Provider Capabilities
- **JSON and Text Parsing**: Handles both structured JSON and text-based responses
- **Model Capability Detection**: Automatically detects model capabilities (JSON support, context length)
- **Graceful Error Handling**: Comprehensive error handling with proper error types
- **Performance Optimization**: Optimized for local model constraints and performance

## Architecture

### Class Structure

```typescript
export class OllamaProvider extends BaseLLMProvider {
  public readonly name = 'Ollama';
  public readonly type = 'ollama' as const;
  
  private client: AxiosInstance;
  private ollamaConfig: OllamaConfig;
  private availableModels: Set<string>;
  private modelCapabilities: Map<string, ModelCapability>;
}
```

### Configuration Interface

```typescript
interface OllamaConfig extends ProviderConfig {
  baseUrl: string;           // Ollama server URL
  model: string;             // Model name to use
  temperature?: number;      // Sampling temperature (0-2)
  numPredict?: number;       // Max tokens to generate
  topK?: number;            // Top-K sampling
  topP?: number;            // Top-P sampling
  keepAlive?: string;       // Model keep-alive duration
}
```

## Implementation Details

### Initialization Process

1. **Configuration Validation**: Validates Ollama-specific configuration
2. **Server Health Check**: Verifies Ollama server is running and accessible
3. **Model Discovery**: Loads list of available models from Ollama
4. **Model Availability**: Ensures configured model is available, pulls if necessary
5. **Model Testing**: Performs a test request to verify model functionality

### Bias Analysis Process

1. **Request Validation**: Validates input article data
2. **Prompt Generation**: Creates model-specific prompts based on capabilities
3. **API Request**: Makes request to Ollama chat API with retry logic
4. **Response Parsing**: Parses JSON or structured text responses
5. **Result Normalization**: Normalizes scores and validates response structure

### Model Capability Management

The provider maintains a mapping of known models and their capabilities:

```typescript
private initializeModelCapabilities(): void {
  const capabilities = new Map([
    // Llama models
    ['llama2:7b', { supportsJson: false, contextLength: 4096 }],
    ['llama3:8b', { supportsJson: true, contextLength: 8192 }],
    
    // Mistral models
    ['mistral:7b', { supportsJson: true, contextLength: 8192 }],
    ['mixtral:8x7b', { supportsJson: true, contextLength: 32768 }],
    
    // Other models...
  ]);
}
```

### Prompt Optimization

The provider generates different prompts based on model capabilities:

#### JSON-Capable Models
```typescript
// Structured JSON prompt for models that support JSON mode
const jsonPrompt = `You are an expert media analyst. Analyze the following news article for bias and respond with valid JSON only.

Article Title: ${request.title}
Article Content: ${request.content}

Analyze this article and provide a JSON response with these exact fields:
{
  "political_lean": "left|center|right",
  "factual_accuracy": number (0-100),
  "emotional_tone": number (0-100),
  "confidence": number (0-100),
  "bias_score": number (0-100)
}

Respond with only the JSON object, no additional text.`;
```

#### Text-Based Models
```typescript
// Structured text prompt for models without JSON support
const textPrompt = `You are an expert media analyst. Analyze this news article for bias.

Article Title: ${request.title}
Article Content: ${request.content}

Please analyze this article and provide:

1. Political lean: left, center, or right
2. Factual accuracy: score from 0-100
3. Emotional tone: score from 0-100
4. Confidence: your confidence in this analysis from 0-100
5. Bias score: overall bias from 0-100

Format your response as:
POLITICAL_LEAN: [left|center|right]
FACTUAL_ACCURACY: [0-100]
EMOTIONAL_TONE: [0-100]
CONFIDENCE: [0-100]
BIAS_SCORE: [0-100]`;
```

## Configuration

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434    # Ollama server URL
OLLAMA_MODEL=llama2:7b                    # Model to use
OLLAMA_TIMEOUT=60000                      # Request timeout (ms)
OLLAMA_MAX_RETRIES=2                      # Max retry attempts
OLLAMA_RATE_LIMIT=30                      # Requests per minute

# Provider Selection
BIAS_ANALYSIS_PROVIDER=ollama             # Use Ollama as primary
# OR
BIAS_ANALYSIS_PROVIDER=openai             # Use as fallback
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama
```

### Docker Compose Integration

The Ollama service is included in Docker Compose with an optional profile:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: news-map-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - news-map-network
    environment:
      - OLLAMA_HOST=0.0.0.0
    profiles:
      - ollama  # Optional service
```

To start with Ollama:
```bash
docker-compose --profile ollama up -d
```

## Model Recommendations

### For Development/Testing
- **phi3:3.8b**: Very fast, small model, good for testing
- **llama2:7b**: Default choice, good balance of speed and quality

### For Production
- **llama3:8b**: Better quality analysis, moderate speed
- **mistral:7b**: Fast and efficient, good quality
- **mixtral:8x7b**: High quality, requires more resources

### Model Selection Criteria
- **Speed**: phi3 > llama2 > mistral > llama3 > mixtral
- **Quality**: mixtral > llama3 > mistral > llama2 > phi3
- **Resource Usage**: phi3 < llama2 < mistral < llama3 < mixtral

## Setup and Usage

### Automatic Setup

Use the provided setup scripts:

```bash
# Linux/macOS
./scripts/setup-ollama.sh

# Windows PowerShell
.\scripts\setup-ollama.ps1

# With specific model
./scripts/setup-ollama.sh llama3:8b
```

### Manual Setup

1. **Start Ollama Service**:
   ```bash
   docker-compose --profile ollama up -d ollama
   ```

2. **Pull a Model**:
   ```bash
   curl -X POST http://localhost:11434/api/pull \
     -H "Content-Type: application/json" \
     -d '{"name": "llama2:7b"}'
   ```

3. **Configure Environment**:
   ```bash
   BIAS_ANALYSIS_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2:7b
   ```

4. **Test Configuration**:
   ```bash
   curl -X POST http://localhost:11434/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "model": "llama2:7b",
       "messages": [{"role": "user", "content": "Hello"}],
       "stream": false
     }'
   ```

## Error Handling

### Common Error Types

1. **Connection Errors**: Ollama server not running
2. **Model Errors**: Model not available or failed to load
3. **Timeout Errors**: Request took too long (common with large models)
4. **Parse Errors**: Model response couldn't be parsed
5. **Configuration Errors**: Invalid configuration parameters

### Error Recovery

- **Automatic Retries**: Server errors are retried with exponential backoff
- **Model Pulling**: Missing models are automatically pulled
- **Graceful Degradation**: Falls back to other providers if configured
- **Health Monitoring**: Continuous health checks detect issues early

## Performance Considerations

### Optimization Strategies

1. **Model Selection**: Choose appropriate model size for your hardware
2. **Keep-Alive**: Configure model keep-alive to avoid reload delays
3. **Concurrent Requests**: Limit concurrent requests based on hardware
4. **Content Truncation**: Truncate very long articles to fit context limits
5. **Caching**: Cache results to avoid repeated analysis

### Hardware Requirements

- **Minimum**: 8GB RAM, 4 CPU cores
- **Recommended**: 16GB RAM, 8 CPU cores
- **GPU Support**: NVIDIA GPU with CUDA for faster inference
- **Storage**: 5-50GB depending on model sizes

### Performance Benchmarks

Typical analysis times on recommended hardware:

- **phi3:3.8b**: 2-5 seconds
- **llama2:7b**: 5-15 seconds
- **llama3:8b**: 10-25 seconds
- **mistral:7b**: 8-20 seconds
- **mixtral:8x7b**: 20-60 seconds

## Testing

### Unit Tests

```bash
npm test -- OllamaProvider.test.ts
```

### Integration Tests

Requires running Ollama instance:

```bash
OLLAMA_INTEGRATION_TESTS=true npm test -- OllamaProvider.integration.test.ts
```

### Test Coverage

- Configuration validation
- Initialization process
- Health checks
- Bias analysis with various response formats
- Error handling scenarios
- Model capability detection
- Concurrent request handling

## Monitoring and Debugging

### Health Checks

The provider includes comprehensive health monitoring:

```typescript
public async checkHealth(): Promise<ProviderHealth> {
  // Check server availability
  // Verify model availability
  // Test model response
  // Return health status
}
```

### Logging

Detailed logging at various levels:

- **Debug**: Request/response details, timing information
- **Info**: Initialization, model changes, successful operations
- **Warn**: Retries, fallbacks, configuration issues
- **Error**: Failures, exceptions, critical issues

### Debugging Tips

1. **Check Ollama Logs**: `docker-compose logs ollama`
2. **Verify Model**: `curl http://localhost:11434/api/tags`
3. **Test Model**: Use the test endpoints in integration tests
4. **Monitor Resources**: Check CPU/memory usage during analysis
5. **Enable Debug Logging**: Set `LOG_LEVEL=debug`

## Security Considerations

### Privacy Benefits

- **Local Processing**: All analysis happens locally, no data sent to external APIs
- **No API Keys**: No need for external API keys or accounts
- **Data Control**: Complete control over data processing and storage

### Security Measures

- **Network Isolation**: Ollama can run in isolated Docker network
- **Access Control**: Limit access to Ollama API endpoints
- **Resource Limits**: Configure Docker resource limits
- **Model Verification**: Verify model integrity and sources

## Future Enhancements

### Planned Features

1. **GPU Support**: Automatic GPU detection and utilization
2. **Model Auto-Selection**: Automatic model selection based on hardware
3. **Batch Processing**: Batch multiple articles for efficiency
4. **Custom Models**: Support for custom fine-tuned models
5. **Performance Metrics**: Detailed performance monitoring and optimization

### Integration Improvements

1. **Model Management UI**: Web interface for model management
2. **Real-time Monitoring**: Live performance and health dashboards
3. **A/B Testing**: Compare results across different models
4. **Quality Metrics**: Track analysis quality and consistency

## Troubleshooting

### Common Issues

1. **"Ollama server is not running"**
   - Start Ollama: `docker-compose --profile ollama up -d ollama`
   - Check port: `curl http://localhost:11434/api/tags`

2. **"Model not found"**
   - Pull model: `./scripts/setup-ollama.sh <model-name>`
   - Check available models: `curl http://localhost:11434/api/tags`

3. **"Request timeout"**
   - Increase timeout: `OLLAMA_TIMEOUT=120000`
   - Use smaller model: `OLLAMA_MODEL=phi3:3.8b`

4. **"Out of memory"**
   - Use smaller model
   - Increase Docker memory limits
   - Reduce concurrent requests

5. **"Invalid response format"**
   - Check model compatibility
   - Enable debug logging
   - Try different model

### Support Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [Model Library](https://ollama.ai/library)
- [Docker Compose Guide](https://docs.docker.com/compose/)
- [Project Issues](https://github.com/your-repo/issues)

## Conclusion

The Ollama provider implementation provides a robust, privacy-focused solution for local LLM-based bias analysis. It offers comprehensive model support, automatic management, and production-ready features while maintaining the flexibility to work with various hardware configurations and deployment scenarios.

The implementation follows the established provider pattern, ensuring consistency with other LLM providers while optimizing for the unique characteristics of local model deployment.