# Article Model Usage Guide

This document provides examples of how to use the enhanced Article model with validation and sanitization.

## Features

The Article model now includes:
- ✅ Comprehensive validation for all fields
- ✅ XSS sanitization for text content
- ✅ Geographic coordinate validation
- ✅ Bias analysis validation
- ✅ Batch operations
- ✅ Advanced querying methods
- ✅ Database indexes for performance

## Basic Usage

### Creating Articles

```typescript
import { ArticleModel } from './src/models/Article.js';

// Create a single article (with automatic validation and sanitization)
const articleData = {
  title: 'Breaking News: Major Event Occurs',
  content: 'Full article content here...',
  summary: 'Brief summary of the event',
  url: 'https://newsource.com/breaking-news',
  source: 'News Source',
  published_at: new Date('2024-01-15T10:30:00Z'),
  latitude: 40.7128,
  longitude: -74.0060,
  location_name: 'New York City',
  bias_score: 45,
  bias_analysis: {
    politicalLean: 'center',
    factualAccuracy: 85,
    emotionalTone: -10,
    confidence: 90
  }
};

const article = await ArticleModel.create(articleData);
console.log('Created article:', article.id);
```

### Batch Creation

```typescript
// Create multiple articles at once
const articlesData = [
  {
    title: 'Article 1',
    url: 'https://example.com/article1',
    source: 'Source A',
    published_at: new Date(),
    // ... other fields
  },
  {
    title: 'Article 2',
    url: 'https://example.com/article2',
    source: 'Source B',
    published_at: new Date(),
    // ... other fields
  }
];

const articles = await ArticleModel.createBatch(articlesData);
console.log(`Created ${articles.length} articles`);
```

## Querying Articles

### Basic Queries

```typescript
// Find by ID
const article = await ArticleModel.findById(123);

// Find by URL
const article = await ArticleModel.findByUrl('https://example.com/article');

// Get recent articles (last 24 hours)
const recentArticles = await ArticleModel.findRecent(20);
```

### Geographic Queries

```typescript
// Find articles in a bounding box
const articles = await ArticleModel.findInBoundingBox(
  { lat: 41.0, lng: -73.0 }, // Northeast corner
  { lat: 40.0, lng: -75.0 }  // Southwest corner
);

// Find articles by location name (fuzzy search)
const nyArticles = await ArticleModel.findByLocation('New York');
```

### Advanced Filtering

```typescript
// Complex filtering with multiple criteria
const filters = {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  latitude: 40.7128,
  longitude: -74.0060,
  radius: 50, // 50km radius
  source: 'CNN',
  biasScoreMin: 30,
  biasScoreMax: 70,
  keyword: 'climate change'
};

const articles = await ArticleModel.findWithFilters(filters, 25, 0);
const totalCount = await ArticleModel.countWithFilters(filters);
```

### Specialized Queries

```typescript
// Find by source and date range
const articles = await ArticleModel.findBySourceAndDateRange(
  'BBC',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Find by bias score range
const centristArticles = await ArticleModel.findByBiasRange(40, 60);

// Get articles for a specific date
const todayArticles = await ArticleModel.findByDate(new Date());
```

## Updating Articles

```typescript
// Update with validation and sanitization
const updatedArticle = await ArticleModel.update(articleId, {
  bias_score: 65,
  bias_analysis: {
    politicalLean: 'right',
    factualAccuracy: 80,
    emotionalTone: 15,
    confidence: 85
  }
});

// Update bias analysis specifically
const updatedArticle = await ArticleModel.updateBiasAnalysis(
  articleId,
  75,
  {
    politicalLean: 'left',
    factualAccuracy: 90,
    emotionalTone: -5,
    confidence: 95
  }
);
```

## Utility Methods

```typescript
// Get unique sources
const sources = await ArticleModel.getUniqueSources();
console.log('Available sources:', sources);

// Get database statistics
const stats = await ArticleModel.getStatistics();
console.log('Total articles:', stats.totalArticles);
console.log('Articles with location:', stats.articlesWithLocation);
console.log('Articles with bias scores:', stats.articlesWithBias);
console.log('Date range:', stats.dateRange);

// Clean up old articles
const deletedCount = await ArticleModel.deleteOlderThan(
  new Date('2023-01-01')
);
console.log(`Deleted ${deletedCount} old articles`);
```

## Validation Examples

The model automatically validates and sanitizes all input:

```typescript
// This will be sanitized automatically
const articleWithXSS = {
  title: 'News <script>alert("xss")</script> Article',
  content: 'Content with <script>malicious()</script> code',
  url: 'https://example.com/article',
  source: 'Test Source',
  published_at: new Date()
};

const cleanArticle = await ArticleModel.create(articleWithXSS);
// Result: title = "News  Article", content = "Content with  code"
```

```typescript
// This will throw a ValidationError
try {
  await ArticleModel.create({
    title: '', // Invalid: empty title
    url: 'not-a-url', // Invalid: not a proper URL
    source: 'Test Source',
    published_at: new Date(),
    latitude: 91 // Invalid: latitude > 90
  });
} catch (error) {
  console.log('Validation failed:', error.message);
}
```

## Error Handling

```typescript
import { ValidationError } from './src/middleware/errorHandler.js';

try {
  const article = await ArticleModel.create(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation error:', error.message);
    // Handle validation errors (400 status)
  } else {
    console.log('Database error:', error.message);
    // Handle database errors (500 status)
  }
}
```

## Performance Considerations

The Article model includes optimized database indexes for:
- Geographic queries (latitude, longitude)
- Date-based queries (published_at)
- Bias score filtering (bias_score)
- Source filtering (source)
- URL lookups (url)

For best performance:
- Use geographic bounding boxes instead of radius queries when possible
- Limit result sets with appropriate `limit` parameters
- Use date ranges to narrow down queries
- Consider caching frequently accessed data

## Integration with Express Routes

```typescript
import { articleValidation, handleValidationErrors } from './src/middleware/validation.js';

// Use validation middleware in routes
app.post('/api/articles', 
  articleValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const article = await ArticleModel.create(req.body);
      res.status(201).json(article);
    } catch (error) {
      next(error);
    }
  }
);
```