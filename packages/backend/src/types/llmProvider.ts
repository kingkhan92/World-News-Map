import { BiasAnalysis } from './models.js';

/**
 * Configuration for LLM providers
 */
export interface ProviderConfig {
  /** API key for authentication (if required) */
  apiKey?: string;
  /** Base URL for the API */
  baseUrl?: string;
  /** Model name to use */
  model: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Rate limit requests per minute */
  rateLimit?: number;
}

/**
 * Health status of an LLM provider
 */
export interface ProviderHealth {
  /** Whether the provider is available */
  available: boolean;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if unavailable */
  error?: string;
  /** Last check timestamp */
  lastChecked: Date;
}

/**
 * Request for bias analysis
 */
export interface BiasAnalysisRequest {
  title: string;
  content: string;
  summary?: string;
  source?: string;
}

/**
 * Result from bias analysis
 */
export interface BiasAnalysisResult {
  biasScore: number;
  biasAnalysis: BiasAnalysis;
  /** Provider that performed the analysis */
  provider: string;
  /** Confidence in the analysis (0-100) */
  confidence: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Supported LLM provider types
 */
export type ProviderType = 'openai' | 'grok' | 'ollama';

/**
 * Provider priority configuration
 */
export interface ProviderPriority {
  type: ProviderType;
  priority: number;
  enabled: boolean;
}

/**
 * Base interface for all LLM providers
 */
export interface LLMProvider {
  /** Unique name of the provider */
  readonly name: string;
  
  /** Type of the provider */
  readonly type: ProviderType;
  
  /** Provider configuration */
  readonly config: ProviderConfig;
  
  /**
   * Analyze article content for bias
   * @param request The bias analysis request
   * @returns Promise resolving to bias analysis result
   */
  analyzeArticle(request: BiasAnalysisRequest): Promise<BiasAnalysisResult>;
  
  /**
   * Check if the provider is available and healthy
   * @returns Promise resolving to health status
   */
  checkHealth(): Promise<ProviderHealth>;
  
  /**
   * Initialize the provider (setup connections, validate config, etc.)
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;
  
  /**
   * Cleanup resources when shutting down
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
  
  /**
   * Check if the provider is initialized
   * @returns True if the provider is initialized and ready to use
   */
  isInitialized(): boolean;
}

/**
 * Factory configuration for creating providers
 */
export interface ProviderFactoryConfig {
  /** Primary provider to use */
  primaryProvider: ProviderType;
  
  /** Fallback providers in order of preference */
  fallbackProviders: ProviderType[];
  
  /** Provider-specific configurations */
  providerConfigs: Record<ProviderType, ProviderConfig>;
  
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
  
  /** Whether to enable automatic failover */
  enableFailover: boolean;
}

/**
 * Error types for LLM provider operations
 */
export enum ProviderErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  MODEL_ERROR = 'MODEL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for LLM provider operations
 */
export class ProviderError extends Error {
  constructor(
    public readonly type: ProviderErrorType,
    public readonly provider: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}