import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArticleModel } from '../Article.js';
import { CreateArticleData, Article } from '../../types/models.js';
import db from '../../database/connection.js';
import { ValidationError } from '../../middleware/errorHandler.js';

// Mock the logger to avoid console output during tests
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ArticleModel', () => {
  const validArticleData: CreateArticleData = {
    title: 'Test Article',
    content: 'This is test content for the article',
    summary: 'Test summary',
    url: 'https://example.com/test-article',
    source: 'Test Source',
    published_at: new Date('2024-01-01T10:00:00Z'),
    latitude: 40.7128,
    longitude: -74.0060,
    location_name: 'New York',
    bias_score: 50,
    bias_analysis: {
      politicalLean: 'center',
      factualAccuracy: 85,
      emotionalTone: 0,
      confidence: 90,
    },
  };

  beforeEach(async () => {
    // Clean up articles table before each test
    await db('articles').del();
  });

  afterEach(async () => {
    // Clean up after each test
    await db('articles').del();
  });

  describe('create', () => {
    it('should create a new article with valid data', async () => {
      const article = await ArticleModel.create(validArticleData);
      
      expect(article).toBeDefined();
      expect(article.id).toBeDefined();
      expect(article.title).toBe(validArticleData.title);
      expect(article.url).toBe(validArticleData.url);
      expect(article.source).toBe(validArticleData.source);
      expect(article.latitude).toBe(validArticleData.latitude);
      expect(article.longitude).toBe(validArticleData.longitude);
      expect(article.bias_score).toBe(validArticleData.bias_score);
    });

    it('should sanitize XSS content when creating article', async () => {
      const articleWithXSS = {
        ...validArticleData,
        title: 'Test <script>alert("xss")</script> Article',
        content: 'Content with <script>malicious()</script> code',
      };

      const article = await ArticleModel.create(articleWithXSS);
      
      expect(article.title).toBe('Test  Article');
      expect(article.content).toBe('Content with  code');
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = {
        ...validArticleData,
        title: '', // Invalid: empty title
      };

      await expect(ArticleModel.create(invalidData))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for invalid coordinates', async () => {
      const invalidData = {
        ...validArticleData,
        latitude: 91, // Invalid: latitude > 90
      };

      await expect(ArticleModel.create(invalidData))
        .rejects.toThrow('Latitude must be a number between -90 and 90');
    });
  });

  describe('createBatch', () => {
    it('should create multiple articles in batch', async () => {
      const articlesData = [
        { ...validArticleData, url: 'https://example.com/article1' },
        { ...validArticleData, url: 'https://example.com/article2', title: 'Second Article' },
      ];

      const articles = await ArticleModel.createBatch(articlesData);
      
      expect(articles).toHaveLength(2);
      expect(articles[0].url).toBe('https://example.com/article1');
      expect(articles[1].url).toBe('https://example.com/article2');
      expect(articles[1].title).toBe('Second Article');
    });

    it('should return empty array for empty input', async () => {
      const articles = await ArticleModel.createBatch([]);
      expect(articles).toHaveLength(0);
    });

    it('should validate all articles in batch', async () => {
      const articlesData = [
        { ...validArticleData, url: 'https://example.com/article1' },
        { ...validArticleData, url: '', title: 'Invalid Article' }, // Invalid URL
      ];

      await expect(ArticleModel.createBatch(articlesData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('findById', () => {
    it('should find article by ID', async () => {
      const createdArticle = await ArticleModel.create(validArticleData);
      const foundArticle = await ArticleModel.findById(createdArticle.id);
      
      expect(foundArticle).toBeDefined();
      expect(foundArticle!.id).toBe(createdArticle.id);
      expect(foundArticle!.title).toBe(validArticleData.title);
    });

    it('should return null for non-existent ID', async () => {
      const foundArticle = await ArticleModel.findById(99999);
      expect(foundArticle).toBeNull();
    });
  });

  describe('findByUrl', () => {
    it('should find article by URL', async () => {
      await ArticleModel.create(validArticleData);
      const foundArticle = await ArticleModel.findByUrl(validArticleData.url);
      
      expect(foundArticle).toBeDefined();
      expect(foundArticle!.url).toBe(validArticleData.url);
    });

    it('should return null for non-existent URL', async () => {
      const foundArticle = await ArticleModel.findByUrl('https://nonexistent.com');
      expect(foundArticle).toBeNull();
    });
  });

  describe('findInBoundingBox', () => {
    it('should find articles within bounding box', async () => {
      // Create articles in different locations
      await ArticleModel.create({ ...validArticleData, latitude: 40.7128, longitude: -74.0060 }); // NYC
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        latitude: 34.0522, 
        longitude: -118.2437 
      }); // LA
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article3',
        latitude: 51.5074, 
        longitude: -0.1278 
      }); // London

      // Search for articles in North America
      const articles = await ArticleModel.findInBoundingBox(
        { lat: 50, lng: -60 }, // Northeast
        { lat: 30, lng: -130 }  // Southwest
      );

      expect(articles).toHaveLength(2); // Should find NYC and LA, not London
    });
  });

  describe('findBySourceAndDateRange', () => {
    it('should find articles by source and date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      await ArticleModel.create({ 
        ...validArticleData, 
        published_at: new Date('2024-01-15'),
        source: 'Test Source'
      });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        published_at: new Date('2024-02-15'), // Outside date range
        source: 'Test Source'
      });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article3',
        published_at: new Date('2024-01-15'),
        source: 'Other Source' // Different source
      });

      const articles = await ArticleModel.findBySourceAndDateRange('Test Source', startDate, endDate);
      
      expect(articles).toHaveLength(1);
      expect(articles[0].source).toBe('Test Source');
    });
  });

  describe('findByBiasRange', () => {
    it('should find articles within bias score range', async () => {
      await ArticleModel.create({ ...validArticleData, bias_score: 25 });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        bias_score: 50 
      });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article3',
        bias_score: 75 
      });

      const articles = await ArticleModel.findByBiasRange(30, 60);
      
      expect(articles).toHaveLength(1);
      expect(articles[0].bias_score).toBe(50);
    });
  });

  describe('findRecent', () => {
    it('should find recent articles (last 24 hours)', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 23 * 60 * 60 * 1000); // 23 hours ago
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

      await ArticleModel.create({ ...validArticleData, published_at: yesterday });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        published_at: twoDaysAgo 
      });

      const articles = await ArticleModel.findRecent();
      
      expect(articles).toHaveLength(1);
      expect(new Date(articles[0].published_at).getTime()).toBeGreaterThan(twoDaysAgo.getTime());
    });
  });

  describe('findByLocation', () => {
    it('should find articles by location name (fuzzy search)', async () => {
      await ArticleModel.create({ ...validArticleData, location_name: 'New York City' });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        location_name: 'New York State' 
      });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article3',
        location_name: 'Los Angeles' 
      });

      const articles = await ArticleModel.findByLocation('New York');
      
      expect(articles).toHaveLength(2);
      expect(articles.every(a => a.location_name?.includes('New York'))).toBe(true);
    });
  });

  describe('getUniqueSources', () => {
    it('should return unique sources', async () => {
      await ArticleModel.create({ ...validArticleData, source: 'Source A' });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        source: 'Source B' 
      });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article3',
        source: 'Source A' // Duplicate
      });

      const sources = await ArticleModel.getUniqueSources();
      
      expect(sources).toHaveLength(2);
      expect(sources).toContain('Source A');
      expect(sources).toContain('Source B');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      await ArticleModel.create({ ...validArticleData, source: 'Source A' });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        source: 'Source B',
        latitude: null,
        longitude: null,
        bias_score: null
      });

      const stats = await ArticleModel.getStatistics();
      
      expect(stats.totalArticles).toBe(2);
      expect(stats.articlesWithLocation).toBe(1);
      expect(stats.articlesWithBias).toBe(1);
      expect(stats.uniqueSources).toBe(2);
      expect(stats.dateRange.earliest).toBeDefined();
      expect(stats.dateRange.latest).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update article with validation', async () => {
      const createdArticle = await ArticleModel.create(validArticleData);
      
      const updatedArticle = await ArticleModel.update(createdArticle.id, {
        title: 'Updated Title',
        bias_score: 75,
      });
      
      expect(updatedArticle).toBeDefined();
      expect(updatedArticle!.title).toBe('Updated Title');
      expect(updatedArticle!.bias_score).toBe(75);
      expect(updatedArticle!.url).toBe(validArticleData.url); // Should remain unchanged
    });

    it('should sanitize XSS content during update', async () => {
      const createdArticle = await ArticleModel.create(validArticleData);
      
      const updatedArticle = await ArticleModel.update(createdArticle.id, {
        title: 'Updated <script>alert("xss")</script> Title',
      });
      
      expect(updatedArticle!.title).toBe('Updated  Title');
    });
  });

  describe('deleteById', () => {
    it('should delete article by ID', async () => {
      const createdArticle = await ArticleModel.create(validArticleData);
      
      const deleted = await ArticleModel.deleteById(createdArticle.id);
      expect(deleted).toBe(true);
      
      const foundArticle = await ArticleModel.findById(createdArticle.id);
      expect(foundArticle).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await ArticleModel.deleteById(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete articles older than specified date', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2024-01-01');
      const cutoffDate = new Date('2023-06-01');

      await ArticleModel.create({ ...validArticleData, published_at: oldDate });
      await ArticleModel.create({ 
        ...validArticleData, 
        url: 'https://example.com/article2',
        published_at: newDate 
      });

      const deletedCount = await ArticleModel.deleteOlderThan(cutoffDate);
      
      expect(deletedCount).toBe(1);
      
      const remainingArticles = await ArticleModel.findWithFilters();
      expect(remainingArticles).toHaveLength(1);
      expect(new Date(remainingArticles[0].published_at)).toEqual(newDate);
    });
  });
});