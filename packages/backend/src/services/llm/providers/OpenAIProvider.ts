import { 
  BiasAnalysisRequest, 
  BiasAnalysisResult, 
  ProviderConfig, 
  ProviderError, 
  ProviderErrorType,
  ProviderHealth 
} from '../../../types/llmProvider.js';
import { BiasAnalysis } from '../../../types/models.js';
import { BaseLLMProvider } from '../BaseLLMProvider.js';
import { logger } from '../../../utils/logger.js';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * OpenAI provider configuration
 */
interface OpenAIConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * OpenAI API response structure for chat completions
 */
interface OpenAIResponse {
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
 * Expected structure of bias analysis response from OpenAI
 */
interface OpenAIBiasResponse {
  political_lean: 'left' | 'center' | 'right';
  factual_accuracy: number;
  emotional_tone: number;
  confidence: number;
  bias_score: number;
}

/**
 * OpenAI provider implementation for bias analysis
 */
export class OpenAIProvider extends BaseLLMProvider {
  public readonly name = 'OpenAI';
  public readonly type = 'openai' as const;
  
  private client: AxiosInstance;
  private openaiConfig: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super(config);
    this.openaiConfig = config;
    
    // Validate OpenAI-specific configuration
    this.validateOpenAIConfig();
    
    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
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
   * Perform bias analysis using OpenAI's GPT models
   */
  protected async performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    const prompt = this.generateBiasPrompt(request);
    
    try {
      const response = await this.makeOpenAIRequest(prompt);
      const biasAnalysis = this.parseOpenAIResponse(response);
      
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
      throw this.handleOpenAIError(error);
    }
  }

  /**
   * Perform health check by making a simple API call
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      // Make a minimal request to check API availability
      const response = await this.client.post('/chat/completions', {
        model: this.openaiConfig.model,
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
        throw new Error(`OpenAI API returned status ${response.status}`);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        if (status === 401) {
          throw new ProviderError(
            ProviderErrorType.AUTHENTICATION_ERROR,
            this.name,
            'Invalid API key'
          );
        } else if (status === 429) {
          throw new ProviderError(
            ProviderErrorType.RATE_LIMIT_ERROR,
            this.name,
            'Rate limit exceeded'
          );
        } else {
          throw new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `OpenAI API error: ${message}`
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Make request to OpenAI API with retry logic
   */
  private async makeOpenAIRequest(prompt: string): Promise<OpenAIResponse> {
    const requestBody = {
      model: this.openaiConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert media analyst specializing in detecting bias in news articles. Provide accurate, objective analysis in the requested JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.openaiConfig.temperature || 0.3,
      max_tokens: this.openaiConfig.maxTokens || 500,
      response_format: { type: 'json_object' }
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        logger.debug('Making OpenAI API request', { 
          attempt, 
          model: this.openaiConfig.model 
        });
        
        const response = await this.client.post<OpenAIResponse>('/chat/completions', requestBody);
        
        logger.debug('OpenAI API request successful', {
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
            
            logger.warn('Rate limited by OpenAI, waiting before retry', {
              attempt,
              waitTime,
              retryAfter
            });
            
            await this.sleep(waitTime);
          } else {
            // Exponential backoff for other errors
            const waitTime = Math.pow(2, attempt) * 1000;
            logger.warn('OpenAI request failed, retrying', {
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
   * Parse OpenAI response and extract bias analysis
   */
  private parseOpenAIResponse(response: OpenAIResponse): OpenAIBiasResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new ProviderError(
        ProviderErrorType.INVALID_RESPONSE,
        this.name,
        'No choices in OpenAI response'
      );
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new ProviderError(
        ProviderErrorType.INVALID_RESPONSE,
        this.name,
        'No content in OpenAI response'
      );
    }

    try {
      const content = choice.message.content.trim();
      const biasData = JSON.parse(content) as OpenAIBiasResponse;
      
      // Validate required fields
      this.validateBiasResponse(biasData);
      
      return biasData;
      
    } catch (error) {
      logger.error('Failed to parse OpenAI response', {
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
  private validateBiasResponse(data: any): asserts data is OpenAIBiasResponse {
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
   * Handle OpenAI-specific errors
   */
  private handleOpenAIError(error: any): ProviderError {
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
            'Invalid OpenAI API key',
            error
          );
        case 429:
          return new ProviderError(
            ProviderErrorType.RATE_LIMIT_ERROR,
            this.name,
            'OpenAI rate limit exceeded',
            error
          );
        case 400:
          return new ProviderError(
            ProviderErrorType.MODEL_ERROR,
            this.name,
            `OpenAI model error: ${message}`,
            error
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `OpenAI server error: ${message}`,
            error
          );
        default:
          return new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `OpenAI API error: ${message}`,
            error
          );
      }
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ProviderError(
        ProviderErrorType.TIMEOUT_ERROR,
        this.name,
        'OpenAI request timeout',
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
   * Validate OpenAI-specific configuration
   */
  private validateOpenAIConfig(): void {
    if (!this.openaiConfig.apiKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'OpenAI API key is required'
      );
    }
    
    if (!this.openaiConfig.apiKey.startsWith('sk-')) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Invalid OpenAI API key format'
      );
    }
    
    // Validate model name
    const supportedModels = [
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-4',
      'gpt-4-32k',
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview'
    ];
    
    if (!supportedModels.includes(this.openaiConfig.model)) {
      logger.warn('Using unsupported OpenAI model', { 
        model: this.openaiConfig.model,
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
        logger.debug('OpenAI API request', {
          url: config.url,
          method: config.method,
          model: this.openaiConfig.model
        });
        return config;
      },
      (error) => {
        logger.error('OpenAI request setup failed', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('OpenAI API response received', {
          status: response.status,
          model: response.data?.model,
          usage: response.data?.usage
        });
        return response;
      },
      (error: AxiosError) => {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        logger.error('OpenAI API error', {
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
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}