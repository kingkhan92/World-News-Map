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
 * Ollama provider configuration
 */
interface OllamaConfig extends ProviderConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  numPredict?: number;
  topK?: number;
  topP?: number;
  keepAlive?: string;
}

/**
 * Ollama API response structure for chat completions
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama model information
 */
interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Expected structure of bias analysis response from Ollama
 */
interface OllamaBiasResponse {
  political_lean: 'left' | 'center' | 'right';
  factual_accuracy: number;
  emotional_tone: number;
  confidence: number;
  bias_score: number;
}

/**
 * Ollama provider implementation for bias analysis
 * Integrates with local Ollama instances for privacy-focused bias analysis
 */
export class OllamaProvider extends BaseLLMProvider {
  public readonly name = 'Ollama';
  public readonly type = 'ollama' as const;
  
  private client: AxiosInstance;
  private ollamaConfig: OllamaConfig;
  private availableModels: Set<string> = new Set();
  private modelCapabilities: Map<string, { supportsJson: boolean; contextLength: number }> = new Map();

  constructor(config: OllamaConfig) {
    super(config);
    this.ollamaConfig = config;
    
    // Validate Ollama-specific configuration
    this.validateOllamaConfig();
    
    // Initialize HTTP client
    this.client = axios.create({
      baseURL: config.baseUrl || 'http://localhost:11434',
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NewsMap-BiasAnalysis/1.0'
      }
    });

    // Add request/response interceptors for logging and error handling
    this.setupInterceptors();
    
    // Initialize model capabilities mapping
    this.initializeModelCapabilities();
  }

  /**
   * Perform provider-specific initialization
   */
  protected async performInitialization(): Promise<void> {
    try {
      // Check if Ollama is running
      await this.checkOllamaStatus();
      
      // Load available models
      await this.loadAvailableModels();
      
      // Ensure the configured model is available
      await this.ensureModelAvailable();
      
      logger.info('Ollama provider initialized successfully', {
        baseUrl: this.ollamaConfig.baseUrl,
        model: this.ollamaConfig.model,
        availableModels: Array.from(this.availableModels)
      });
      
    } catch (error) {
      logger.error('Failed to initialize Ollama provider', {
        error: error.message,
        baseUrl: this.ollamaConfig.baseUrl
      });
      throw error;
    }
  }

  /**
   * Perform bias analysis using Ollama local models
   */
  protected async performAnalysis(request: BiasAnalysisRequest): Promise<BiasAnalysisResult> {
    const prompt = this.generateOllamaBiasPrompt(request);
    
    try {
      const response = await this.makeOllamaRequest(prompt);
      const biasAnalysis = this.parseOllamaResponse(response);
      
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
      throw this.handleOllamaError(error);
    }
  }

  /**
   * Perform health check by checking Ollama status and model availability
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      // Check if Ollama is running
      await this.checkOllamaStatus();
      
      // Check if the configured model is available
      if (!this.availableModels.has(this.ollamaConfig.model)) {
        throw new Error(`Model ${this.ollamaConfig.model} is not available`);
      }
      
      // Make a simple test request to ensure the model works
      await this.testModelResponse();
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.message;
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            'Ollama server is not running or not accessible'
          );
        } else {
          throw new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `Ollama server error: ${message}`
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate bias analysis prompt optimized for local models
   * Local models often need more explicit instructions and structured prompts
   */
  private generateOllamaBiasPrompt(request: BiasAnalysisRequest): string {
    const modelCapability = this.modelCapabilities.get(this.ollamaConfig.model);
    const supportsJson = modelCapability?.supportsJson ?? false;
    
    if (supportsJson) {
      // For models that support JSON mode, use structured prompt
      return `You are an expert media analyst. Analyze the following news article for bias and respond with valid JSON only.

Article Title: ${request.title}

Article Content: ${request.content.substring(0, 2000)}${request.content.length > 2000 ? '...' : ''}

${request.summary ? `Summary: ${request.summary}` : ''}

${request.source ? `Source: ${request.source}` : ''}

Analyze this article and provide a JSON response with these exact fields:

{
  "political_lean": "left|center|right",
  "factual_accuracy": number (0-100),
  "emotional_tone": number (0-100, where 0=very negative, 50=neutral, 100=very positive),
  "confidence": number (0-100),
  "bias_score": number (0-100, where 0=heavily left-biased, 50=neutral, 100=heavily right-biased)
}

Respond with only the JSON object, no additional text.`;
    } else {
      // For models without JSON support, use more explicit formatting
      return `You are an expert media analyst. Analyze this news article for bias.

Article Title: ${request.title}

Article Content: ${request.content.substring(0, 2000)}${request.content.length > 2000 ? '...' : ''}

${request.summary ? `Summary: ${request.summary}` : ''}

${request.source ? `Source: ${request.source}` : ''}

Please analyze this article and provide:

1. Political lean: left, center, or right
2. Factual accuracy: score from 0-100 (100 = most accurate)
3. Emotional tone: score from 0-100 (0=very negative, 50=neutral, 100=very positive)
4. Confidence: your confidence in this analysis from 0-100
5. Bias score: overall bias from 0-100 (0=heavily left-biased, 50=neutral, 100=heavily right-biased)

Format your response as:
POLITICAL_LEAN: [left|center|right]
FACTUAL_ACCURACY: [0-100]
EMOTIONAL_TONE: [0-100]
CONFIDENCE: [0-100]
BIAS_SCORE: [0-100]`;
    }
  }

  /**
   * Make request to Ollama API with retry logic
   */
  private async makeOllamaRequest(prompt: string): Promise<OllamaResponse> {
    const requestBody = {
      model: this.ollamaConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert media analyst specializing in detecting bias in news articles. Provide accurate, objective analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      options: {
        temperature: this.ollamaConfig.temperature || 0.3,
        num_predict: this.ollamaConfig.numPredict || 500,
        top_k: this.ollamaConfig.topK || 40,
        top_p: this.ollamaConfig.topP || 0.9
      },
      keep_alive: this.ollamaConfig.keepAlive || '5m'
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        logger.debug('Making Ollama API request', { 
          attempt, 
          model: this.ollamaConfig.model,
          baseUrl: this.ollamaConfig.baseUrl
        });
        
        const response = await this.client.post<OllamaResponse>('/api/chat', requestBody);
        
        logger.debug('Ollama API request successful', {
          model: response.data.model,
          totalDuration: response.data.total_duration,
          evalCount: response.data.eval_count
        });
        
        return response.data;
        
      } catch (error) {
        lastError = error as Error;
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          
          // Don't retry on client errors
          if (status >= 400 && status < 500) {
            break;
          }
          
          // For server errors, use exponential backoff
          if (status >= 500) {
            const waitTime = Math.pow(2, attempt) * 1000;
            logger.warn('Ollama server error, retrying', {
              attempt,
              error: error.message,
              waitTime
            });
            
            await this.sleep(waitTime);
          }
        } else {
          // For network errors, retry with backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.warn('Ollama request failed, retrying', {
            attempt,
            error: error.message,
            waitTime
          });
          
          await this.sleep(waitTime);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Parse Ollama response and extract bias analysis
   */
  private parseOllamaResponse(response: OllamaResponse): OllamaBiasResponse {
    if (!response.message || !response.message.content) {
      throw new ProviderError(
        ProviderErrorType.INVALID_RESPONSE,
        this.name,
        'No content in Ollama response'
      );
    }

    const content = response.message.content.trim();
    
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const biasData = JSON.parse(jsonMatch[0]) as OllamaBiasResponse;
        this.validateBiasResponse(biasData);
        return biasData;
      }
      
      // If not JSON, try to parse structured format
      return this.parseStructuredResponse(content);
      
    } catch (error) {
      logger.error('Failed to parse Ollama response', {
        content: content.substring(0, 500),
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
   * Parse structured text response format
   */
  private parseStructuredResponse(content: string): OllamaBiasResponse {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result: Partial<OllamaBiasResponse> = {};
    
    for (const line of lines) {
      if (line.includes('POLITICAL_LEAN:')) {
        const value = line.split(':')[1]?.trim().toLowerCase();
        if (['left', 'center', 'right'].includes(value)) {
          result.political_lean = value as 'left' | 'center' | 'right';
        }
      } else if (line.includes('FACTUAL_ACCURACY:')) {
        const value = parseInt(line.split(':')[1]?.trim());
        if (!isNaN(value) && value >= 0 && value <= 100) {
          result.factual_accuracy = value;
        }
      } else if (line.includes('EMOTIONAL_TONE:')) {
        const value = parseInt(line.split(':')[1]?.trim());
        if (!isNaN(value) && value >= 0 && value <= 100) {
          result.emotional_tone = value;
        }
      } else if (line.includes('CONFIDENCE:')) {
        const value = parseInt(line.split(':')[1]?.trim());
        if (!isNaN(value) && value >= 0 && value <= 100) {
          result.confidence = value;
        }
      } else if (line.includes('BIAS_SCORE:')) {
        const value = parseInt(line.split(':')[1]?.trim());
        if (!isNaN(value) && value >= 0 && value <= 100) {
          result.bias_score = value;
        }
      }
    }
    
    // Validate that all required fields are present
    const requiredFields: (keyof OllamaBiasResponse)[] = [
      'political_lean', 'factual_accuracy', 'emotional_tone', 'confidence', 'bias_score'
    ];
    
    for (const field of requiredFields) {
      if (result[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return result as OllamaBiasResponse;
  }

  /**
   * Validate bias analysis response structure
   */
  private validateBiasResponse(data: any): asserts data is OllamaBiasResponse {
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
   * Check if Ollama server is running
   */
  private async checkOllamaStatus(): Promise<void> {
    try {
      const response = await this.client.get('/api/tags');
      if (response.status !== 200) {
        throw new Error(`Ollama server returned status ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            'Ollama server is not running. Please start Ollama service.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Load available models from Ollama
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models as OllamaModel[];
      
      this.availableModels.clear();
      for (const model of models) {
        this.availableModels.add(model.name);
        this.availableModels.add(model.model); // Some models have different name/model fields
      }
      
      logger.debug('Loaded available Ollama models', {
        models: Array.from(this.availableModels)
      });
      
    } catch (error) {
      logger.error('Failed to load available models', { error: error.message });
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Failed to load available models from Ollama'
      );
    }
  }

  /**
   * Ensure the configured model is available, pull if necessary
   */
  private async ensureModelAvailable(): Promise<void> {
    if (this.availableModels.has(this.ollamaConfig.model)) {
      return;
    }
    
    logger.info('Model not found locally, attempting to pull', {
      model: this.ollamaConfig.model
    });
    
    try {
      // Attempt to pull the model
      await this.pullModel(this.ollamaConfig.model);
      
      // Reload available models
      await this.loadAvailableModels();
      
      if (!this.availableModels.has(this.ollamaConfig.model)) {
        throw new Error(`Model ${this.ollamaConfig.model} could not be pulled`);
      }
      
    } catch (error) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        `Model ${this.ollamaConfig.model} is not available and could not be pulled: ${error.message}`
      );
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  private async pullModel(modelName: string): Promise<void> {
    try {
      logger.info('Pulling Ollama model', { model: modelName });
      
      // This is a streaming endpoint, but we'll wait for completion
      const response = await this.client.post('/api/pull', {
        name: modelName
      }, {
        timeout: 300000 // 5 minutes timeout for model pulling
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }
      
      logger.info('Successfully pulled Ollama model', { model: modelName });
      
    } catch (error) {
      logger.error('Failed to pull Ollama model', {
        model: modelName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test model response with a simple request
   */
  private async testModelResponse(): Promise<void> {
    try {
      const response = await this.client.post('/api/chat', {
        model: this.ollamaConfig.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        stream: false,
        options: {
          num_predict: 5
        }
      });
      
      if (!response.data.message?.content) {
        throw new Error('Model did not return valid response');
      }
      
    } catch (error) {
      throw new ProviderError(
        ProviderErrorType.MODEL_ERROR,
        this.name,
        `Model test failed: ${error.message}`
      );
    }
  }

  /**
   * Initialize model capabilities mapping
   */
  private initializeModelCapabilities(): void {
    // Map of known models and their capabilities
    const capabilities = new Map([
      // Llama models
      ['llama2', { supportsJson: false, contextLength: 4096 }],
      ['llama2:7b', { supportsJson: false, contextLength: 4096 }],
      ['llama2:13b', { supportsJson: false, contextLength: 4096 }],
      ['llama2:70b', { supportsJson: false, contextLength: 4096 }],
      ['llama3', { supportsJson: true, contextLength: 8192 }],
      ['llama3:8b', { supportsJson: true, contextLength: 8192 }],
      ['llama3:70b', { supportsJson: true, contextLength: 8192 }],
      
      // Mistral models
      ['mistral', { supportsJson: true, contextLength: 8192 }],
      ['mistral:7b', { supportsJson: true, contextLength: 8192 }],
      ['mixtral', { supportsJson: true, contextLength: 32768 }],
      ['mixtral:8x7b', { supportsJson: true, contextLength: 32768 }],
      
      // Code models
      ['codellama', { supportsJson: false, contextLength: 16384 }],
      ['codellama:7b', { supportsJson: false, contextLength: 16384 }],
      ['codellama:13b', { supportsJson: false, contextLength: 16384 }],
      
      // Other models
      ['phi', { supportsJson: false, contextLength: 2048 }],
      ['phi3', { supportsJson: true, contextLength: 4096 }],
      ['gemma', { supportsJson: true, contextLength: 8192 }],
      ['qwen', { supportsJson: true, contextLength: 8192 }]
    ]);
    
    this.modelCapabilities = capabilities;
  }

  /**
   * Handle Ollama-specific errors
   */
  private handleOllamaError(error: any): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      
      if (error.code === 'ECONNREFUSED') {
        return new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          this.name,
          'Ollama server is not running',
          error
        );
      }
      
      switch (status) {
        case 400:
          return new ProviderError(
            ProviderErrorType.MODEL_ERROR,
            this.name,
            `Ollama model error: ${message}`,
            error
          );
        case 404:
          return new ProviderError(
            ProviderErrorType.CONFIGURATION_ERROR,
            this.name,
            `Model not found: ${this.ollamaConfig.model}`,
            error
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `Ollama server error: ${message}`,
            error
          );
        default:
          return new ProviderError(
            ProviderErrorType.NETWORK_ERROR,
            this.name,
            `Ollama API error: ${message}`,
            error
          );
      }
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ProviderError(
        ProviderErrorType.TIMEOUT_ERROR,
        this.name,
        'Ollama request timeout',
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
   * Validate Ollama-specific configuration
   */
  private validateOllamaConfig(): void {
    if (!this.ollamaConfig.baseUrl) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Ollama base URL is required'
      );
    }
    
    // Validate URL format
    try {
      new URL(this.ollamaConfig.baseUrl);
    } catch (error) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Invalid Ollama base URL format'
      );
    }
    
    // Validate model name
    if (!this.ollamaConfig.model || this.ollamaConfig.model.trim().length === 0) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        this.name,
        'Ollama model name is required'
      );
    }
    
    // Validate optional numeric parameters
    if (this.ollamaConfig.temperature !== undefined) {
      if (this.ollamaConfig.temperature < 0 || this.ollamaConfig.temperature > 2) {
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          this.name,
          'Temperature must be between 0 and 2'
        );
      }
    }
    
    if (this.ollamaConfig.topP !== undefined) {
      if (this.ollamaConfig.topP < 0 || this.ollamaConfig.topP > 1) {
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          this.name,
          'Top P must be between 0 and 1'
        );
      }
    }
    
    if (this.ollamaConfig.topK !== undefined) {
      if (this.ollamaConfig.topK < 1) {
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          this.name,
          'Top K must be at least 1'
        );
      }
    }
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Ollama API request', {
          url: config.url,
          method: config.method,
          model: this.ollamaConfig.model,
          baseUrl: this.ollamaConfig.baseUrl
        });
        return config;
      },
      (error) => {
        logger.error('Ollama request setup failed', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Ollama API response received', {
          status: response.status,
          model: response.data?.model,
          totalDuration: response.data?.total_duration
        });
        return response;
      },
      (error: AxiosError) => {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;
        
        logger.error('Ollama API error', {
          status,
          message,
          url: error.config?.url,
          method: error.config?.method,
          code: error.code
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

  /**
   * Get available models (for debugging/monitoring)
   */
  public getAvailableModels(): string[] {
    return Array.from(this.availableModels);
  }

  /**
   * Get model capabilities (for debugging/monitoring)
   */
  public getModelCapabilities(model?: string): { supportsJson: boolean; contextLength: number } | undefined {
    const targetModel = model || this.ollamaConfig.model;
    return this.modelCapabilities.get(targetModel);
  }
}