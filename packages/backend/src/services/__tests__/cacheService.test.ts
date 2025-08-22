import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from '../cacheService.js';
import { redisClient } from '../../utils/redis.js';
import { Article, ArticleFilters } from '../../models/Article.js';

// Mock Redis client
vi.mock('../../utils/redis.js', () => ({
  redisClient: {
    setEx: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('CacheService', () => {
  const mockArticle: Article = {
    id: 1,
    title: 'Test Article',
    content: 'Test content',
    summary: 'Test summary',
    url: 'https://example.com/article/1',
    source: 'Test Source',
    publishedAt: new Date('2023-01-01'),
    latitude: 40.7128,
    longitude: -74.0060,
    locationName: 'New York',
    biasScore: 50,
    biasAnalysis: {
      politicalLean: 'center',
      factualAccuracy: 85,
      emotionalTone: 60,
      confidence: 90,
    },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockFilters: ArticleFilters = {
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-01-02'),
    source: 'Test Source',
    biasScoreMin: 0,
    biasScoreMax: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Article Caching', () => {
    it('should cache an article successfully', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');

      await CacheService.cacheArticle(mockArticle);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        'article:1',
        3600, // 1 hour TTL
        JSON.stringify(mockArticle)
      );
    });

    it('should retrieve cached article', async () => {
      (redisClient.get as any).mockResolvedValue(JSON.stringify(mockArticle));

      const result = await CacheService.getCachedArticle(1);

      expect(redisClient.get).toHaveBeenCalledWith('article:1');
      expect(result).toEqual(mockArticle);
    });

    it('should return null for cache miss', async () => {
      (redisClient.get as any).mockResolvedValue(null);

      const result = await CacheService.getCachedArticle(1);

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      (redisClient.get as any).mockRejectedValue(new Error('Redis error'));

      const result = await CacheService.getCachedArticle(1);

      expect(result).toBeNull();
    });
  });

  describe('Articles List Caching', () => {
    it('should cache articles list with filters', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');

      const articles = [mockArticle];
      const totalCount = 1;
      const limit = 20;
      const offset = 0;

      await CacheService.cacheArticlesList(articles, totalCount, mockFilters, limit, offset);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^articles:/),
        300, // 5 minutes TTL
        expect.stringContaining('"articles"')
      );
    });

    it('should retrieve cached articles list', async () => {
      const cachedData = {
        articles: [mockArticle],
        totalCount: 1,
        timestamp: Date.now(),
      };
      (redisClient.get as any).mockResolvedValue(JSON.stringify(cachedData));

      const result = await CacheService.getCachedArticlesList(mockFilters, 20, 0);

      expect(result).toEqual({
        articles: [mockArticle],
        totalCount: 1,
      });
    });
  });

  describe('Sources Caching', () => {
    it('should cache sources list', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');
      const sources = ['Source 1', 'Source 2'];

      await CacheService.cacheSources(sources);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        'sources:list',
        1800, // 30 minutes TTL
        JSON.stringify(sources)
      );
    });

    it('should retrieve cached sources', async () => {
      const sources = ['Source 1', 'Source 2'];
      (redisClient.get as any).mockResolvedValue(JSON.stringify(sources));

      const result = await CacheService.getCachedSources();

      expect(result).toEqual(sources);
    });
  });

  describe('Statistics Caching', () => {
    it('should cache statistics', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');
      const stats = { totalArticles: 100, totalSources: 5 };

      await CacheService.cacheStatistics(stats);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        'stats:general',
        900, // 15 minutes TTL
        JSON.stringify(stats)
      );
    });

    it('should retrieve cached statistics', async () => {
      const stats = { totalArticles: 100, totalSources: 5 };
      (redisClient.get as any).mockResolvedValue(JSON.stringify(stats));

      const result = await CacheService.getCachedStatistics();

      expect(result).toEqual(stats);
    });
  });

  describe('Bias Analysis Caching', () => {
    it('should cache bias analysis', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');
      const biasData = { score: 75, analysis: 'test' };

      await CacheService.cacheBiasAnalysis(1, biasData);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        'bias:1',
        86400, // 24 hours TTL
        JSON.stringify(biasData)
      );
    });

    it('should retrieve cached bias analysis', async () => {
      const biasData = { score: 75, analysis: 'test' };
      (redisClient.get as any).mockResolvedValue(JSON.stringify(biasData));

      const result = await CacheService.getCachedBiasAnalysis(1);

      expect(result).toEqual(biasData);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate article cache', async () => {
      (redisClient.del as any).mockResolvedValue(1);

      await CacheService.invalidateArticle(1);

      expect(redisClient.del).toHaveBeenCalledWith('article:1');
    });

    it('should invalidate articles list cache', async () => {
      (redisClient.keys as any).mockResolvedValue(['articles:hash1', 'articles:hash2']);
      (redisClient.del as any).mockResolvedValue(2);

      await CacheService.invalidateArticlesList();

      expect(redisClient.keys).toHaveBeenCalledWith('articles:*');
      expect(redisClient.del).toHaveBeenCalledWith(['articles:hash1', 'articles:hash2']);
    });

    it('should invalidate all caches', async () => {
      (redisClient.keys as any).mockResolvedValue(['key1', 'key2']);
      (redisClient.del as any).mockResolvedValue(2);

      await CacheService.invalidateAll();

      expect(redisClient.keys).toHaveBeenCalledTimes(5); // One for each prefix
    });
  });

  describe('Cache Statistics', () => {
    it('should get cache statistics', async () => {
      (redisClient.keys as any)
        .mockResolvedValueOnce(['article:1', 'article:2'])
        .mockResolvedValueOnce(['articles:hash1'])
        .mockResolvedValueOnce(['sources:list'])
        .mockResolvedValueOnce(['stats:general'])
        .mockResolvedValueOnce(['bias:1']);
      
      (redisClient.info as any).mockResolvedValue('used_memory_human:1.5M\r\n');

      const stats = await CacheService.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 6,
        keysByPrefix: {
          ARTICLE: 2,
          ARTICLES_LIST: 1,
          SOURCES: 1,
          STATISTICS: 1,
          BIAS_ANALYSIS: 1,
        },
        memoryUsage: '1.5M',
      });
    });

    it('should handle cache stats errors gracefully', async () => {
      (redisClient.keys as any).mockRejectedValue(new Error('Redis error'));

      const stats = await CacheService.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        keysByPrefix: {},
      });
    });
  });

  describe('Filter Hashing', () => {
    it('should generate consistent hash for same filters', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');

      // Cache with same filters twice
      await CacheService.cacheArticlesList([mockArticle], 1, mockFilters, 20, 0);
      await CacheService.cacheArticlesList([mockArticle], 1, mockFilters, 20, 0);

      // Should use same cache key (same hash)
      const calls = (redisClient.setEx as any).mock.calls;
      expect(calls[0][0]).toBe(calls[1][0]);
    });

    it('should generate different hash for different filters', async () => {
      (redisClient.setEx as any).mockResolvedValue('OK');

      const filters1 = { ...mockFilters, source: 'Source 1' };
      const filters2 = { ...mockFilters, source: 'Source 2' };

      await CacheService.cacheArticlesList([mockArticle], 1, filters1, 20, 0);
      await CacheService.cacheArticlesList([mockArticle], 1, filters2, 20, 0);

      // Should use different cache keys (different hashes)
      const calls = (redisClient.setEx as any).mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });
});