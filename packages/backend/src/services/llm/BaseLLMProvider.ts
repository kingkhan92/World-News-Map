import { 
  LLMProvider, 
  ProviderConfig, 
  ProviderHealth, 
  BiasAnalysisRequest, 
  BiasAnalysisResult, 
  ProviderType,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';
import { BiasAnalysis } from '../../types/models.js';
import { logger } from '../../utils/logger.js';

/**
 * Abstract base class for all LLM providers
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseLLMProvider implements LLMProvider {
  public abstract readonly name: string;
  public abstract readonly type: ProviderType;
  public readonly config: ProviderConfig;
  
  private _initialized: boolean = false;
  private _lastHealthCheck: ProviderHealth | null = null;

  constructor(config: ProviderConfig) {
    this.config = { ...config };
    this.validateConfig();
  }

  /**
   * Analyze article content for bias
   */
  public async analyzeArticle(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    if (!this._initialized) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Provider not initialized'
      );
    }

    const startTime = Date.now();
    
    try {
      logger.info('Starting bias analysis', { 
        provider: this.name,
        title: request.title.substring(0, 100) 
      });

      // Validate request
      this.validateRequest(request);

      // Perform the actual analysis (implemented by subclasses)
      const result = await this.performAnalysis(request);

      // Validate and normalize the result
      const normalizedResult = this.normalizeResult(result, startTime);

      logger.info('Bias analysis completed', {
        provider: this.name,
        biasScore: normalizedResult.biasScore,
        processingTime: normalizedResult.processingTime
      });

      return normalizedResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Bias analysis failed', {
        provider: this.name,
        error: error.message,
        processingTime
      });

      // Re-throw as ProviderError if not already
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        ProviderErrorType.UNKNOWN_ERROR,
        this.name,
        `Analysis failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Check provider health
   */
  public async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Perform provider-specific health check
      await this.performHealthCheck();
      
      const responseTime = Date.now() - startTime;
      
      this._lastHealthCheck = {
        available: true,
        responseTime,
        lastChecked: new Date()
      };

      logger.debug('Health check passed', { 
        provider: this.name, 
        responseTime 
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this._lastHealthCheck = {
        available: false,
        responseTime,
        error: error.message,
        lastChecked: new Date()
      };

      logger.warn('Health check failed', { 
        provider: this.name, 
        error: error.message,
        responseTime 
      });
    }

    return this._lastHealthCheck;
  }

  /**
   * Initialize the provider
   */
  public async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      logger.info('Initializing LLM provider', { provider: this.name });
      
      // Perform provider-specific initialization
      await this.performInitialization();
      
      // Run initial health check
      await this.checkHealth();
      
      this._initialized = true;
      
      logger.info('LLM provider initialized successfully', { provider: this.name });
      
    } catch (error) {
      logger.error('Failed to initialize LLM provider', {
        provider: this.name,
        error: error.message
      });
      
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        `Initialization failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Cleanup provider resources
   */
  public async cleanup(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    try {
      logger.info('Cleaning up LLM provider', { provider: this.name });
      
      // Perform provider-specific cleanup
      await this.performCleanup();
      
      this._initialized = false;
      this._lastHealthCheck = null;
      
      logger.info('LLM provider cleaned up successfully', { provider: this.name });
      
    } catch (error) {
      logger.error('Failed to cleanup LLM provider', {
        provider: this.name,
        error: error.message
      });
    }
  }

  /**
   * Get the last health check result
   */
  public getLastHealthCheck(): ProviderHealth | null {
    return this._lastHealthCheck;
  }

  /**
   * Check if provider is initialized
   */
  public isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Generate consistent bias analysis prompt
   */
  protected generateBiasPrompt(request: BiasAnalysisRequest): string {
    return `Analyze the following news article for bias and provide a structured assessment:

Title: ${request.title}

Content: ${request.content}

${request.summary ? `Summary: ${request.summary}` : ''}

${request.source ? `Source: ${request.source}` : ''}

Please analyze this article and provide:
1. Political lean (left, center, right)
2. Factual accuracy score (0-100, where 100 is most accurate)
3. Emotional tone score (0-100, where 0 is very negative, 50 is neutral, 100 is very positive)
4. Overall confidence in your analysis (0-100)
5. Overall bias score (0-100, where 0 is heavily biased left, 50 is neutral, 100 is heavily biased right)

Respond with a JSON object containing these fields:
{
  "political_lean": "left|center|right",
  "factual_accuracy": number,
  "emotional_tone": number,
  "confidence": number,
  "bias_score": number
}`;
  }

  /**
   * Normalize bias score to 0-100 scale
   */
  protected normalizeBiasScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(): void {
    if (!this.config.model) {
      throw new Error('Model name is required in provider configuration');
    }
    
    if (this.config.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }
    
    if (this.config.maxRetries < 0) {
      throw new Error('Max retries cannot be negative');
    }
  }

  /**
   * Validate bias analysis request
   */
  private validateRequest(request: BiasAnalysisRequest): void {
    if (!request.title || request.title.trim().length === 0) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Article title is required'
      );
    }
    
    if (!request.content || request.content.trim().length === 0) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Article content is required'
      );
    }
  }

  /**
   * Normalize analysis result
   */
  private normalizeResult(result: BiasAnalysisResult, startTime: number): BiasAnalysisResult {
    return {
      ...result,
      biasScore: this.normalizeBiasScore(result.biasScore),
      confidence: Math.max(0, Math.min(100, result.confidence)),
      processingTime: Date.now() - startTime,
      provider: this.name
    };
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Perform the actual bias analysis
   * Must be implemented by each provider
   */
  protected abstract performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult>;

  /**
   * Perform provider-specific health check
   * Must be implemented by each provider
   */
  protected abstract performHealthCheck(): Promise<void>;

  /**
   * Perform provider-specific initialization
   * Can be overridden by subclasses if needed
   */
  protected async performInitialization(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override if they need specific initialization
  }

  /**
   * Perform provider-specific cleanup
   * Can be overridden by subclasses if needed
   */
  protected async performCleanup(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override if they need specific cleanup
  }
}