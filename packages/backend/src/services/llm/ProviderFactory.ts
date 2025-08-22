import { 
  LLMProvider, 
  ProviderType, 
  ProviderFactoryConfig, 
  ProviderConfig,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * Factory for creating and managing LLM providers
 * Implements the factory pattern for dynamic provider selection
 */
export class ProviderFactory {
  private static instance: ProviderFactory | null = null;
  private providers: Map<ProviderType, LLMProvider> = new Map();
  private config: ProviderFactoryConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor(config: ProviderFactoryConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance of the factory
   */
  public static getInstance(config?: ProviderFactoryConfig): ProviderFactory {
    if (!ProviderFactory.instance) {
      if (!config) {
        throw new Error('Configuration required for first factory initialization');
      }
      ProviderFactory.instance = new ProviderFactory(config);
    }
    return ProviderFactory.instance;
  }

  /**
   * Initialize the factory and all configured providers
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing LLM provider factory', {
      primaryProvider: this.config.primaryProvider,
      fallbackProviders: this.config.fallbackProviders
    });

    // Create and initialize all configured providers
    const providerTypes = [this.config.primaryProvider, ...this.config.fallbackProviders];
    const uniqueProviders = [...new Set(providerTypes)];

    for (const providerType of uniqueProviders) {
      try {
        const provider = await this.createProvider(providerType);
        await provider.initialize();
        this.providers.set(providerType, provider);
        
        logger.info('Provider initialized successfully', { provider: providerType });
      } catch (error) {
        logger.error('Failed to initialize provider', {
          provider: providerType,
          error: error.message
        });
        
        // Don't throw here - we want to continue with other providers
        // The factory will handle unavailable providers gracefully
      }
    }

    // Start health check monitoring if enabled
    if (this.config.healthCheckInterval > 0) {
      this.startHealthCheckMonitoring();
    }

    logger.info('LLM provider factory initialization completed', {
      initializedProviders: Array.from(this.providers.keys())
    });
  }

  /**
   * Get the best available provider based on configuration and health
   */
  public async getBestProvider(): Promise<LLMProvider> {
    // Try primary provider first
    const primaryProvider = this.providers.get(this.config.primaryProvider);
    if (primaryProvider && await this.isProviderHealthy(primaryProvider)) {
      return primaryProvider;
    }

    // Try fallback providers in order
    for (const fallbackType of this.config.fallbackProviders) {
      const fallbackProvider = this.providers.get(fallbackType);
      if (fallbackProvider && await this.isProviderHealthy(fallbackProvider)) {
        logger.info('Using fallback provider', { 
          primary: this.config.primaryProvider,
          fallback: fallbackType 
        });
        return fallbackProvider;
      }
    }

    // If no healthy providers found, throw error
    throw new ProviderError(
      ProviderErrorType.CONFIGURATION_ERROR,
      'ProviderFactory',
      'No healthy providers available'
    );
  }

  /**
   * Get a specific provider by type
   */
  public getProvider(type: ProviderType): LLMProvider | null {
    return this.providers.get(type) || null;
  }

  /**
   * Get all available providers
   */
  public getAllProviders(): Map<ProviderType, LLMProvider> {
    return new Map(this.providers);
  }

  /**
   * Check health of all providers
   */
  public async checkAllProvidersHealth(): Promise<Map<ProviderType, boolean>> {
    const healthStatus = new Map<ProviderType, boolean>();

    for (const [type, provider] of this.providers) {
      try {
        const health = await provider.checkHealth();
        healthStatus.set(type, health.available);
      } catch (error) {
        logger.error('Health check failed for provider', {
          provider: type,
          error: (error as Error).message
        });
        healthStatus.set(type, false);
      }
    }

    return healthStatus;
  }

  /**
   * Cleanup all providers and stop monitoring
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up LLM provider factory');

    // Stop health check monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Cleanup all providers
    const cleanupPromises = Array.from(this.providers.values()).map(provider => 
      provider.cleanup().catch(error => 
        logger.error('Provider cleanup failed', {
          provider: provider.name,
          error: error.message
        })
      )
    );

    await Promise.all(cleanupPromises);
    this.providers.clear();

    logger.info('LLM provider factory cleanup completed');
  }

  /**
   * Update factory configuration
   */
  public updateConfig(newConfig: Partial<ProviderFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Provider factory configuration updated', {
      primaryProvider: this.config.primaryProvider,
      fallbackProviders: this.config.fallbackProviders
    });
  }

  /**
   * Create a provider instance based on type
   */
  private async createProvider(type: ProviderType): Promise<LLMProvider> {
    const config = this.config.providerConfigs[type];
    if (!config) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ProviderFactory',
        `No configuration found for provider type: ${type}`
      );
    }

    switch (type) {
      case 'openai':
        // Dynamic import to avoid circular dependencies
        const { OpenAIProvider } = await import('./providers/OpenAIProvider.js');
        // Validate required fields for OpenAI
        if (!config.apiKey) {
          throw new ProviderError(
            ProviderErrorType.CONFIGURATION_ERROR,
            'ProviderFactory',
            'OpenAI API key is required'
          );
        }
        return new OpenAIProvider({
          ...config,
          apiKey: config.apiKey
        });
        
      case 'grok':
        const { GrokProvider } = await import('./providers/GrokProvider.js');
        // Validate required fields for Grok
        if (!config.apiKey) {
          throw new ProviderError(
            ProviderErrorType.CONFIGURATION_ERROR,
            'ProviderFactory',
            'Grok API key is required'
          );
        }
        return new GrokProvider({
          ...config,
          apiKey: config.apiKey
        });
        
      case 'ollama':
        const { OllamaProvider } = await import('./providers/OllamaProvider.js');
        // Validate required fields for Ollama
        if (!config.baseUrl) {
          throw new ProviderError(
            ProviderErrorType.CONFIGURATION_ERROR,
            'ProviderFactory',
            'Ollama base URL is required'
          );
        }
        return new OllamaProvider({
          ...config,
          baseUrl: config.baseUrl
        });
        
      default:
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          'ProviderFactory',
          `Unsupported provider type: ${type}`
        );
    }
  }

  /**
   * Check if a provider is healthy
   */
  private async isProviderHealthy(provider: LLMProvider): Promise<boolean> {
    try {
      if (!provider.isInitialized()) {
        return false;
      }

      const health = await provider.checkHealth();
      return health.available;
    } catch (error) {
      logger.debug('Provider health check failed', {
        provider: provider.name,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Start periodic health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.checkAllProvidersHealth();
        
        logger.debug('Provider health check completed', {
          results: Object.fromEntries(healthStatus)
        });
        
        // Log warnings for unhealthy providers
        for (const [type, isHealthy] of healthStatus) {
          if (!isHealthy) {
            logger.warn('Provider is unhealthy', { provider: type });
          }
        }
      } catch (error) {
        logger.error('Health check monitoring failed', { error: (error as Error).message });
      }
    }, this.config.healthCheckInterval);

    logger.info('Health check monitoring started', {
      interval: this.config.healthCheckInterval
    });
  }
}

/**
 * Create provider factory configuration from environment variables
 */
export function createFactoryConfigFromEnv(): ProviderFactoryConfig {
  const primaryProvider = (process.env.BIAS_ANALYSIS_PROVIDER || 'openai') as ProviderType;
  const fallbackProviders = (process.env.BIAS_ANALYSIS_FALLBACK_PROVIDERS || 'openai,ollama')
    .split(',')
    .map(p => p.trim() as ProviderType)
    .filter(p => p !== primaryProvider);

  const providerConfigs: Record<ProviderType, ProviderConfig> = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      rateLimit: parseInt(process.env.OPENAI_RATE_LIMIT || '60')
    },
    grok: {
      apiKey: process.env.GROK_API_KEY,
      baseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
      model: process.env.GROK_MODEL || 'grok-beta',
      timeout: parseInt(process.env.GROK_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.GROK_MAX_RETRIES || '3'),
      rateLimit: parseInt(process.env.GROK_RATE_LIMIT || '60')
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2:7b',
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '2'),
      rateLimit: parseInt(process.env.OLLAMA_RATE_LIMIT || '30')
    }
  };

  return {
    primaryProvider,
    fallbackProviders,
    providerConfigs,
    healthCheckInterval: parseInt(process.env.LLM_HEALTH_CHECK_INTERVAL || '300000'), // 5 minutes
    enableFailover: process.env.LLM_ENABLE_FAILOVER !== 'false'
  };
}