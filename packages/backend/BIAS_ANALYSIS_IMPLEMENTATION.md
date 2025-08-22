# Bias Analysis Service Implementation

## Overview

The Bias Analysis Service provides AI-powered bias detection and scoring for news articles. It integrates with external AI/ML APIs to analyze article content for political lean, factual accuracy, and emotional tone.

## Features

- **AI-Powered Analysis**: Integrates with external AI/ML APIs for sophisticated bias detection
- **Caching**: Redis-based caching to avoid redundant API calls and improve performance
- **Batch Processing**: Efficient batch analysis of multiple articles
- **Automatic Integration**: Seamlessly integrates with news aggregation workflow
- **Fallback Handling**: Graceful degradation when AI services are unavailable

## Configuration

### Environment Variables

```bash
# Bias Analysis API Configuration
BIAS_ANALYSIS_API_URL=https://api.example.com/bias-analysis
BIAS_ANALYSIS_API_KEY=your-api-key-here

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
```

### API Response Format

The external AI API should return responses in this format:

```json
{
  "political_lean": "left" | "center" | "right",
  "factual_accuracy": 85,
  "emotional_tone": 60,
  "confidence": 90,
  "bias_score": 45
}
```

## Usage

### Programmatic Usage

```typescript
import { BiasAnalysisService } from '../services/biasAnalysisService.js';

// Analyze a single article
const result = await BiasAnalysisService.analyzeAndStoreArticle(articleId);

// Batch analyze multiple articles
const articleIds = [1, 2, 3, 4, 5];
const results = await BiasAnalysisService.batchAnalyzeArticles(articleIds);

// Analyze recent articles automatically
await BiasAnalysisService.analyzeRecentArticles();

// Get articles that need analysis
const needingAnalysis = await BiasAnalysisService.getArticlesNeedingAnalysis(50);
```

### API Endpoints

#### Analyze Single Article
```http
POST /api/news/bias/analyze/:id
Authorization: Bearer <token>
```

#### Batch Analysis
```http
POST /api/news/bias/analyze-batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "articleIds": [1, 2, 3, 4, 5]
}
```

#### Analyze Recent Articles
```http
POST /api/news/bias/analyze-recent
Authorization: Bearer <token>
```

#### Get Articles Needing Analysis
```http
GET /api/news/bias/articles-needing-analysis?limit=50
Authorization: Bearer <token>
```

#### Cache Management
```http
# Clear cache
DELETE /api/news/bias/cache
Authorization: Bearer <token>

# Get cache statistics
GET /api/news/bias/cache/stats
Authorization: Bearer <token>
```

## Data Model

### BiasAnalysis Interface

```typescript
interface BiasAnalysis {
  politicalLean: 'left' | 'center' | 'right';
  factualAccuracy: number;    // 0-100 scale
  emotionalTone: number;      // 0-100 scale
  confidence: number;         // 0-100 scale
}
```

### Database Storage

Bias analysis results are stored in the `articles` table:

- `bias_score`: Integer (0-100) representing overall bias score
- `bias_analysis`: JSONB field containing detailed analysis

## Integration with News Aggregation

The bias analysis service automatically integrates with the news aggregation workflow:

1. **Automatic Analysis**: New articles are automatically queued for bias analysis
2. **Batch Processing**: Articles are processed in batches to respect API rate limits
3. **Error Handling**: Failed analyses don't block the news aggregation process
4. **Caching**: Results are cached to avoid redundant API calls

## Performance Considerations

### Caching Strategy

- **Cache Duration**: 7 days for bias analysis results
- **Cache Key**: Based on article content hash
- **Cache Storage**: Redis for fast access
- **Cache Invalidation**: Manual clearing via API endpoint

### Rate Limiting

- **Batch Size**: Maximum 5 articles processed simultaneously
- **Batch Delay**: 1 second delay between batches
- **API Timeout**: 30 second timeout for AI API calls
- **Retry Logic**: Fallback to neutral analysis on API failures

### Error Handling

- **API Failures**: Returns neutral bias analysis (score: 50, confidence: 0)
- **Network Issues**: Graceful degradation with logging
- **Invalid Responses**: Validation and fallback handling
- **Rate Limits**: Automatic retry with exponential backoff

## Monitoring and Logging

### Key Metrics

- Analysis success/failure rates
- API response times
- Cache hit/miss ratios
- Batch processing throughput

### Log Events

- Analysis requests and completions
- API failures and fallbacks
- Cache operations
- Batch processing progress

## Testing

### Unit Tests

```bash
npm test -- biasAnalysisService.test.ts
```

### Integration Tests

The service includes comprehensive tests covering:

- AI API integration
- Caching mechanisms
- Batch processing
- Error handling
- Database integration

## Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Ensure `BIAS_ANALYSIS_API_KEY` environment variable is set
   - Check API key validity with the provider

2. **Redis Connection Issues**
   - Verify Redis server is running
   - Check `REDIS_URL` configuration
   - Service degrades gracefully without Redis

3. **AI API Timeouts**
   - Check network connectivity
   - Verify API endpoint URL
   - Monitor API provider status

4. **High Memory Usage**
   - Monitor Redis cache size
   - Clear cache periodically if needed
   - Adjust cache expiration settings

### Performance Optimization

1. **Batch Size Tuning**
   - Adjust batch size based on API rate limits
   - Monitor processing throughput
   - Balance speed vs. API costs

2. **Cache Optimization**
   - Monitor cache hit rates
   - Adjust cache expiration based on usage patterns
   - Consider cache warming strategies

3. **Database Optimization**
   - Ensure proper indexing on bias_score column
   - Monitor query performance
   - Consider partitioning for large datasets

## Future Enhancements

- **Multiple AI Providers**: Support for multiple bias analysis APIs
- **Custom Models**: Integration with custom-trained bias detection models
- **Real-time Analysis**: WebSocket-based real-time bias analysis
- **Historical Tracking**: Track bias score changes over time
- **Comparative Analysis**: Compare bias across different sources for same events