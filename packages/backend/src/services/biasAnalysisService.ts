import { ArticleModel } from '../models/Article.js';
import { redisClient, ensureRedisConnection } from '../utils/redis.js';
import { logger } from '../utils/logger.js';
import { ProviderFactory, createFactoryConfigFromEnv } from './llm/ProviderFactory.js';
import { ProviderHealthMonitor } from './llm/ProviderHealthMonitor.js';
import { ProviderConfigManager } from './llm/ProviderConfigManager.js';
import { ProviderFallbackManager } from './llm/ProviderFallbackManager.js';
import { 
  BiasAnalysisRequest, 
  BiasAnalysisResult 
} from '../types/llmProvider.js';

export class BiasAnalysisService {
  private static readonly CACHE_PREFIX = 'bias_analysis:';
  private static readonly CACHE_EXPIRATION = 7 * 24 * 60 * 60; // 7 days in seconds
  
  private static factory: ProviderFactory | null = null;
  private static healthMonitor: ProviderHealthMonitor | null = null;
  private static configManager: ProviderConfigManager | null = null;
  private static fallbackManager: ProviderFallbackManager | null = null;
  private static initialized: boolean = false;

  /**
   * Initialize the bias analysis service with LLM providers
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing bias analysis service with LLM providers');

      // Initialize configuration manager
      this.configManager = ProviderConfigManager.getInstance();
      
      // Initialize provider factory
      const factoryConfig = createFactoryConfigFromEnv();
      this.factory = ProviderFactory.getInstance(factoryConfig);
      await this.factory.initialize();
      
      // Initialize health monitor
      this.healthMonitor = new ProviderHealthMonitor(this.factory);
      this.healthMonitor.startMonitoring();
      
      // Initialize fallback manager
      this.fallbackManager = new ProviderFallbackManager(
        this.factory,
        this.healthMonitor,
        this.configManager
      );
      
      this.initialized = true;
      logger.info('Bias analysis service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize bias analysis service', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Cleanup the bias analysis service
   */
  static async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      logger.info('Cleaning up bias analysis service');
      
      if (this.healthMonitor) {
        this.healthMonitor.stopMonitoring();
      }
      
      if (this.factory) {
        await this.factory.cleanup();
      }
      
      this.factory = null;
      this.healthMonitor = null;
      this.configManager = null;
      this.fallbackManager = null;
      this.initialized = false;
      
      logger.info('Bias analysis service cleanup completed');
      
    } catch (error) {
      logger.error('Failed to cleanup bias analysis service', { error: (error as Error).message });
    }
  }

  /**
   * Analyze article content for bias using LLM providers with fallback
   */
  static async analyzeArticle(
    request: BiasAnalysisRequest, 
    preferredProvider?: string
  ): Promise<BiasAnalysisResult> {
    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.fallbackManager) {
      throw new Error('Bias analysis service not properly initialized');
    }

    const cacheKey = this.generateCacheKey(request, preferredProvider);
    
    // Check cache first
    const cachedResult = await this.getCachedAnalysis(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached bias analysis', { cacheKey, provider: cachedResult.provider });
      return cachedResult;
    }

    logger.info('Performing new bias analysis with fallback', { 
      title: request.title.substring(0, 100),
      source: request.source,
      preferredProvider 
    });

    try {
      // Use fallback manager for robust analysis with provider preference
      const result = await this.fallbackManager.analyzeWithFallback(request, preferredProvider);

      // Cache the result if it's not a fallback
      if (result.provider !== 'cached_fallback' && result.provider !== 'neutral_fallback') {
        await this.cacheAnalysis(cacheKey, result);
      }

      logger.info('Bias analysis completed', { 
        provider: result.provider,
        biasScore: result.biasScore,
        politicalLean: result.biasAnalysis.politicalLean,
        confidence: result.confidence,
        processingTime: result.processingTime
      });

      return result;
      
    } catch (error) {
      logger.error('Bias analysis failed completely', { error: (error as Error).message });
      
      // Final fallback - return neutral analysis
      return this.getNeutralFallbackAnalysis();
    }
  }

  /**
   * Analyze and store bias for an article by ID
   */
  static async analyzeAndStoreArticle(
    articleId: number, 
    preferredProvider?: string
  ): Promise<BiasAnalysisResult | null> {
    const article = await ArticleModel.findById(articleId);
    if (!article) {
      logger.warn('Article not found for bias analysis', { articleId });
      return null;
    }

    // Skip if already analyzed
    if (article.bias_score !== null && article.bias_analysis !== null) {
      logger.info('Article already has bias analysis', { articleId });
      return {
        biasScore: article.bias_score,
        biasAnalysis: article.bias_analysis,
        provider: 'cached_database',
        confidence: article.bias_analysis.confidence || 0,
        processingTime: 0
      };
    }

    const request: BiasAnalysisRequest = {
      title: article.title,
      content: article.content,
      summary: article.summary,
      source: article.source,
    };

    const result = await this.analyzeArticle(request, preferredProvider);

    // Store the analysis in the database
    await ArticleModel.updateBiasAnalysis(
      articleId,
      result.biasScore,
      result.biasAnalysis
    );

    logger.info('Bias analysis stored for article', { 
      articleId,
      biasScore: result.biasScore,
      provider: result.provider
    });

    return result;
  }

  /**
   * Batch analyze multiple articles
   */
  static async batchAnalyzeArticles(
    articleIds: number[], 
    preferredProvider?: string
  ): Promise<Map<number, BiasAnalysisResult>> {
    const results = new Map<number, BiasAnalysisResult>();
    
    logger.info('Starting batch bias analysis', { 
      count: articleIds.length,
      preferredProvider 
    });

    // Process articles in batches to avoid overwhelming the AI API
    const batchSize = 5;
    for (let i = 0; i < articleIds.length; i += batchSize) {
      const batch = articleIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (articleId) => {
        try {
          const result = await this.analyzeAndStoreArticle(articleId, preferredProvider);
          if (result) {
            results.set(articleId, result);
          }
        } catch (error) {
          logger.error('Failed to analyze article in batch', { 
            articleId, 
            error: (error as Error).message 
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to respect API rate limits
      if (i + batchSize < articleIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Batch bias analysis completed', { 
      processed: results.size,
      total: articleIds.length 
    });

    return results;
  }

  /**
   * Get articles that need bias analysis
   */
  static async getArticlesNeedingAnalysis(limit: number = 50): Promise<number[]> {
    const articles = await ArticleModel.findWithFilters(
      { biasScoreMin: undefined, biasScoreMax: undefined },
      limit
    );

    return articles
      .filter(article => article.bias_score === null)
      .map(article => article.id);
  }

  /**
   * Analyze recent articles automatically
   */
  static async analyzeRecentArticles(): Promise<void> {
    logger.info('Starting automatic bias analysis for recent articles');

    const articleIds = await this.getArticlesNeedingAnalysis(20);
    
    if (articleIds.length === 0) {
      logger.info('No articles need bias analysis');
      return;
    }

    await this.batchAnalyzeArticles(articleIds);
  }

  /**
   * Get provider chain health status
   */
  static async getProviderHealth(): Promise<any> {
    if (!this.initialized || !this.fallbackManager) {
      await this.initialize();
    }

    return this.fallbackManager!.getProviderChainHealth();
  }

  /**
   * Get performance summary for all providers
   */
  static async getPerformanceSummary(): Promise<any> {
    if (!this.initialized || !this.fallbackManager) {
      await this.initialize();
    }

    return this.fallbackManager!.getPerformanceSummary();
  }

  /**
   * Reset circuit breakers for all providers
   */
  static resetCircuitBreakers(): void {
    if (this.fallbackManager) {
      this.fallbackManager.resetCircuitBreakers();
    }
  }

  /**
   * Generate cache key for bias analysis with provider-specific caching
   */
  private static generateCacheKey(request: BiasAnalysisRequest, provider?: string): string {
    // Create a hash-like key based on content and provider
    const content = `${request.title}|${request.content}|${request.source || ''}|${provider || 'default'}`;
    const hash = Buffer.from(content).toString('base64').substring(0, 32);
    return `${this.CACHE_PREFIX}${provider || 'default'}:${hash}`;
  }

  /**
   * Get cached bias analysis result
   */
  private static async getCachedAnalysis(cacheKey: string): Promise<BiasAnalysisResult | null> {
    try {
      await ensureRedisConnection();
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to get cached bias analysis', { error: error.message });
    }
    
    return null;
  }

  /**
   * Cache bias analysis result
   */
  private static async cacheAnalysis(cacheKey: string, result: BiasAnalysisResult): Promise<void> {
    try {
      await ensureRedisConnection();
      await redisClient.setEx(
        cacheKey,
        this.CACHE_EXPIRATION,
        JSON.stringify(result)
      );
    } catch (error) {
      logger.warn('Failed to cache bias analysis', { error: error.message });
    }
  }

  /**
   * Get neutral fallback analysis when all providers fail
   */
  private static getNeutralFallbackAnalysis(): BiasAnalysisResult {
    return {
      biasScore: 50, // Neutral score
      biasAnalysis: {
        politicalLean: 'center',
        factualAccuracy: 50,
        emotionalTone: 50,
        confidence: 0, // Low confidence indicates fallback
      },
      provider: 'neutral_fallback',
      confidence: 0,
      processingTime: 0
    };
  }

  /**
   * Clear bias analysis cache
   */
  static async clearCache(): Promise<void> {
    try {
      await ensureRedisConnection();
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('Bias analysis cache cleared', { keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Failed to clear bias analysis cache', { error: error.message });
    }
  }

  /**
   * Get cache statistics with provider breakdown
   */
  static async getCacheStats(): Promise<{ 
    totalKeys: number; 
    memoryUsage: string;
    providerBreakdown: Record<string, number>;
  }> {
    try {
      await ensureRedisConnection();
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
      const info = await redisClient.info('memory');
      
      // Break down keys by provider
      const providerBreakdown: Record<string, number> = {};
      keys.forEach(key => {
        const providerMatch = key.match(new RegExp(`${this.CACHE_PREFIX}([^:]+):`));
        const provider = providerMatch ? providerMatch[1] : 'unknown';
        providerBreakdown[provider] = (providerBreakdown[provider] || 0) + 1;
      });
      
      return {
        totalKeys: keys.length,
        memoryUsage: info,
        providerBreakdown,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error: (error as Error).message });
      return { totalKeys: 0, memoryUsage: 'unavailable', providerBreakdown: {} };
    }
  }

  /**
   * Clear cache for a specific provider
   */
  static async clearProviderCache(provider: string): Promise<void> {
    try {
      await ensureRedisConnection();
      const keys = await redisClient.keys(`${this.CACHE_PREFIX}${provider}:*`);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('Provider-specific bias analysis cache cleared', { 
          provider,
          keysDeleted: keys.length 
        });
      }
    } catch (error) {
      logger.error('Failed to clear provider-specific bias analysis cache', { 
        provider,
        error: (error as Error).message 
      });
    }
  }

  /**
   * Get available providers from the factory
   */
  static async getAvailableProviders(): Promise<string[]> {
    if (!this.initialized || !this.factory) {
      await this.initialize();
    }

    return this.factory!.getAvailableProviders();
  }

  /**
   * Get provider configuration details
   */
  static async getProviderConfigurations(): Promise<Record<string, any>> {
    if (!this.initialized || !this.configManager) {
      await this.initialize();
    }

    return this.configManager!.getAllConfigurations();
  }

  /**
   * Test a specific provider with sample content
   */
  static async testProvider(providerName: string, sampleRequest?: BiasAnalysisRequest): Promise<{
    success: boolean;
    result?: BiasAnalysisResult;
    error?: string;
    responseTime: number;
  }> {
    if (!this.initialized || !this.factory) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      const provider = this.factory!.getProvider(providerName);
      if (!provider) {
        return {
          success: false,
          error: `Provider '${providerName}' not found`,
          responseTime: Date.now() - startTime
        };
      }

      // Use provided sample or default test content
      const testRequest: BiasAnalysisRequest = sampleRequest || {
        title: 'Test Article: Economic Policy Changes',
        content: 'The government announced new economic policies that aim to reduce inflation and stimulate growth.',
        summary: 'Government announces new economic policies.',
        source: 'Test Source'
      };

      const result = await provider.analyzeArticle(testRequest);
      
      return {
        success: true,
        result,
        responseTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        responseTime: Date.now() - startTime
      };
    }
  }
}