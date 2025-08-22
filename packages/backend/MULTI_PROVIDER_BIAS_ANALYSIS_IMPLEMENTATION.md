# Multi-Provider Bias Analysis Implementation

## Overview

This document describes the implementation of multi-provider support for the bias analysis service, completing task 29 from the interactive world news map specification.

## Implementation Summary

### 1. Refactored Bias Analysis Service

**File**: `packages/backend/src/services/biasAnalysisService.ts`

**Key Changes**:
- Updated `analyzeArticle()` method to accept optional `preferredProvider` parameter
- Updated `analyzeAndStoreArticle()` method to support provider selection
- Updated `batchAnalyzeArticles()` method to support provider selection
- Enhanced cache key generation to be provider-specific
- Added new methods for provider management:
  - `getAvailableProviders()` - Get list of available LLM providers
  - `getProviderConfigurations()` - Get provider configuration details
  - `testProvider()` - Test individual provider with sample content
  - `clearProviderCache()` - Clear cache for specific provider
  - Enhanced `getCacheStats()` with provider breakdown

### 2. Enhanced Provider Fallback Manager

**File**: `packages/backend/src/services/llm/ProviderFallbackManager.ts`

**Key Changes**:
- Updated `analyzeWithFallback()` method to accept optional `preferredProvider` parameter
- Updated `getProviderChain()` method to prioritize preferred provider when specified
- Enhanced provider selection logic to respect user preferences while maintaining fallback capabilities

### 3. Provider-Specific Caching

**Implementation Details**:
- Cache keys now include provider information: `bias_analysis:{provider}:{content_hash}`
- Each provider's results are cached separately to avoid conflicts
- Cache statistics now include provider breakdown
- Individual provider caches can be cleared independently

### 4. New API Endpoints

**File**: `packages/backend/src/routes/news.ts`

**New Endpoints**:

#### Provider Management
- `GET /api/news/bias/providers` - Get available providers and configurations
- `POST /api/news/bias/providers/:provider/test` - Test specific provider
- `DELETE /api/news/bias/cache/:provider` - Clear provider-specific cache

#### Enhanced Analysis Endpoints
- `POST /api/news/bias/analyze/:id` - Now accepts `provider` in request body
- `POST /api/news/bias/analyze-batch` - Now accepts `provider` in request body
- `POST /api/news/bias/analyze-content` - New endpoint for analyzing arbitrary content

#### Provider Health and Status
- `GET /api/news/bias/providers/health` - Get provider health status (already existed)
- `GET /api/news/bias/providers/performance` - Get provider performance metrics (already existed)

### 5. Enhanced Response Format

All bias analysis endpoints now return enhanced results including:
```json
{
  "biasScore": 45,
  "biasAnalysis": {
    "politicalLean": "center",
    "factualAccuracy": 85,
    "emotionalTone": 60,
    "confidence": 90
  },
  "provider": "openai",
  "confidence": 90,
  "processingTime": 1500
}
```

### 6. Test Coverage

**New Test Files**:
- `packages/backend/src/services/__tests__/biasAnalysisService.integration.test.ts` - Integration tests for multi-provider functionality
- `packages/backend/src/routes/__tests__/news.bias.providers.test.ts` - API endpoint tests for provider management

## API Usage Examples

### Analyze Article with Preferred Provider
```bash
POST /api/news/bias/analyze/123
Content-Type: application/json

{
  "provider": "openai"
}
```

### Batch Analysis with Provider Selection
```bash
POST /api/news/bias/analyze-batch
Content-Type: application/json

{
  "articleIds": [1, 2, 3],
  "provider": "grok"
}
```

### Analyze Arbitrary Content
```bash
POST /api/news/bias/analyze-content
Content-Type: application/json

{
  "title": "Article Title",
  "content": "Article content...",
  "summary": "Article summary",
  "source": "News Source",
  "provider": "ollama"
}
```

### Test Provider
```bash
POST /api/news/bias/providers/openai/test
Content-Type: application/json

{
  "sampleRequest": {
    "title": "Test Article",
    "content": "Test content for analysis",
    "source": "Test Source"
  }
}
```

### Get Available Providers
```bash
GET /api/news/bias/providers
```

### Clear Provider Cache
```bash
DELETE /api/news/bias/cache/openai
```

## Configuration

The multi-provider system uses the existing environment variable configuration:

```bash
# Primary provider selection
BIAS_ANALYSIS_PROVIDER=openai|grok|ollama

# Provider-specific configurations
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

GROK_API_KEY=grok-...
GROK_MODEL=grok-beta

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2:7b

# Fallback configuration
BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama
```

## Benefits

1. **Provider Flexibility**: Users can choose their preferred LLM provider for bias analysis
2. **Cost Optimization**: Different providers have different pricing models
3. **Performance Optimization**: Users can select faster providers for time-sensitive analysis
4. **Reliability**: Fallback system ensures analysis continues even if preferred provider fails
5. **Provider-Specific Caching**: Avoids cache conflicts between different providers
6. **Comprehensive Monitoring**: Detailed health and performance metrics for each provider

## Requirements Satisfied

This implementation satisfies all requirements from task 29:

- ✅ **Refactor existing bias analysis service to use provider abstraction** - Service now uses the provider factory and fallback manager
- ✅ **Implement provider selection logic based on configuration** - Users can specify preferred providers via API
- ✅ **Add provider-specific caching with appropriate cache keys** - Cache keys include provider information
- ✅ **Update bias analysis endpoints to support provider selection** - All endpoints now accept provider parameter
- ✅ **Create provider status and health check endpoints** - Comprehensive provider management endpoints added

The implementation maintains backward compatibility while adding powerful new multi-provider capabilities that align with requirements 9.1, 9.4, and 9.6 from the specification.