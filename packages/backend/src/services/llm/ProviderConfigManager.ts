import { 
  ProviderConfig, 
  ProviderType, 
  ProviderFactoryConfig,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * Configuration manager for LLM providers
 * Handles environment variable parsing, validation, and configuration management
 */
export class ProviderConfigManager {
  private static instance: ProviderConfigManager | null = null;
  private config: ProviderFactoryConfig;

  private constructor() {
    this.config = this.loadConfigFromEnvironment();
    this.validateConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  /**
   * Get the complete factory configuration
   */
  public getFactoryConfig(): ProviderFactoryConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for a specific provider
   */
  public getProviderConfig(type: ProviderType): ProviderConfig {
    const config = this.config.providerConfigs[type];
    if (!config) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `No configuration found for provider: ${type}`
      );
    }
    return { ...config };
  }

  /**
   * Update provider configuration
   */
  public updateProviderConfig(type: ProviderType, updates: Partial<ProviderConfig>): void {
    const currentConfig = this.config.providerConfigs[type];
    if (!currentConfig) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Cannot update non-existent provider: ${type}`
      );
    }

    this.config.providerConfigs[type] = { ...currentConfig, ...updates };
    this.validateProviderConfig(type, this.config.providerConfigs[type]);
    
    logger.info('Provider configuration updated', { provider: type, updates });
  }

  /**
   * Get primary provider type
   */
  public getPrimaryProvider(): ProviderType {
    return this.config.primaryProvider;
  }

  /**
   * Get fallback providers in priority order
   */
  public getFallbackProviders(): ProviderType[] {
    return [...this.config.fallbackProviders];
  }

  /**
   * Update primary provider
   */
  public setPrimaryProvider(type: ProviderType): void {
    if (!this.config.providerConfigs[type]) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Cannot set unconfigured provider as primary: ${type}`
      );
    }

    this.config.primaryProvider = type;
    logger.info('Primary provider updated', { primaryProvider: type });
  }

  /**
   * Update fallback providers
   */
  public setFallbackProviders(providers: ProviderType[]): void {
    // Validate all providers are configured
    for (const provider of providers) {
      if (!this.config.providerConfigs[provider]) {
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          'ConfigManager',
          `Cannot set unconfigured provider as fallback: ${provider}`
        );
      }
    }

    this.config.fallbackProviders = [...providers];
    logger.info('Fallback providers updated', { fallbackProviders: providers });
  }

  /**
   * Check if a provider is configured and enabled
   */
  public isProviderConfigured(type: ProviderType): boolean {
    const config = this.config.providerConfigs[type];
    if (!config) {
      return false;
    }

    // Check if required configuration is present
    switch (type) {
      case 'openai':
        return !!config.apiKey && !!config.model;
      case 'grok':
        return !!config.apiKey && !!config.model;
      case 'ollama':
        return !!config.baseUrl && !!config.model;
      default:
        return false;
    }
  }

  /**
   * Get list of all configured providers
   */
  public getConfiguredProviders(): ProviderType[] {
    return Object.keys(this.config.providerConfigs)
      .filter(type => this.isProviderConfigured(type as ProviderType)) as ProviderType[];
  }

  /**
   * Reload configuration from environment variables
   */
  public reloadConfiguration(): void {
    logger.info('Reloading provider configuration from environment');
    
    const newConfig = this.loadConfigFromEnvironment();
    this.validateConfiguration(newConfig);
    this.config = newConfig;
    
    logger.info('Provider configuration reloaded successfully');
  }

  /**
   * Get configuration summary for logging/debugging
   */
  public getConfigSummary(): {
    primaryProvider: ProviderType;
    fallbackProviders: ProviderType[];
    configuredProviders: ProviderType[];
    healthCheckInterval: number;
    enableFailover: boolean;
  } {
    return {
      primaryProvider: this.config.primaryProvider,
      fallbackProviders: this.config.fallbackProviders,
      configuredProviders: this.getConfiguredProviders(),
      healthCheckInterval: this.config.healthCheckInterval,
      enableFailover: this.config.enableFailover
    };
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfigFromEnvironment(): ProviderFactoryConfig {
    const primaryProvider = this.parseProviderType(
      process.env.BIAS_ANALYSIS_PROVIDER || 'openai'
    );
    
    const fallbackProviders = (process.env.BIAS_ANALYSIS_FALLBACK_PROVIDERS || 'openai,ollama')
      .split(',')
      .map(p => this.parseProviderType(p.trim()))
      .filter(p => p !== primaryProvider);

    const providerConfigs: Record<ProviderType, ProviderConfig> = {
      openai: this.loadOpenAIConfig(),
      grok: this.loadGrokConfig(),
      ollama: this.loadOllamaConfig()
    };

    return {
      primaryProvider,
      fallbackProviders,
      providerConfigs,
      healthCheckInterval: this.parsePositiveInteger(
        process.env.LLM_HEALTH_CHECK_INTERVAL,
        300000 // 5 minutes default
      ),
      enableFailover: process.env.LLM_ENABLE_FAILOVER !== 'false'
    };
  }

  /**
   * Load OpenAI provider configuration
   */
  private loadOpenAIConfig(): ProviderConfig {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      timeout: this.parsePositiveInteger(process.env.OPENAI_TIMEOUT, 30000),
      maxRetries: this.parseNonNegativeInteger(process.env.OPENAI_MAX_RETRIES, 3),
      rateLimit: this.parsePositiveInteger(process.env.OPENAI_RATE_LIMIT, 60)
    };
  }

  /**
   * Load Grok provider configuration
   */
  private loadGrokConfig(): ProviderConfig {
    return {
      apiKey: process.env.GROK_API_KEY,
      baseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
      model: process.env.GROK_MODEL || 'grok-beta',
      timeout: this.parsePositiveInteger(process.env.GROK_TIMEOUT, 30000),
      maxRetries: this.parseNonNegativeInteger(process.env.GROK_MAX_RETRIES, 3),
      rateLimit: this.parsePositiveInteger(process.env.GROK_RATE_LIMIT, 60)
    };
  }

  /**
   * Load Ollama provider configuration
   */
  private loadOllamaConfig(): ProviderConfig {
    return {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2:7b',
      timeout: this.parsePositiveInteger(process.env.OLLAMA_TIMEOUT, 60000),
      maxRetries: this.parseNonNegativeInteger(process.env.OLLAMA_MAX_RETRIES, 2),
      rateLimit: this.parsePositiveInteger(process.env.OLLAMA_RATE_LIMIT, 30)
    };
  }

  /**
   * Parse and validate provider type
   */
  private parseProviderType(value: string): ProviderType {
    const validTypes: ProviderType[] = ['openai', 'grok', 'ollama'];
    const type = value.toLowerCase() as ProviderType;
    
    if (!validTypes.includes(type)) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Invalid provider type: ${value}. Valid types: ${validTypes.join(', ')}`
      );
    }
    
    return type;
  }

  /**
   * Parse positive integer from environment variable
   */
  private parsePositiveInteger(value: string | undefined, defaultValue: number): number {
    if (!value) {
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
      logger.warn('Invalid positive integer in environment variable, using default', {
        value,
        defaultValue
      });
      return defaultValue;
    }
    
    return parsed;
  }

  /**
   * Parse non-negative integer from environment variable
   */
  private parseNonNegativeInteger(value: string | undefined, defaultValue: number): number {
    if (!value) {
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      logger.warn('Invalid non-negative integer in environment variable, using default', {
        value,
        defaultValue
      });
      return defaultValue;
    }
    
    return parsed;
  }

  /**
   * Validate the complete configuration
   */
  private validateConfiguration(config: ProviderFactoryConfig = this.config): void {
    // Validate primary provider is configured
    if (!config.providerConfigs[config.primaryProvider]) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Primary provider ${config.primaryProvider} is not configured`
      );
    }

    // Validate all fallback providers are configured
    for (const provider of config.fallbackProviders) {
      if (!config.providerConfigs[provider]) {
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          'ConfigManager',
          `Fallback provider ${provider} is not configured`
        );
      }
    }

    // Validate individual provider configurations
    for (const [type, providerConfig] of Object.entries(config.providerConfigs)) {
      this.validateProviderConfig(type as ProviderType, providerConfig);
    }

    logger.info('Provider configuration validation passed');
  }

  /**
   * Validate individual provider configuration
   */
  private validateProviderConfig(type: ProviderType, config: ProviderConfig): void {
    if (!config.model || config.model.trim().length === 0) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Model name is required for provider: ${type}`
      );
    }

    if (config.timeout <= 0) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Timeout must be positive for provider: ${type}`
      );
    }

    if (config.maxRetries < 0) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'ConfigManager',
        `Max retries cannot be negative for provider: ${type}`
      );
    }

    // Provider-specific validation
    switch (type) {
      case 'openai':
      case 'grok':
        if (!config.apiKey || config.apiKey.trim().length === 0) {
          logger.warn(`API key not configured for provider: ${type}`);
        }
        break;
      case 'ollama':
        if (!config.baseUrl || config.baseUrl.trim().length === 0) {
          throw new ProviderError(
            ProviderErrorType.CONFIGURATION_ERROR,
            'ConfigManager',
            `Base URL is required for Ollama provider`
          );
        }
        break;
    }
  }
}