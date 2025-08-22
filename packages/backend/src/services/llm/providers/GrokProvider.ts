import { 
  BiasAnalysisRequest, 
  BiasAnalysisResult, 
  ProviderConfig, 
  ProviderError, 
  ProviderErrorType 
} from '../../../types/llmProvider.js';
import { BiasAnalysis } from '../../../types/models.js';
import { BaseLLMProvider } from '../BaseLLMProvider.js';
import { logger } from '../../../utils/logger.js';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Grok provider configuration
 */
interface GrokConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Grok API response structure for chat completions
 */
interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Expected structure of bias analysis response from Grok
 */
interface GrokBiasResponse {
  political_lean: 'left' | 'center' | 'right';
  factual_accuracy: number;
  emotional_tone: number;
  confidence: number;
  bias_score: number;
}

/**
 * Grok provider implementation for bias analysis
 * Integrates with xAI's Grok API for news article bias analysis
 */
export class GrokProvider extends BaseLLMProvider {
  public readonly name = 'Grok';
  public readonly type = 'grok' as const;
  
  private client: AxiosInstance;
  private grokConfig: GrokConfig;
  private rateLimitTracker: Map<string, number> = new Map();

  constructor(config: GrokConfig) {
    super(config);
    this.grokConfig = config;
    
    // Validate Grok-specific configuration
    this.validateGrokConfig();
    
    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.x.ai/v1',
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NewsMap-BiasAnalysis/1.0'
      }
    });

    // Add request/response interceptors for logging and error handling
    this.setupInterceptors();
  }

  /**
   * Perform bias analysis using Grok's models
   */
  protected async performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    // Check rate limiting before making request
    await this.checkRateLimit();
    
    const prompt = this.generateGrokBiasPrompt(request);
    
    try {
      const response = await this.makeGrokRequest(prompt);
      const biasAnalysis = this.parseGrokResponse(response);
      
      // Update rate limit tracking
      this.updateRateLimitTracker();
      
      return {
        biasScore: biasAnalysis.bias_score,
        biasAnalysis: {
          politicalLean: biasAnalysis.political_lean,
          factualAccuracy: biasAnalysis.factual_accuracy,
          emotionalTone: biasAnalysis.emotional_tone,
          confidence: biasAnalysis.confidence
        },
        provider: this.name,
        confidence: biasAnalysis.confidence,
        processingTime: 0 // Will be set by base class
      };
      
    } catch (error) {
      throw this.handleGrokError(error);
    }
  }

  /**
   * Perform health check by making a simple API call
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      // Make a minimal request to check API availability
      const response = await this.client.post('/chat/completions', {
        model: this.grokConfig.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 5,
        temperature: 0
      });

      if (response.status !== 200) {
        throw new Error(`Grok API returned status ${response.status}`);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        if (status === 401) {
          throw new ProviderError(
            ProviderErrorType.AUTHENTICATION_ERROR,
            this.name,
            'Invalid Grok API key'
          );
        } else if (status === 429) {
          throw new ProviderError(
            ProviderErrorType.RATE_LIMIT_ERROR,
            this.name,
            'Grok rate limit exceeded'
          );
        } else {
          throw new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `Grok API error: ${message}`
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate bias analysis prompt optimized for Grok's capabilities
   * Grok tends to be more conversational and direct, so we adapt the prompt accordingly
   */
  private generateGrokBiasPrompt(request: BiasAnalysisRequest): string {
    return `Hey Grok! I need you to analyze this news article for bias. Be objective and analytical - this is for a news aggregation system that helps people understand media bias.

Article Title: ${request.title}

Article Content: ${request.content}

${request.summary ? `Summary: ${request.summary}` : ''}

${request.source ? `Source: ${request.source}` : ''}

Please analyze this article and give me:

1. Political lean: Is this left-leaning, center/neutral, or right-leaning?
2. Factual accuracy: How factually accurate is this content? (0-100 scale)
3. Emotional tone: What's the emotional tone? (0=very negative, 50=neutral, 100=very positive)
4. Your confidence: How confident are you in this analysis? (0-100 scale)
5. Overall bias score: Where does this fall on the bias spectrum? (0=heavily left-biased, 50=neutral, 100=heavily right-biased)

Give me your response as a JSON object with these exact fields:
{
  "political_lean": "left|center|right",
  "factual_accuracy": number,
  "emotional_tone": number,
  "confidence": number,
  "bias_score": number
}

Be precise and analytical - this data helps people make informed decisions about news consumption.`;
  }

  /**
   * Make request to Grok API with retry logic and rate limiting
   */
  private async makeGrokRequest(prompt: string): Promise<GrokResponse> {
    const requestBody = {
      model: this.grokConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert media analyst with deep knowledge of journalism, political science, and media bias detection. Provide accurate, objective analysis in the requested JSON format. Be precise and analytical.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.grokConfig.temperature || 0.2, // Lower temperature for more consistent analysis
      max_tokens: this.grokConfig.maxTokens || 600,
      stream: false
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        logger.debug('Making Grok API request', { 
          attempt, 
          model: this.grokConfig.model 
        });
        
        const response = await this.client.post<GrokResponse>('/chat/completions', requestBody);
        
        logger.debug('Grok API request successful', {
          model: response.data.model,
          usage: response.data.usage
        });
        
        return response.data;
        
      } catch (error) {
        lastError = error as Error;
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          
          // Don't retry on authentication or client errors
          if (status === 401 || status === 403 || (status >= 400 && status < 500)) {
            break;
          }
          
          // For rate limiting, wait before retry
          if (status === 429) {
            const retryAfter = error.response?.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            
            logger.warn('Rate limited by Grok, waiting before retry', {
              attempt,
              waitTime,
              retryAfter
            });
            
            await this.sleep(waitTime);
          } else {
            // Exponential backoff for other errors
            const waitTime = Math.pow(2, attempt) * 1000;
            logger.warn('Grok request failed, retrying', {
              attempt,
              error: error.message,
              waitTime
            });
            
            await this.sleep(waitTime);
          }
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Parse Grok response and extract bias analysis
   */
  private parseGrokResponse(response: GrokResponse): GrokBiasResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new ProviderError(
        ProviderErrorType.INVALID_RESPONSE,
        this.name,
        'No choices in Grok response'
      );
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new ProviderError(
        ProviderErrorType.INVALID_RESPONSE,
        this.name,
        'No content in Grok response'
      );
    }

    try {
      const content = choice.message.content.trim();
      
      // Grok might include additional text around the JSON, so extract JSON block
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      
      const biasData = JSON.parse(jsonContent) as GrokBiasResponse;
      
      // Validate required fields
      this.validateBiasResponse(biasData);
      
      return biasData;
      
    } catch (error) {
      logger.error('Failed to parse Grok response', {
        content: choice.message.content,
        error: error.message
      });
      
      throw new ProviderError(
        ProviderErrorType.INVALID_RESPONSE,
        this.name,
        `Failed to parse bias analysis response: ${error.message}`
      );
    }
  }

  /**
   * Validate bias analysis response structure
   */
  private validateBiasResponse(data: any): asserts data is GrokBiasResponse {
    const requiredFields = ['political_lean', 'factual_accuracy', 'emotional_tone', 'confidence', 'bias_score'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate political lean
    if (!['left', 'center', 'right'].includes(data.political_lean)) {
      throw new Error(`Invalid political_lean value: ${data.political_lean}`);
    }
    
    // Validate numeric fields
    const numericFields = ['factual_accuracy', 'emotional_tone', 'confidence', 'bias_score'];
    for (const field of numericFields) {
      const value = data[field];
      if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
        throw new Error(`Invalid ${field} value: ${value} (must be number 0-100)`);
      }
    }
  }

  /**
   * Handle Grok-specific errors
   */
  private handleGrokError(error: any): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      
      switch (status) {
        case 401:
          return new ProviderError(
            ProviderErrorType.AUTHENTICATION_ERROR,
            this.name,
            'Invalid Grok API key',
            error
          );
        case 429:
          return new ProviderError(
            ProviderErrorType.RATE_LIMIT_ERROR,
            this.name,
            'Grok rate limit exceeded',
            error
          );
        case 400:
          return new ProviderError(
            ProviderErrorType.MODEL_ERROR,
            this.name,
            `Grok model error: ${message}`,
            error
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `Grok server error: ${message}`,
            error
          );
        default:
          return new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `Grok API error: ${message}`,
            error
          );
      }
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ProviderError(
        ProviderErrorType.TIMEOUT_ERROR,
        this.name,
        'Grok request timeout',
        error
      );
    }
    
    return new ProviderError(
      ProviderErrorType.UNKNOWN_ERROR,
      this.name,
      `Unexpected error: ${error.message}`,
      error
    );
  }

  /**
   * Validate Grok-specific configuration
   */
  private validateGrokConfig(): void {
    if (!this.grokConfig.apiKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Grok API key is required'
      );
    }
    
    // Grok API keys typically start with 'grok-' but this might change
    // For now, just check it's not empty and has reasonable length
    if (this.grokConfig.apiKey.length < 10) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Invalid Grok API key format'
      );
    }
    
    // Validate model name - Grok models typically include 'grok' in the name
    const supportedModels = [
      'grok-beta',
      'grok-1',
      'grok-1.5',
      'grok-2'
    ];
    
    if (!supportedModels.includes(this.grokConfig.model)) {
      logger.warn('Using potentially unsupported Grok model', { 
        model: this.grokConfig.model,
        supportedModels 
      });
    }
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Grok API request', {
          url: config.url,
          method: config.method,
          model: this.grokConfig.model
        });
        return config;
      },
      (error) => {
        logger.error('Grok request setup failed', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Grok API response received', {
          status: response.status,
          model: response.data?.model,
          usage: response.data?.usage
        });
        return response;
      },
      (error: AxiosError) => {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        logger.error('Grok API error', {
          status,
          message,
          url: error.config?.url,
          method: error.config?.method
        });
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check rate limiting before making requests
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.config.rateLimit) {
      return;
    }

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const currentRequests = this.rateLimitTracker.get('requests') || 0;
    const lastReset = this.rateLimitTracker.get('lastReset') || 0;

    // Reset counter if window has passed
    if (now - lastReset > 60000) {
      this.rateLimitTracker.set('requests', 0);
      this.rateLimitTracker.set('lastReset', now);
      return;
    }

    // Check if we're at the limit
    if (currentRequests >= this.config.rateLimit) {
      const waitTime = 60000 - (now - lastReset);
      logger.warn('Rate limit reached, waiting', {
        provider: this.name,
        waitTime,
        currentRequests,
        limit: this.config.rateLimit
      });
      
      await this.sleep(waitTime);
      
      // Reset after waiting
      this.rateLimitTracker.set('requests', 0);
      this.rateLimitTracker.set('lastReset', Date.now());
    }
  }

  /**
   * Update rate limit tracking after successful request
   */
  private updateRateLimitTracker(): void {
    if (!this.config.rateLimit) {
      return;
    }

    const currentRequests = this.rateLimitTracker.get('requests') || 0;
    this.rateLimitTracker.set('requests', currentRequests + 1);
  }

  /**
   * Sleep utility for retry delays and rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}