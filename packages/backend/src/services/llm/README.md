# LLM Provider Abstraction Layer

This directory contains the LLM provider abstraction layer implementation for the Interactive World News Map project. The abstraction layer provides a consistent interface for bias analysis across multiple LLM providers.

## Overview

The LLM provider abstraction layer allows the application to use different LLM providers (OpenAI, Grok, Ollama) for bias analysis while maintaining a consistent interface. It includes provider factory patterns, health monitoring, configuration management, and fallback mechanisms.

## Architecture

### Core Components

1. **Types and Interfaces** (`types/llmProvider.ts`)
   - `LLMProvider` interface - Base interface for all providers
   - `ProviderConfig` - Configuration structure for providers
   - `BiasAnalysisRequest/Result` - Request/response types
   - `ProviderHealth` - Health status tracking
   - `ProviderError` - Custom error handling

2. **Base Provider** (`BaseLLMProvider.ts`)
   - Abstract base class implementing common functionality
   - Consistent bias analysis prompt generation
   - Error handling and validation
   - Health check management
   - Initialization and cleanup lifecycle

3. **Provider Factory** (`ProviderFactory.ts`)
   - Singleton factory for creating and managing providers
   - Dynamic provider selection based on configuration
   - Automatic failover between providers
   - Health-based provider selection

4. **Configuration Manager** (`ProviderConfigManager.ts`)
   - Environment variable parsing and validation
   - Provider configuration management
   - Runtime configuration updates
   - Configuration validation

5. **Health Monitor** (`ProviderHealthMonitor.ts`)
   - Continuous health monitoring of all providers
   - Performance metrics tracking
   - Redis-based caching of health status
   - System health summaries

## Provider Implementations

### Current Status

- **OpenAI Provider** (`OpenAIProvider.ts`) - Placeholder (Task 25)
- **Grok Provider** (`GrokProvider.ts`) - Placeholder (Task 26)  
- **Ollama Provider** (`OllamaProvider.ts`) - Placeholder (Task 27)

Each provider will implement the `LLMProvider` interface and extend `BaseLLMProvider` for consistent behavior.

## Configuration

The system is configured through environment variables:

### Primary Provider Selection
```bash
BIAS_ANALYSIS_PROVIDER=openai|grok|ollama
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,grok,ollama
```

### OpenAI Configuration
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
OPENAI_RATE_LIMIT=60
```

### Grok Configuration
```bash
GROK_API_KEY=grok-...
GROK_MODEL=grok-beta
GROK_BASE_URL=https://api.x.ai/v1
GROK_TIMEOUT=30000
GROK_MAX_RETRIES=3
GROK_RATE_LIMIT=60
```

### Ollama Configuration
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2:7b
OLLAMA_TIMEOUT=60000
OLLAMA_MAX_RETRIES=2
OLLAMA_RATE_LIMIT=30
```

### System Configuration
```bash
LLM_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
LLM_ENABLE_FAILOVER=true
```

## Usage

### Basic Usage

```typescript
import { initializeLLMSystem } from './services/llm/index.js';

// Initialize the LLM system
const { factory, configManager, healthMonitor } = await initializeLLMSystem();

// Get the best available provider
const provider = await factory.getBestProvider();

// Analyze article for bias
const result = await provider.analyzeArticle({
  title: "Article Title",
  content: "Article content...",
  summary: "Article summary",
  source: "News Source"
});

console.log(`Bias Score: ${result.biasScore}`);
console.log(`Political Lean: ${result.biasAnalysis.politicalLean}`);
```

### Advanced Usage

```typescript
// Get specific provider
const openaiProvider = factory.getProvider('openai');

// Check provider health
const health = await provider.checkHealth();
console.log(`Provider available: ${health.available}`);

// Get system health summary
const summary = await healthMonitor.getSystemHealthSummary();
console.log(`Healthy providers: ${summary.healthyProviders}/${summary.totalProviders}`);

// Update configuration
configManager.setPrimaryProvider('grok');
configManager.setFallbackProviders(['openai', 'ollama']);
```

## Error Handling

The system includes comprehensive error handling:

- **ProviderError** - Custom error class with error types
- **Graceful Fallback** - Automatic failover to backup providers
- **Health Monitoring** - Continuous provider health checks
- **Configuration Validation** - Startup and runtime validation

## Testing

The abstraction layer includes comprehensive tests:

```bash
# Run LLM provider tests
npm test src/services/llm/__tests__/

# Run specific test file
npm test src/services/llm/__tests__/ProviderFactory.test.ts
```

## Next Steps

The following tasks will complete the LLM provider implementation:

1. **Task 25** - Implement OpenAI provider with GPT integration
2. **Task 26** - Implement Grok API provider 
3. **Task 27** - Implement Ollama local provider
4. **Task 28** - Add provider fallback and error handling
5. **Task 29** - Update bias analysis service to use multi-provider support
6. **Task 30** - Add deployment configuration for LLM providers

## Files Created

- `types/llmProvider.ts` - Core interfaces and types
- `services/llm/BaseLLMProvider.ts` - Abstract base provider class
- `services/llm/ProviderFactory.ts` - Provider factory and management
- `services/llm/ProviderConfigManager.ts` - Configuration management
- `services/llm/ProviderHealthMonitor.ts` - Health monitoring service
- `services/llm/OpenAIProvider.ts` - OpenAI provider placeholder
- `services/llm/GrokProvider.ts` - Grok provider placeholder
- `services/llm/OllamaProvider.ts` - Ollama provider placeholder
- `services/llm/index.ts` - Main exports and initialization
- `services/llm/__tests__/ProviderFactory.test.ts` - Comprehensive tests

## Requirements Satisfied

This implementation satisfies the following requirements from task 24:

✅ Create base LLMProvider interface and abstract class  
✅ Implement provider factory pattern for dynamic provider selection  
✅ Add provider configuration management with environment variables  
✅ Create provider health check and availability monitoring  
✅ Implement consistent bias analysis prompt templates across providers  

The abstraction layer is now ready for the individual provider implementations in the subsequent tasks.