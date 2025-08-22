import { 
  LLMProvider, 
  ProviderHealth, 
  ProviderType 
} from '../../types/llmProvider.js';
import { ProviderFactory } from './ProviderFactory.js';
import { logger } from '../../utils/logger.js';
import { redisClient, ensureRedisConnection } from '../../utils/redis.js';

/**
 * Health monitoring service for LLM providers
 * Tracks provider availability and performance metrics
 */
export class ProviderHealthMonitor {
  private static readonly HEALTH_CACHE_PREFIX = 'llm_provider_health:';
  private static readonly HEALTH_CACHE_TTL = 300; // 5 minutes
  private static readonly METRICS_CACHE_PREFIX = 'llm_provider_metrics:';
  private static readonly METRICS_CACHE_TTL = 3600; // 1 hour

  private factory: ProviderFactory;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(factory: ProviderFactory) {
    this.factory = factory;
  }

  /**
   * Start health monitoring for all providers
   */
  public startMonitoring(intervalMs: number = 300000): void { // Default 5 minutes
    if (this.isMonitoring) {
      logger.warn('Provider health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    
    // Run initial health check
    this.performHealthCheck().catch(error => 
      logger.error('Initial health check failed', { error: error.message })
    );

    // Schedule periodic health checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Scheduled health check failed', { error: error.message });
      }
    }, intervalMs);

    logger.info('Provider health monitoring started', { intervalMs });
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    logger.info('Provider health monitoring stopped');
  }

  /**
   * Get current health status for all providers
   */
  public async getHealthStatus(): Promise<Map<ProviderType, ProviderHealth>> {
    const healthStatus = new Map<ProviderType, ProviderHealth>();
    const providers = this.factory.getAllProviders();

    for (const [type, provider] of providers) {
      try {
        // Try to get cached health status first
        const cachedHealth = await this.getCachedHealth(type);
        if (cachedHealth) {
          healthStatus.set(type, cachedHealth);
          continue;
        }

        // If no cached status, perform fresh health check
        const health = await provider.checkHealth();
        healthStatus.set(type, health);
        
        // Cache the result
        await this.cacheHealth(type, health);
        
      } catch (error) {
        logger.error('Failed to get health status', {
          provider: type,
          error: error.message
        });
        
        // Set as unavailable if health check fails
        healthStatus.set(type, {
          available: false,
          error: error.message,
          lastChecked: new Date()
        });
      }
    }

    return healthStatus;
  }

  /**
   * Get health status for a specific provider
   */
  public async getProviderHealth(type: ProviderType): Promise<ProviderHealth | null> {
    const provider = this.factory.getProvider(type);
    if (!provider) {
      return null;
    }

    try {
      // Try cached health first
      const cachedHealth = await this.getCachedHealth(type);
      if (cachedHealth) {
        return cachedHealth;
      }

      // Perform fresh health check
      const health = await provider.checkHealth();
      await this.cacheHealth(type, health);
      return health;
      
    } catch (error) {
      logger.error('Failed to get provider health', {
        provider: type,
        error: error.message
      });
      
      return {
        available: false,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Record provider performance metrics
   */
  public async recordMetrics(
    providerType: ProviderType, 
    responseTime: number, 
    success: boolean
  ): Promise<void> {
    try {
      await ensureRedisConnection();
      
      const metricsKey = `${ProviderHealthMonitor.METRICS_CACHE_PREFIX}${providerType}`;
      const timestamp = Date.now();
      
      // Store metrics as a sorted set with timestamp as score
      const metricsData = JSON.stringify({
        responseTime,
        success,
        timestamp
      });
      
      await redisClient.zAdd(metricsKey, {
        score: timestamp,
        value: metricsData
      });
      
      // Keep only last 100 metrics entries
      await redisClient.zRemRangeByRank(metricsKey, 0, -101);
      
      // Set expiration
      await redisClient.expire(metricsKey, ProviderHealthMonitor.METRICS_CACHE_TTL);
      
    } catch (error) {
      logger.error('Failed to record provider metrics', {
        provider: providerType,
        error: error.message
      });
    }
  }

  /**
   * Get performance metrics for a provider
   */
  public async getProviderMetrics(providerType: ProviderType): Promise<{
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    recentErrors: number;
  }> {
    try {
      await ensureRedisConnection();
      
      const metricsKey = `${ProviderHealthMonitor.METRICS_CACHE_PREFIX}${providerType}`;
      const metrics = await redisClient.zRange(metricsKey, 0, -1);
      
      if (metrics.length === 0) {
        return {
          averageResponseTime: 0,
          successRate: 0,
          totalRequests: 0,
          recentErrors: 0
        };
      }
      
      let totalResponseTime = 0;
      let successCount = 0;
      let recentErrors = 0;
      const recentThreshold = Date.now() - (15 * 60 * 1000); // Last 15 minutes
      
      for (const metricData of metrics) {
        const metric = JSON.parse(metricData);
        totalResponseTime += metric.responseTime;
        
        if (metric.success) {
          successCount++;
        } else if (metric.timestamp > recentThreshold) {
          recentErrors++;
        }
      }
      
      return {
        averageResponseTime: Math.round(totalResponseTime / metrics.length),
        successRate: Math.round((successCount / metrics.length) * 100),
        totalRequests: metrics.length,
        recentErrors
      };
      
    } catch (error) {
      logger.error('Failed to get provider metrics', {
        provider: providerType,
        error: error.message
      });
      
      return {
        averageResponseTime: 0,
        successRate: 0,
        totalRequests: 0,
        recentErrors: 0
      };
    }
  }

  /**
   * Get overall system health summary
   */
  public async getSystemHealthSummary(): Promise<{
    totalProviders: number;
    healthyProviders: number;
    primaryProviderHealthy: boolean;
    recommendedProvider: ProviderType | null;
  }> {
    const healthStatus = await this.getHealthStatus();
    const healthyProviders = Array.from(healthStatus.values())
      .filter(health => health.available).length;
    
    // Check if primary provider is healthy
    const primaryProvider = this.factory.getBestProvider().then(p => p.type).catch(() => null);
    const primaryProviderHealthy = await primaryProvider !== null;
    
    // Find the best available provider
    let recommendedProvider: ProviderType | null = null;
    try {
      const bestProvider = await this.factory.getBestProvider();
      recommendedProvider = bestProvider.type;
    } catch (error) {
      // No healthy providers available
    }
    
    return {
      totalProviders: healthStatus.size,
      healthyProviders,
      primaryProviderHealthy,
      recommendedProvider
    };
  }

  /**
   * Perform health check for all providers
   */
  private async performHealthCheck(): Promise<void> {
    logger.debug('Performing provider health check');
    
    const providers = this.factory.getAllProviders();
    const healthCheckPromises = Array.from(providers.entries()).map(
      async ([type, provider]) => {
        try {
          const health = await provider.checkHealth();
          await this.cacheHealth(type, health);
          
          logger.debug('Provider health check completed', {
            provider: type,
            available: health.available,
            responseTime: health.responseTime
          });
          
        } catch (error) {
          logger.warn('Provider health check failed', {
            provider: type,
            error: error.message
          });
          
          // Cache the failure
          await this.cacheHealth(type, {
            available: false,
            error: error.message,
            lastChecked: new Date()
          });
        }
      }
    );
    
    await Promise.all(healthCheckPromises);
    logger.debug('All provider health checks completed');
  }

  /**
   * Cache provider health status
   */
  private async cacheHealth(providerType: ProviderType, health: ProviderHealth): Promise<void> {
    try {
      await ensureRedisConnection();
      
      const cacheKey = `${ProviderHealthMonitor.HEALTH_CACHE_PREFIX}${providerType}`;
      await redisClient.setEx(
        cacheKey,
        ProviderHealthMonitor.HEALTH_CACHE_TTL,
        JSON.stringify(health)
      );
      
    } catch (error) {
      logger.warn('Failed to cache provider health', {
        provider: providerType,
        error: error.message
      });
    }
  }

  /**
   * Get cached provider health status
   */
  private async getCachedHealth(providerType: ProviderType): Promise<ProviderHealth | null> {
    try {
      await ensureRedisConnection();
      
      const cacheKey = `${ProviderHealthMonitor.HEALTH_CACHE_PREFIX}${providerType}`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        const health = JSON.parse(cached);
        // Convert lastChecked back to Date object
        health.lastChecked = new Date(health.lastChecked);
        return health;
      }
      
    } catch (error) {
      logger.warn('Failed to get cached provider health', {
        provider: providerType,
        error: error.message
      });
    }
    
    return null;
  }
}