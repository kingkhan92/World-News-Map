# LLM Providers

This directory contains implementations of different LLM providers for bias analysis.

## OpenAI Provider

The OpenAI provider integrates with OpenAI's GPT models for bias analysis.

### Configuration

```typescript
const config = {
  apiKey: 'sk-your-openai-api-key',
  model: 'gpt-3.5-turbo',
  timeout: 30000,
  maxRetries: 3,
  temperature: 0.3,
  maxTokens: 500
};
```

### Usage

```typescript
import { OpenAIProvider } from './providers/OpenAIProvider.js';

const provider = new OpenAIProvider(config);
await provider.initialize();

const result = await provider.analyzeArticle({
  title: 'Article Title',
  content: 'Article content...',
  summary: 'Optional summary',
  source: 'Optional source'
});

console.log(result.biasScore); // 0-100 bias score
console.log(result.biasAnalysis); // Detailed analysis
```

### Features

- **Structured Prompts**: Uses consistent prompts for bias analysis
- **Response Validation**: Validates and normalizes API responses
- **Error Handling**: Comprehensive error categorization and retry logic
- **Rate Limiting**: Handles OpenAI rate limits with exponential backoff
- **Health Checks**: Monitors provider availability

### Supported Models

- gpt-3.5-turbo
- gpt-3.5-turbo-16k
- gpt-4
- gpt-4-32k
- gpt-4-turbo-preview
- gpt-4-1106-preview

### Error Types

- `AUTHENTICATION_ERROR`: Invalid API key
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `MODEL_ERROR`: Model-specific errors
- `NETWORK_ERROR`: Network connectivity issues
- `TIMEOUT_ERROR`: Request timeout
- `INVALID_RESPONSE`: Malformed API response

### Environment Variables

```bash
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
```