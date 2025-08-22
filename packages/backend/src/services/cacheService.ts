import { redisClient } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import { Article, ArticleFilters } from '../models/Article.js';

export class CacheService {
  private static readonly CACHE_PREFIXES = {
    ARTICLE: 'article:',
    ARTICLES_LIST: 'articles:',
    SOURCES: 'sources:',
    STATISTICS: 'stats:',
    BIAS_ANALYSIS: 'bias:',
  };

  private static readonly CACHE_TTL = {
    ARTICLE: 60 * 60, // 1 hour
    ARTICLES_LIST: 5 * 60, // 5 minutes
    SOURCES: 30 * 60, // 30 minutes
    STATISTICS: 15 * 60, // 15 minutes
    BIAS_ANALYSIS: 24 * 60 * 60, // 24 hours
  };

  /**
   * Generate cache key for article
   */
  private static getArticleKey(id: number): string {
    return `${this.CACHE_PREFIXES.ARTICLE}${id}`;
  }

  /**
   * Generate cache key for articles list with filters
   */
  private static getArticlesListKey(filters: ArticleFilters, limit: number, offset: number): string {
    const filterHash = this.hashFilters(filters);
    return `${this.CACHE_PREFIXES.ARTICLES_LIST}${filterHash}:${limit}:${offset}`;
  }

  /**
   * Generate cache key for sources
   */
  private static getSourcesKey(): string {
    return `${this.CACHE_PREFIXES.SOURCES}list`;
  }

  /**
   * Generate cache key for statistics
   */
  private static getStatisticsKey(): string {
    return `${this.CACHE_PREFIXES.STATISTICS}general`;
  }

  /**
   * Generate cache key for bias analysis
   */
  private static getBiasAnalysisKey(articleId: number): string {
    return `${this.CACHE_PREFIXES.BIAS_ANALYSIS}${articleId}`;
  }

  /**
   * Hash filters to create consistent cache keys
   */
  private static hashFilters(filters: ArticleFilters): string {
    const filterString = JSON.stringify({
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      latitude: filters.latitude,
      longitude: filters.longitude,
      radius: filters.radius,
      source: filters.source,
      biasScoreMin: filters.biasScoreMin,
      biasScoreMax: filters.biasScoreMax,
      keyword: filters.keyword,
    });
    
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < filterString.length; i++) {
      const char = filterString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache a single article
   */
  static async cacheArticle(article: Article): Promise<void> {
    try {
      const key = this.getArticleKey(article.id);
      await redisClient.setEx(key, this.CACHE_TTL.ARTICLE, JSON.stringify(article));
      logger.debug('Article cached:', { articleId: article.id, key });
    } catch (error) {
      logger.error('Error caching article:', { articleId: article.id, error });
    }
  }

  /**
   * Get cached article
   */
  static async getCachedArticle(id: number): Promise<Article | null> {
    try {
      const key = this.getArticleKey(id);
      const cached = await redisClient.get(key);
      
      if (cached) {
        logger.debug('Article cache hit:', { articleId: id, key });
        return JSON.parse(cached);
      }
      
      logger.debug('Article cache miss:', { articleId: id, key });
      return null;
    } catch (error) {
      logger.error('Error getting cached article:', { articleId: id, error });
      return null;
    }
  }

  /**
   * Cache articles list with filters
   */
  static async cacheArticlesList(
    articles: Article[],
    totalCount: number,
    filters: ArticleFilters,
    limit: number,
    offset: number
  ): Promise<void> {
    try {
      const key = this.getArticlesListKey(filters, limit, offset);
      const cacheData = {
        articles,
        totalCount,
        timestamp: Date.now(),
      };
      
      await redisClient.setEx(key, this.CACHE_TTL.ARTICLES_LIST, JSON.stringify(cacheData));
      logger.debug('Articles list cached:', { key, count: articles.length, totalCount });
    } catch (error) {
      logger.error('Error caching articles list:', { error });
    }
  }

  /**
   * Get cached articles list
   */
  static async getCachedArticlesList(
    filters: ArticleFilters,
    limit: number,
    offset: number
  ): Promise<{ articles: Article[]; totalCount: number } | null> {
    try {
      const key = this.getArticlesListKey(filters, limit, offset);
      const cached = await redisClient.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        logger.debug('Articles list cache hit:', { key, count: data.articles.length });
        return {
          articles: data.articles,
          totalCount: data.totalCount,
        };
      }
      
      logger.debug('Articles list cache miss:', { key });
      return null;
    } catch (error) {
      logger.error('Error getting cached articles list:', { error });
      return null;
    }
  }

  /**
   * Cache sources list
   */
  static async cacheSources(sources: string[]): Promise<void> {
    try {
      const key = this.getSourcesKey();
      await redisClient.setEx(key, this.CACHE_TTL.SOURCES, JSON.stringify(sources));
      logger.debug('Sources cached:', { key, count: sources.length });
    } catch (error) {
      logger.error('Error caching sources:', { error });
    }
  }

  /**
   * Get cached sources
   */
  static async getCachedSources(): Promise<string[] | null> {
    try {
      const key = this.getSourcesKey();
      const cached = await redisClient.get(key);
      
      if (cached) {
        logger.debug('Sources cache hit:', { key });
        return JSON.parse(cached);
      }
      
      logger.debug('Sources cache miss:', { key });
      return null;
    } catch (error) {
      logger.error('Error getting cached sources:', { error });
      return null;
    }
  }

  /**
   * Cache statistics
   */
  static async cacheStatistics(stats: any): Promise<void> {
    try {
      const key = this.getStatisticsKey();
      await redisClient.setEx(key, this.CACHE_TTL.STATISTICS, JSON.stringify(stats));
      logger.debug('Statistics cached:', { key });
    } catch (error) {
      logger.error('Error caching statistics:', { error });
    }
  }

  /**
   * Get cached statistics
   */
  static async getCachedStatistics(): Promise<any | null> {
    try {
      const key = this.getStatisticsKey();
      const cached = await redisClient.get(key);
      
      if (cached) {
        logger.debug('Statistics cache hit:', { key });
        return JSON.parse(cached);
      }
      
      logger.debug('Statistics cache miss:', { key });
      return null;
    } catch (error) {
      logger.error('Error getting cached statistics:', { error });
      return null;
    }
  }

  /**
   * Cache bias analysis result
   */
  static async cacheBiasAnalysis(articleId: number, biasData: any): Promise<void> {
    try {
      const key = this.getBiasAnalysisKey(articleId);
      await redisClient.setEx(key, this.CACHE_TTL.BIAS_ANALYSIS, JSON.stringify(biasData));
      logger.debug('Bias analysis cached:', { articleId, key });
    } catch (error) {
      logger.error('Error caching bias analysis:', { articleId, error });
    }
  }

  /**
   * Get cached bias analysis
   */
  static async getCachedBiasAnalysis(articleId: number): Promise<any | null> {
    try {
      const key = this.getBiasAnalysisKey(articleId);
      const cached = await redisClient.get(key);
      
      if (cached) {
        logger.debug('Bias analysis cache hit:', { articleId, key });
        return JSON.parse(cached);
      }
      
      logger.debug('Bias analysis cache miss:', { articleId, key });
      return null;
    } catch (error) {
      logger.error('Error getting cached bias analysis:', { articleId, error });
      return null;
    }
  }

  /**
   * Invalidate article cache
   */
  static async invalidateArticle(id: number): Promise<void> {
    try {
      const key = this.getArticleKey(id);
      await redisClient.del(key);
      logger.debug('Article cache invalidated:', { articleId: id, key });
    } catch (error) {
      logger.error('Error invalidating article cache:', { articleId: id, error });
    }
  }

  /**
   * Invalidate articles list cache (all variations)
   */
  static async invalidateArticlesList(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIXES.ARTICLES_LIST}*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug('Articles list cache invalidated:', { keysCount: keys.length });
      }
    } catch (error) {
      logger.error('Error invalidating articles list cache:', { error });
    }
  }

  /**
   * Invalidate sources cache
   */
  static async invalidateSources(): Promise<void> {
    try {
      const key = this.getSourcesKey();
      await redisClient.del(key);
      logger.debug('Sources cache invalidated:', { key });
    } catch (error) {
      logger.error('Error invalidating sources cache:', { error });
    }
  }

  /**
   * Invalidate statistics cache
   */
  static async invalidateStatistics(): Promise<void> {
    try {
      const key = this.getStatisticsKey();
      await redisClient.del(key);
      logger.debug('Statistics cache invalidated:', { key });
    } catch (error) {
      logger.error('Error invalidating statistics cache:', { error });
    }
  }

  /**
   * Invalidate all caches
   */
  static async invalidateAll(): Promise<void> {
    try {
      const patterns = Object.values(this.CACHE_PREFIXES).map(prefix => `${prefix}*`);
      
      for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }
      
      logger.info('All caches invalidated');
    } catch (error) {
      logger.error('Error invalidating all caches:', { error });
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    memoryUsage?: string;
  }> {
    try {
      const stats: Record<string, number> = {};
      let totalKeys = 0;

      for (const [name, prefix] of Object.entries(this.CACHE_PREFIXES)) {
        const keys = await redisClient.keys(`${prefix}*`);
        stats[name] = keys.length;
        totalKeys += keys.length;
      }

      // Get Redis memory info if available
      let memoryUsage: string | undefined;
      try {
        const info = await redisClient.info('memory');
        const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
        if (memoryMatch) {
          memoryUsage = memoryMatch[1].trim();
        }
      } catch (memError) {
        logger.debug('Could not get Redis memory info:', memError);
      }

      return {
        totalKeys,
        keysByPrefix: stats,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', { error });
      return {
        totalKeys: 0,
        keysByPrefix: {},
      };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUpCache(): Promise<void> {
    try {
      logger.info('Starting cache warm-up...');

      // This would typically be called during application startup
      // to pre-populate cache with commonly accessed data
      
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Error during cache warm-up:', { error });
    }
  }
}