import { 
  LLMProvider, 
  ProviderType, 
  BiasAnalysisRequest, 
  BiasAnalysisResult,
  ProviderError,
  ProviderErrorType,
  ProviderHealth 
} from '../../types/llmProvider.js';
import { ProviderFactory } from './ProviderFactory.js';
import { ProviderHealthMonitor } from './ProviderHealthMonitor.js';
import { ProviderConfigManager } from './ProviderConfigManager.js';
import { redisClient, ensureRedisConnection } from '../../utils/redis.js';
import { logger } from '../../utils/logger.js';

/**
 * Manages provider fallback logic and graceful degradation
 * Implements intelligent provider selection based on health and performance
 */
export class ProviderFallbackManager {
  private static readonly FALLBACK_CACHE_PREFIX = 'llm_fallback_result:';
  private static readonly FALLBACK_CACHE_TTL = 3600; // 1 hour
  private static readonly PERFORMANCE_THRESHOLD_MS = 10000; // 10 seconds
  private static readonly ERROR_THRESHOLD_COUNT = 3; // Max consecutive errors before switching
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes

  private factory: ProviderFactory;
  private healthMonitor: ProviderHealthMonitor;
  private configManager: ProviderConfigManager;
  private providerErrors: Map<ProviderType, number> = new Map();
  private circuitBreakers: Map<ProviderType, number> = new Map(); // Timestamp when circuit opens
  private lastSuccessfulProvider: ProviderType | null = null;

  constructor(
    factory: ProviderFactory,
    healthMonitor: ProviderHealthMonitor,
    configManager: ProviderConfigManager
  ) {
    this.factory = factory;
    this.healthMonitor = healthMonitor;
    this.configManager = configManager;
  }

  /**
   * Analyze article with automatic fallback handling
   */
  public async analyzeWithFallback(
    request: BiasAnalysisRequest, 
    preferredProvider?: string
  ): Promise<BiasAnalysisResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    // Get ordered list of providers to try, with preferred provider first if specified
    const providerChain = await this.getProviderChain(preferredProvider);
    
    logger.info('Starting bias analysis with fallback', {
      providerChain: providerChain.map(p => p.type),
      preferredProvider,
      title: request.title.substring(0, 100)
    });

    // Try each provider in the chain
    for (const provider of providerChain) {
      // Skip if circuit breaker is open
      if (this.isCircuitBreakerOpen(provider.type)) {
        logger.warn('Skipping provider due to circuit breaker', { provider: provider.type });
        continue;
      }

      try {
        const result = await this.attemptAnalysis(provider, request);
        
        // Record success
        this.recordSuccess(provider.type);
        this.lastSuccessfulProvider = provider.type;
        
        // Record performance metrics
        const responseTime = Date.now() - startTime;
        await this.healthMonitor.recordMetrics(provider.type, responseTime, true);
        
        logger.info('Bias analysis completed successfully', {
          provider: provider.type,
          responseTime,
          biasScore: result.biasScore
        });

        // Cache successful result for fallback
        await this.cacheFallbackResult(request, result);
        
        return result;

      } catch (error) {
        lastError = error;
        const responseTime = Date.now() - startTime;
        
        // Record failure
        this.recordFailure(provider.type);
        await this.healthMonitor.recordMetrics(provider.type, responseTime, false);
        
        logger.warn('Provider failed, trying next in chain', {
          provider: provider.type,
          error: error.message,
          responseTime,
          remainingProviders: providerChain.length - providerChain.indexOf(provider) - 1
        });

        // Check if we should open circuit breaker
        if (this.shouldOpenCircuitBreaker(provider.type)) {
          this.openCircuitBreaker(provider.type);
        }
      }
    }

    // All providers failed, try cached fallback
    logger.error('All providers failed, attempting cached fallback', {
      totalProviders: providerChain.length,
      lastError: lastError?.message
    });

    const cachedResult = await this.getCachedFallbackResult(request);
    if (cachedResult) {
      logger.info('Using cached fallback result');
      return {
        ...cachedResult,
        provider: 'cached_fallback',
        confidence: Math.max(0, cachedResult.confidence - 20) // Reduce confidence for cached results
      };
    }

    // Final fallback - return neutral analysis
    logger.error('No cached fallback available, using neutral analysis');
    return this.getNeutralFallbackResult();
  }

  /**
   * Get health status of all providers in the fallback chain
   */
  public async getProviderChainHealth(): Promise<{
    primary: { type: ProviderType; healthy: boolean; responseTime?: number };
    fallbacks: Array<{ type: ProviderType; healthy: boolean; responseTime?: number }>;
    circuitBreakers: Array<{ type: ProviderType; openUntil: Date }>;
  }> {
    const primaryProvider = this.configManager.getPrimaryProvider();
    const fallbackProviders = this.configManager.getFallbackProviders();
    
    const healthStatus = await this.healthMonitor.getHealthStatus();
    
    const primary = {
      type: primaryProvider,
      healthy: healthStatus.get(primaryProvider)?.available || false,
      responseTime: healthStatus.get(primaryProvider)?.responseTime
    };

    const fallbacks = fallbackProviders.map(type => ({
      type,
      healthy: healthStatus.get(type)?.available || false,
      responseTime: healthStatus.get(type)?.responseTime
    }));

    const circuitBreakers = Array.from(this.circuitBreakers.entries())
      .filter(([_, timestamp]) => timestamp > Date.now())
      .map(([type, timestamp]) => ({
        type,
        openUntil: new Date(timestamp)
      }));

    return { primary, fallbacks, circuitBreakers };
  }

  /**
   * Force reset of all circuit breakers
   */
  public resetCircuitBreakers(): void {
    this.circuitBreakers.clear();
    this.providerErrors.clear();
    logger.info('All circuit breakers reset');
  }

  /**
   * Get performance summary for all providers
   */
  public async getPerformanceSummary(): Promise<Map<ProviderType, {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    recentErrors: number;
    circuitBreakerOpen: boolean;
  }>> {
    const summary = new Map();
    const providers = this.factory.getAllProviders();
    
    for (const [type] of providers) {
      const metrics = await this.healthMonitor.getProviderMetrics(type);
      summary.set(type, {
        ...metrics,
        circuitBreakerOpen: this.isCircuitBreakerOpen(type)
      });
    }
    
    return summary;
  }

  /**
   * Get ordered provider chain based on health and performance
   */
  private async getProviderChain(preferredProvider?: string): Promise<LLMProvider[]> {
    const primaryProvider = this.configManager.getPrimaryProvider();
    const fallbackProviders = this.configManager.getFallbackProviders();
    
    // Start with configured order, but prioritize preferred provider if specified
    let orderedTypes: ProviderType[];
    if (preferredProvider && this.factory.getProvider(preferredProvider as ProviderType)) {
      const preferredType = preferredProvider as ProviderType;
      orderedTypes = [
        preferredType,
        ...([primaryProvider, ...fallbackProviders].filter(type => type !== preferredType))
      ];
    } else {
      orderedTypes = [primaryProvider, ...fallbackProviders];
    }
    const providers: LLMProvider[] = [];
    
    // Get health status for intelligent ordering
    const healthStatus = await this.healthMonitor.getHealthStatus();
    const performanceMetrics = await this.getPerformanceSummary();
    
    // Sort providers by health and performance
    const sortedTypes = orderedTypes
      .filter(type => {
        const provider = this.factory.getProvider(type);
        return provider && !this.isCircuitBreakerOpen(type);
      })
      .sort((a, b) => {
        const aHealth = healthStatus.get(a);
        const bHealth = healthStatus.get(b);
        const aMetrics = performanceMetrics.get(a);
        const bMetrics = performanceMetrics.get(b);
        
        // Prioritize healthy providers
        if (aHealth?.available && !bHealth?.available) return -1;
        if (!aHealth?.available && bHealth?.available) return 1;
        
        // Among healthy providers, prioritize better performance
        if (aHealth?.available && bHealth?.available) {
          const aScore = this.calculateProviderScore(aHealth, aMetrics);
          const bScore = this.calculateProviderScore(bHealth, bMetrics);
          return bScore - aScore; // Higher score is better
        }
        
        // Maintain original order for unhealthy providers
        return orderedTypes.indexOf(a) - orderedTypes.indexOf(b);
      });
    
    // Convert to provider instances
    for (const type of sortedTypes) {
      const provider = this.factory.getProvider(type);
      if (provider) {
        providers.push(provider);
      }
    }
    
    return providers;
  }

  /**
   * Calculate provider score based on health and performance
   */
  private calculateProviderScore(
    health: ProviderHealth, 
    metrics: any
  ): number {
    let score = 0;
    
    // Base score for being available
    if (health.available) {
      score += 100;
    }
    
    // Bonus for good response time
    if (health.responseTime && health.responseTime < this.PERFORMANCE_THRESHOLD_MS) {
      score += Math.max(0, 50 - (health.responseTime / 200)); // Up to 50 points
    }
    
    // Bonus for high success rate
    if (metrics?.successRate) {
      score += metrics.successRate * 0.5; // Up to 50 points
    }
    
    // Penalty for recent errors
    if (metrics?.recentErrors) {
      score -= metrics.recentErrors * 10;
    }
    
    return Math.max(0, score);
  }

  /**
   * Attempt analysis with a specific provider
   */
  private async attemptAnalysis(
    provider: LLMProvider, 
    request: BiasAnalysisRequest
  ): Promise<BiasAnalysisResult> {
    const timeout = provider.config.timeout || 30000;
    
    return Promise.race([
      provider.analyzeArticle(request),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new ProviderError(
          ProviderErrorType.TIMEOUT_ERROR,
          provider.name,
          `Analysis timed out after ${timeout}ms`
        )), timeout)
      )
    ]);
  }

  /**
   * Record successful provider usage
   */
  private recordSuccess(providerType: ProviderType): void {
    this.providerErrors.set(providerType, 0);
    
    // Close circuit breaker if it was open
    if (this.circuitBreakers.has(providerType)) {
      this.circuitBreakers.delete(providerType);
      logger.info('Circuit breaker closed after successful request', { provider: providerType });
    }
  }

  /**
   * Record provider failure
   */
  private recordFailure(providerType: ProviderType): void {
    const currentErrors = this.providerErrors.get(providerType) || 0;
    this.providerErrors.set(providerType, currentErrors + 1);
  }

  /**
   * Check if circuit breaker should be opened
   */
  private shouldOpenCircuitBreaker(providerType: ProviderType): boolean {
    const errorCount = this.providerErrors.get(providerType) || 0;
    return errorCount >= this.ERROR_THRESHOLD_COUNT;
  }

  /**
   * Open circuit breaker for a provider
   */
  private openCircuitBreaker(providerType: ProviderType): void {
    const openUntil = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
    this.circuitBreakers.set(providerType, openUntil);
    
    logger.warn('Circuit breaker opened for provider', {
      provider: providerType,
      openUntil: new Date(openUntil),
      errorCount: this.providerErrors.get(providerType)
    });
  }

  /**
   * Check if circuit breaker is open for a provider
   */
  private isCircuitBreakerOpen(providerType: ProviderType): boolean {
    const openUntil = this.circuitBreakers.get(providerType);
    if (!openUntil) {
      return false;
    }
    
    if (Date.now() > openUntil) {
      // Circuit breaker timeout expired, close it
      this.circuitBreakers.delete(providerType);
      this.providerErrors.set(providerType, 0);
      logger.info('Circuit breaker timeout expired, closing', { provider: providerType });
      return false;
    }
    
    return true;
  }

  /**
   * Cache successful result for fallback use
   */
  private async cacheFallbackResult(
    request: BiasAnalysisRequest, 
    result: BiasAnalysisResult
  ): Promise<void> {
    try {
      await ensureRedisConnection();
      
      const cacheKey = this.generateFallbackCacheKey(request);
      const cacheData = {
        ...result,
        cachedAt: new Date().toISOString(),
        originalProvider: result.provider
      };
      
      await redisClient.setEx(
        cacheKey,
        this.FALLBACK_CACHE_TTL,
        JSON.stringify(cacheData)
      );
      
    } catch (error) {
      logger.warn('Failed to cache fallback result', { error: (error as Error).message });
    }
  }

  /**
   * Get cached fallback result
   */
  private async getCachedFallbackResult(request: BiasAnalysisRequest): Promise<BiasAnalysisResult | null> {
    try {
      await ensureRedisConnection();
      
      const cacheKey = this.generateFallbackCacheKey(request);
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        logger.info('Retrieved cached fallback result', {
          originalProvider: data.originalProvider,
          cachedAt: data.cachedAt
        });
        return data;
      }
      
    } catch (error) {
      logger.warn('Failed to get cached fallback result', { error: (error as Error).message });
    }
    
    return null;
  }

  /**
   * Generate cache key for fallback results
   */
  private generateFallbackCacheKey(request: BiasAnalysisRequest): string {
    const content = `${request.title}|${request.content}|${request.source || ''}`;
    const hash = Buffer.from(content).toString('base64').substring(0, 32);
    return `${ProviderFallbackManager.FALLBACK_CACHE_PREFIX}${hash}`;
  }

  /**
   * Get neutral fallback result when all else fails
   */
  private getNeutralFallbackResult(): BiasAnalysisResult {
    return {
      biasScore: 50,
      biasAnalysis: {
        politicalLean: 'center',
        factualAccuracy: 50,
        emotionalTone: 50,
        confidence: 0
      },
      provider: 'neutral_fallback',
      confidence: 0,
      processingTime: 0
    };
  }
}