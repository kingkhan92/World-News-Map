import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { 
  dateValidation, 
  coordinatesValidation, 
  paginationValidation, 
  idValidation,
  articleValidation,
  articleFilterValidation,
  handleValidationErrors 
} from '../middleware/validation.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'
import { ArticleModel, ArticleFilters } from '../models/Article.js'
import { NewsAggregationService } from '../services/newsAggregationService.js'
import { getNewsScheduler } from '../services/newsScheduler.js'
import { BiasAnalysisService } from '../services/biasAnalysisService.js'
import { CacheService } from '../services/cacheService.js'

const router = Router()

// GET /api/news/articles - Get articles with optional filtering
router.get('/articles', 
  authenticateToken,
  articleFilterValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    // Build filters from query parameters
    const filters: ArticleFilters = {};
    
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.lat && req.query.lng) {
      filters.latitude = parseFloat(req.query.lat as string);
      filters.longitude = parseFloat(req.query.lng as string);
      if (req.query.radius) {
        filters.radius = parseInt(req.query.radius as string);
      }
    }
    if (req.query.source) {
      filters.source = req.query.source as string;
    }
    if (req.query.biasScoreMin) {
      filters.biasScoreMin = parseInt(req.query.biasScoreMin as string);
    }
    if (req.query.biasScoreMax) {
      filters.biasScoreMax = parseInt(req.query.biasScoreMax as string);
    }
    if (req.query.keyword) {
      filters.keyword = req.query.keyword as string;
    }

    logger.info('Articles requested:', {
      userId: (req as any).user?.id,
      filters,
      pagination: { page, limit, offset }
    });

    // Try to get from cache first
    const cachedResult = await CacheService.getCachedArticlesList(filters, limit, offset);
    
    if (cachedResult) {
      const totalPages = Math.ceil(cachedResult.totalCount / limit);
      
      return res.json({
        articles: cachedResult.articles,
        pagination: {
          page,
          limit,
          total: cachedResult.totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters,
        cached: true
      });
    }

    // Get articles and total count from database
    const [articles, totalCount] = await Promise.all([
      ArticleModel.findWithFilters(filters, limit, offset),
      ArticleModel.countWithFilters(filters)
    ]);

    // Cache the results
    await CacheService.cacheArticlesList(articles, totalCount, filters, limit, offset);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      articles,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters,
      cached: false
    });
  })
)

// GET /api/news/article/:id - Get specific article details
router.get('/article/:id',
  authenticateToken,
  [idValidation],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const articleId = parseInt(req.params.id);
    
    logger.info('Article details requested:', {
      userId: (req as any).user?.id,
      articleId
    });

    // Try to get from cache first
    let article = await CacheService.getCachedArticle(articleId);
    let cached = true;

    if (!article) {
      // Get from database
      article = await ArticleModel.findById(articleId);
      cached = false;

      if (article) {
        // Cache the article for future requests
        await CacheService.cacheArticle(article);
      }
    }
    
    if (!article) {
      return res.status(404).json({
        error: {
          code: 'ArticleNotFound',
          message: `Article with ID ${articleId} not found`,
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({ article, cached });
  })
)

// POST /api/news/refresh - Trigger news refresh
router.post('/refresh',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('News refresh requested:', {
      userId: (req as any).user?.id
    })

    try {
      const newsService = new NewsAggregationService();
      const result = await newsService.aggregateAndSaveNews();
      
      logger.info('Manual news refresh completed:', {
        userId: (req as any).user?.id,
        result
      });

      res.json({
        message: 'News refresh completed successfully',
        status: 'completed',
        result: {
          totalFetched: result.total,
          totalSaved: result.saved,
          errors: result.errors
        }
      });
    } catch (error) {
      logger.error('Error in manual news refresh:', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        error: {
          code: 'NewsRefreshFailed',
          message: 'Failed to refresh news',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// GET /api/news/sources - Get available news sources
router.get('/sources',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('News sources requested:', {
      userId: (req as any).user?.id
    });

    // Try to get from cache first
    let sources = await CacheService.getCachedSources();
    let cached = true;

    if (!sources) {
      // Get from database
      sources = await ArticleModel.getUniqueSources();
      cached = false;

      // Cache the sources
      await CacheService.cacheSources(sources);
    }
    
    res.json({
      sources: sources.map(source => ({
        name: source,
        displayName: source
      })),
      cached
    });
  })
)

// GET /api/news/statistics - Get news database statistics
router.get('/statistics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('News statistics requested:', {
      userId: (req as any).user?.id
    });

    // Try to get from cache first
    let stats = await CacheService.getCachedStatistics();
    let cached = true;

    if (!stats) {
      // Get from database
      stats = await ArticleModel.getStatistics();
      cached = false;

      // Cache the statistics
      await CacheService.cacheStatistics(stats);
    }
    
    res.json({
      statistics: stats,
      cached
    });
  })
)

// POST /api/news/articles - Create new article (for testing/admin purposes)
router.post('/articles',
  authenticateToken,
  articleValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    logger.info('Article creation requested:', {
      userId: (req as any).user?.id,
      title: req.body.title,
      source: req.body.source
    });

    const article = await ArticleModel.create(req.body);
    
    // Invalidate relevant caches
    await Promise.all([
      CacheService.invalidateArticlesList(),
      CacheService.invalidateSources(),
      CacheService.invalidateStatistics()
    ]);
    
    res.status(201).json({
      article,
      message: 'Article created successfully'
    });
  })
)

// PUT /api/news/article/:id - Update article
router.put('/article/:id',
  authenticateToken,
  [idValidation, ...articleValidation],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const articleId = parseInt(req.params.id);
    
    logger.info('Article update requested:', {
      userId: (req as any).user?.id,
      articleId,
      updates: Object.keys(req.body)
    });

    const article = await ArticleModel.update(articleId, req.body);
    
    if (!article) {
      return res.status(404).json({
        error: {
          code: 'ArticleNotFound',
          message: `Article with ID ${articleId} not found`,
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Invalidate relevant caches
    await Promise.all([
      CacheService.invalidateArticle(articleId),
      CacheService.invalidateArticlesList(),
      CacheService.invalidateSources(),
      CacheService.invalidateStatistics()
    ]);

    res.json({
      article,
      message: 'Article updated successfully'
    });
  })
)

// DELETE /api/news/article/:id - Delete article
router.delete('/article/:id',
  authenticateToken,
  [idValidation],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const articleId = parseInt(req.params.id);
    
    logger.info('Article deletion requested:', {
      userId: (req as any).user?.id,
      articleId
    });

    const deleted = await ArticleModel.deleteById(articleId);
    
    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'ArticleNotFound',
          message: `Article with ID ${articleId} not found`,
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Invalidate relevant caches
    await Promise.all([
      CacheService.invalidateArticle(articleId),
      CacheService.invalidateArticlesList(),
      CacheService.invalidateSources(),
      CacheService.invalidateStatistics()
    ]);

    res.json({
      message: 'Article deleted successfully'
    });
  })
)

// GET /api/news/scheduler/status - Get scheduler status
router.get('/scheduler/status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Scheduler status requested:', {
      userId: (req as any).user?.id
    });

    const scheduler = getNewsScheduler();
    const status = scheduler.getStatus();
    
    res.json({
      scheduler: status
    });
  })
)

// POST /api/news/scheduler/run - Manually run news aggregation
router.post('/scheduler/run',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Manual scheduler run requested:', {
      userId: (req as any).user?.id
    });

    const scheduler = getNewsScheduler();
    const result = await scheduler.runNewsAggregation();
    
    if (result.success) {
      res.json({
        message: 'News aggregation completed successfully',
        result: result.stats
      });
    } else {
      res.status(500).json({
        error: {
          code: 'SchedulerRunFailed',
          message: result.error || 'Failed to run news aggregation',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// POST /api/news/scheduler/cleanup - Manually run cleanup
router.post('/scheduler/cleanup',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Manual cleanup requested:', {
      userId: (req as any).user?.id
    });

    const scheduler = getNewsScheduler();
    const result = await scheduler.runCleanup();
    
    if (result.success) {
      res.json({
        message: 'Cleanup completed successfully',
        deletedCount: result.deletedCount
      });
    } else {
      res.status(500).json({
        error: {
          code: 'CleanupFailed',
          message: result.error || 'Failed to run cleanup',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// POST /api/news/bias/analyze/:id - Analyze bias for specific article
router.post('/bias/analyze/:id',
  authenticateToken,
  [idValidation],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const articleId = parseInt(req.params.id);
    const preferredProvider = req.body.provider as string | undefined;
    
    logger.info('Bias analysis requested for article:', {
      userId: (req as any).user?.id,
      articleId,
      preferredProvider
    });

    const result = await BiasAnalysisService.analyzeAndStoreArticle(articleId, preferredProvider);
    
    if (!result) {
      return res.status(404).json({
        error: {
          code: 'ArticleNotFound',
          message: `Article with ID ${articleId} not found`,
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: 'Bias analysis completed successfully',
      result: {
        biasScore: result.biasScore,
        biasAnalysis: result.biasAnalysis,
        provider: result.provider,
        confidence: result.confidence,
        processingTime: result.processingTime
      }
    });
  })
)

// POST /api/news/bias/analyze-batch - Analyze bias for multiple articles
router.post('/bias/analyze-batch',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { articleIds, provider } = req.body;
    
    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'InvalidInput',
          message: 'articleIds must be a non-empty array of article IDs',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (articleIds.length > 50) {
      return res.status(400).json({
        error: {
          code: 'BatchTooLarge',
          message: 'Maximum 50 articles can be analyzed in a single batch',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.info('Batch bias analysis requested:', {
      userId: (req as any).user?.id,
      articleCount: articleIds.length,
      preferredProvider: provider
    });

    const results = await BiasAnalysisService.batchAnalyzeArticles(articleIds, provider);
    
    res.json({
      message: 'Batch bias analysis completed',
      results: Object.fromEntries(results),
      processed: results.size,
      total: articleIds.length
    });
  })
)

// POST /api/news/bias/analyze-recent - Analyze bias for recent articles
router.post('/bias/analyze-recent',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Recent articles bias analysis requested:', {
      userId: (req as any).user?.id
    });

    await BiasAnalysisService.analyzeRecentArticles();
    
    res.json({
      message: 'Recent articles bias analysis completed successfully'
    });
  })
)

// GET /api/news/bias/articles-needing-analysis - Get articles that need bias analysis
router.get('/bias/articles-needing-analysis',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    logger.info('Articles needing bias analysis requested:', {
      userId: (req as any).user?.id,
      limit
    });

    const articleIds = await BiasAnalysisService.getArticlesNeedingAnalysis(limit);
    
    res.json({
      articleIds,
      count: articleIds.length
    });
  })
)

// DELETE /api/news/bias/cache - Clear bias analysis cache
router.delete('/bias/cache',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Bias analysis cache clear requested:', {
      userId: (req as any).user?.id
    });

    await BiasAnalysisService.clearCache();
    
    res.json({
      message: 'Bias analysis cache cleared successfully'
    });
  })
)

// GET /api/news/bias/cache/stats - Get bias analysis cache statistics
router.get('/bias/cache/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Bias analysis cache stats requested:', {
      userId: (req as any).user?.id
    });

    const stats = await BiasAnalysisService.getCacheStats();
    
    res.json({
      cacheStats: stats
    });
  })
)

// GET /api/news/bias/providers/health - Get LLM provider health status
router.get('/bias/providers/health',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('LLM provider health status requested:', {
      userId: (req as any).user?.id
    });

    try {
      const health = await BiasAnalysisService.getProviderHealth();
      
      res.json({
        providerHealth: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get provider health status:', {
        userId: (req as any).user?.id,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'ProviderHealthCheckFailed',
          message: 'Failed to retrieve provider health status',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// GET /api/news/bias/providers/performance - Get LLM provider performance metrics
router.get('/bias/providers/performance',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('LLM provider performance metrics requested:', {
      userId: (req as any).user?.id
    });

    try {
      const performance = await BiasAnalysisService.getPerformanceSummary();
      
      // Convert Map to object for JSON serialization
      const performanceObj = Object.fromEntries(performance);
      
      res.json({
        providerPerformance: performanceObj,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get provider performance metrics:', {
        userId: (req as any).user?.id,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'ProviderPerformanceFailed',
          message: 'Failed to retrieve provider performance metrics',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// POST /api/news/bias/providers/reset-circuit-breakers - Reset all circuit breakers
router.post('/bias/providers/reset-circuit-breakers',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Circuit breaker reset requested:', {
      userId: (req as any).user?.id
    });

    try {
      BiasAnalysisService.resetCircuitBreakers();
      
      res.json({
        message: 'All circuit breakers have been reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to reset circuit breakers:', {
        userId: (req as any).user?.id,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'CircuitBreakerResetFailed',
          message: 'Failed to reset circuit breakers',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// GET /api/news/cache/stats - Get general cache statistics
router.get('/cache/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Cache stats requested:', {
      userId: (req as any).user?.id
    });

    const stats = await CacheService.getCacheStats();
    
    res.json({
      cacheStats: stats
    });
  })
)

// DELETE /api/news/cache - Clear all news-related caches
router.delete('/cache',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Cache clear requested:', {
      userId: (req as any).user?.id
    });

    await CacheService.invalidateAll();
    
    res.json({
      message: 'All caches cleared successfully'
    });
  })
)

// DELETE /api/news/cache/articles - Clear articles list cache
router.delete('/cache/articles',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Articles cache clear requested:', {
      userId: (req as any).user?.id
    });

    await CacheService.invalidateArticlesList();
    
    res.json({
      message: 'Articles list cache cleared successfully'
    });
  })
)

// GET /api/news/bias/providers - Get available LLM providers
router.get('/bias/providers',
  authenticateToken,
  asyncHandler(async (req, res) => {
    logger.info('Available providers requested:', {
      userId: (req as any).user?.id
    });

    try {
      const providers = await BiasAnalysisService.getAvailableProviders();
      const configurations = await BiasAnalysisService.getProviderConfigurations();
      
      res.json({
        providers,
        configurations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get available providers:', {
        userId: (req as any).user?.id,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'ProvidersListFailed',
          message: 'Failed to retrieve available providers',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// POST /api/news/bias/providers/:provider/test - Test a specific provider
router.post('/bias/providers/:provider/test',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const providerName = req.params.provider;
    const sampleRequest = req.body.sampleRequest;
    
    logger.info('Provider test requested:', {
      userId: (req as any).user?.id,
      provider: providerName
    });

    try {
      const testResult = await BiasAnalysisService.testProvider(providerName, sampleRequest);
      
      res.json({
        provider: providerName,
        testResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to test provider:', {
        userId: (req as any).user?.id,
        provider: providerName,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'ProviderTestFailed',
          message: `Failed to test provider '${providerName}'`,
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// DELETE /api/news/bias/cache/:provider - Clear cache for specific provider
router.delete('/bias/cache/:provider',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const provider = req.params.provider;
    
    logger.info('Provider-specific bias analysis cache clear requested:', {
      userId: (req as any).user?.id,
      provider
    });

    try {
      await BiasAnalysisService.clearProviderCache(provider);
      
      res.json({
        message: `Bias analysis cache cleared successfully for provider '${provider}'`,
        provider
      });
    } catch (error) {
      logger.error('Failed to clear provider-specific cache:', {
        userId: (req as any).user?.id,
        provider,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'CacheClearFailed',
          message: `Failed to clear cache for provider '${provider}'`,
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

// POST /api/news/bias/analyze-content - Analyze bias for arbitrary content (not stored)
router.post('/bias/analyze-content',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { title, content, summary, source, provider } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        error: {
          code: 'InvalidInput',
          message: 'title and content are required fields',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.info('Content bias analysis requested:', {
      userId: (req as any).user?.id,
      title: title.substring(0, 100),
      preferredProvider: provider
    });

    try {
      const request = { title, content, summary, source };
      const result = await BiasAnalysisService.analyzeArticle(request, provider);
      
      res.json({
        message: 'Content bias analysis completed successfully',
        result: {
          biasScore: result.biasScore,
          biasAnalysis: result.biasAnalysis,
          provider: result.provider,
          confidence: result.confidence,
          processingTime: result.processingTime
        }
      });
    } catch (error) {
      logger.error('Failed to analyze content bias:', {
        userId: (req as any).user?.id,
        error: (error as Error).message
      });

      res.status(500).json({
        error: {
          code: 'ContentAnalysisFailed',
          message: 'Failed to analyze content bias',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
)

export default router