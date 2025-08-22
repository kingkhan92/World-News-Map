# News Aggregation Service Implementation

This document describes the implementation of the news aggregation service for the Interactive World News Map application.

## Overview

The news aggregation service is responsible for:
- Fetching news from multiple sources (NewsAPI, Guardian, Reuters)
- Extracting geographic location data from article content
- Geocoding location names to coordinates
- Storing articles in the database
- Scheduling automatic news updates

## Components

### NewsAggregationService

The main service class that handles news fetching and processing.

#### Key Features:
- **Multi-source aggregation**: Fetches from NewsAPI, Guardian API, and Reuters
- **Location extraction**: Uses pattern matching to identify location names in article content
- **Geocoding**: Converts location names to coordinates using OpenCage API
- **Rate limiting**: Respects API rate limits to avoid being blocked
- **Error handling**: Graceful handling of API failures and network issues
- **Duplicate prevention**: Checks for existing articles before saving

#### Configuration:
Required environment variables:
- `NEWS_API_KEY`: API key for NewsAPI.org
- `GUARDIAN_API_KEY`: API key for Guardian API
- `OPENCAGE_API_KEY`: API key for OpenCage geocoding service

### NewsScheduler

Handles automatic scheduling of news aggregation tasks.

#### Key Features:
- **Cron-based scheduling**: Uses node-cron for flexible scheduling
- **Multiple schedules**: Separate schedules for news fetching and cleanup
- **Manual triggers**: Allows manual execution of scheduled tasks
- **Graceful shutdown**: Properly stops all scheduled tasks on application shutdown

#### Default Schedules:
- News aggregation: Every 30 minutes (`*/30 * * * *`)
- Cleanup (old articles): Daily at 2 AM UTC (`0 2 * * *`)

## API Endpoints

### News Refresh
- `POST /api/news/refresh`: Manually trigger news aggregation
- Returns statistics about fetched and saved articles

### Scheduler Management
- `GET /api/news/scheduler/status`: Get current scheduler status
- `POST /api/news/scheduler/run`: Manually run news aggregation
- `POST /api/news/scheduler/cleanup`: Manually run cleanup of old articles

## Location Extraction

The service uses pattern matching to identify location names in article titles and content:

### Supported Locations:
- Major countries and regions
- Major cities worldwide
- US states and cities
- European cities
- Asian cities

### Geocoding Process:
1. Extract potential location names using regex patterns
2. Try to geocode each location using OpenCage API
3. Use the first successfully geocoded location
4. Store coordinates and location name with the article

## Error Handling

The service implements comprehensive error handling:

### API Failures:
- Individual source failures don't stop the entire process
- Failed articles are logged but don't prevent other articles from being processed
- Network timeouts are handled gracefully

### Rate Limiting:
- Built-in delays between API calls
- Configurable rate limits for each service
- Automatic retry logic for temporary failures

### Database Errors:
- Batch processing with error isolation
- Duplicate detection to prevent constraint violations
- Transaction rollback on critical errors

## Testing

The implementation includes comprehensive tests:

### Unit Tests:
- `newsAggregationService.test.ts`: Tests for news fetching and processing
- `newsScheduler.test.ts`: Tests for scheduling functionality

### Test Coverage:
- API integration mocking
- Error scenario testing
- Rate limiting verification
- Database interaction testing

## Usage Examples

### Manual News Aggregation:
```typescript
import { NewsAggregationService } from './services/newsAggregationService.js';

const service = new NewsAggregationService();
const result = await service.aggregateAndSaveNews();
console.log(`Fetched ${result.total} articles, saved ${result.saved}`);
```

### Scheduler Management:
```typescript
import { getNewsScheduler } from './services/newsScheduler.js';

const scheduler = getNewsScheduler();
scheduler.start(); // Start with default schedules
scheduler.updateNewsSchedule('0 * * * *'); // Change to hourly
```

## Performance Considerations

### Optimization Strategies:
- Batch database operations to reduce connection overhead
- Implement connection pooling for external APIs
- Use caching for frequently accessed data
- Limit concurrent API requests to respect rate limits

### Monitoring:
- Comprehensive logging of all operations
- Performance metrics tracking
- Error rate monitoring
- API usage statistics

## Future Enhancements

### Planned Improvements:
- Additional news sources (BBC, CNN, etc.)
- Machine learning for better location extraction
- Real-time news streaming via WebSockets
- Advanced bias analysis integration
- Geographic clustering for better performance

### Scalability:
- Horizontal scaling with multiple worker processes
- Queue-based processing for high-volume scenarios
- Distributed caching with Redis
- Database sharding for large datasets

## Troubleshooting

### Common Issues:

1. **API Key Errors**:
   - Verify all required API keys are set in environment variables
   - Check API key validity and quotas

2. **Geocoding Failures**:
   - Monitor OpenCage API usage and limits
   - Implement fallback geocoding services

3. **Database Connection Issues**:
   - Verify database connection settings
   - Check database server availability

4. **Scheduler Not Running**:
   - Verify scheduler initialization in server startup
   - Check for cron expression validation errors

### Debugging:
- Enable debug logging with `LOG_LEVEL=debug`
- Monitor API response times and error rates
- Use database query logging for performance analysis