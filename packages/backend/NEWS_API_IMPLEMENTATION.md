# News API Implementation

## Overview

The News API endpoints have been fully implemented to support the Interactive World News Map application. All endpoints provide comprehensive functionality for retrieving, filtering, and managing news articles with geographic and temporal context.

## Implemented Endpoints

### Core Article Endpoints

#### GET /api/news/articles
**Purpose**: Retrieve articles with comprehensive filtering and pagination

**Query Parameters**:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of articles per page (default: 20, max: 100)
- `startDate` (optional): Filter articles from this date (ISO 8601 format)
- `endDate` (optional): Filter articles until this date (ISO 8601 format)
- `lat` (optional): Latitude for geographic filtering (-90 to 90)
- `lng` (optional): Longitude for geographic filtering (-180 to 180)
- `radius` (optional): Radius in kilometers for geographic filtering (1 to 20000)
- `source` (optional): Filter by news source
- `biasScoreMin` (optional): Minimum bias score (0 to 100)
- `biasScoreMax` (optional): Maximum bias score (0 to 100)
- `keyword` (optional): Search in title, summary, and content

**Response**:
```json
{
  "articles": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {...}
}
```

#### GET /api/news/article/:id
**Purpose**: Retrieve detailed information for a specific article

**Parameters**:
- `id`: Article ID (integer)

**Response**:
```json
{
  "article": {
    "id": 1,
    "title": "Article Title",
    "content": "Full article content...",
    "summary": "Article summary",
    "url": "https://source.com/article",
    "source": "News Source",
    "published_at": "2024-01-15T10:00:00Z",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "location_name": "New York",
    "bias_score": 45,
    "bias_analysis": {
      "politicalLean": "center",
      "factualAccuracy": 85,
      "emotionalTone": 0,
      "confidence": 90
    }
  }
}
```

### Management Endpoints

#### POST /api/news/refresh
**Purpose**: Manually trigger news aggregation and refresh

**Response**:
```json
{
  "message": "News refresh completed successfully",
  "status": "completed",
  "result": {
    "totalFetched": 50,
    "totalSaved": 45,
    "errors": 5
  }
}
```

#### GET /api/news/sources
**Purpose**: Get list of available news sources

**Response**:
```json
{
  "sources": [
    {
      "name": "BBC News",
      "displayName": "BBC News"
    },
    {
      "name": "Reuters",
      "displayName": "Reuters"
    }
  ]
}
```

#### GET /api/news/statistics
**Purpose**: Get database statistics and metrics

**Response**:
```json
{
  "statistics": {
    "totalArticles": 1250,
    "articlesWithLocation": 980,
    "articlesWithBias": 750,
    "uniqueSources": 15,
    "dateRange": {
      "earliest": "2024-01-01T00:00:00Z",
      "latest": "2024-01-20T23:59:59Z"
    }
  }
}
```

## Requirements Compliance

### Requirement 2.1 & 2.3 (Historical Data)
✅ **Implemented**: Date-based filtering with `startDate` and `endDate` parameters
- Articles can be retrieved for any historical date
- Date range filtering supports exploring events over time
- Persistent storage ensures historical data availability

### Requirement 8.1 (Geographic Filtering)
✅ **Implemented**: Geographic filtering with latitude, longitude, and radius
- Bounding box calculations for geographic regions
- Radius-based filtering for location-specific news
- Support for coordinate-based queries

### Requirement 8.3 (Date Range Filtering)
✅ **Implemented**: Comprehensive date range filtering
- ISO 8601 date format support
- Flexible date range queries
- Historical browsing capabilities

## Additional Features

### Security & Validation
- JWT authentication required for all endpoints
- Input validation and sanitization
- Rate limiting protection
- SQL injection prevention
- XSS protection

### Performance Optimization
- Database indexing on key fields (location, date, bias_score)
- Pagination to handle large datasets
- Efficient query optimization
- Caching support ready

### Error Handling
- Comprehensive error responses with proper HTTP status codes
- Detailed error logging
- User-friendly error messages
- Graceful degradation

### Testing
- Unit tests for all endpoints
- Integration tests for database operations
- Input validation testing
- Error scenario testing

## Usage Examples

### Get Recent Articles
```bash
GET /api/news/articles?page=1&limit=10
```

### Filter by Date Range
```bash
GET /api/news/articles?startDate=2024-01-01&endDate=2024-01-31
```

### Geographic Filtering (New York area)
```bash
GET /api/news/articles?lat=40.7128&lng=-74.0060&radius=50
```

### Search with Keywords
```bash
GET /api/news/articles?keyword=climate&biasScoreMin=40&biasScoreMax=60
```

### Get Article Details
```bash
GET /api/news/article/123
```

### Trigger News Refresh
```bash
POST /api/news/refresh
```

## Database Schema Support

The implementation works with the following database schema:

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    summary TEXT,
    url VARCHAR(1000) UNIQUE NOT NULL,
    source VARCHAR(100) NOT NULL,
    published_at TIMESTAMP NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(200),
    bias_score INTEGER,
    bias_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_articles_location ON articles(latitude, longitude);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_bias_score ON articles(bias_score);
```

## Integration Points

The News API integrates with:
- **Authentication Service**: JWT token validation
- **News Aggregation Service**: Automatic news fetching
- **Bias Analysis Service**: AI-powered bias scoring
- **Database Layer**: PostgreSQL with Knex.js ORM
- **Caching Layer**: Redis for performance optimization
- **Logging System**: Winston for comprehensive logging

## Status

✅ **Task 8 Complete**: All sub-tasks have been successfully implemented:
1. ✅ GET /api/news/articles endpoint with filtering
2. ✅ Article retrieval by date and geographic bounds  
3. ✅ Individual article details endpoint
4. ✅ News refresh trigger endpoint
5. ✅ Pagination and sorting for article lists

The implementation fully satisfies requirements 2.1, 2.3, 8.1, and 8.3 from the specification.