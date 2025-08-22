import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import axios from 'axios';
import { GrokProvider } from '../GrokProvider.js';
import { 
  BiasAnalysisRequest, 
  ProviderError, 
  ProviderErrorType 
} from '../../../../types/llmProvider.js';
import { logger } from '../../../../utils/logger.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock logger
vi.mock('../../../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('GrokProvider', () => {
  let provider: GrokProvider;
  let mockAxiosInstance: any;

  const mockConfig = {
    apiKey: 'grok-test-key-123456789',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-beta',
    timeout: 30000,
    maxRetries: 3,
    rateLimit: 60
  };

  const mockRequest: BiasAnalysisRequest = {
    title: 'Test Article Title',
    content: 'This is test article content for bias analysis.',
    summary: 'Test summary',
    source: 'Test Source'
  };

  const mockGrokResponse = {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 1234567890,
    model: 'grok-beta',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            political_lean: 'center',
            factual_accuracy: 85,
            emotional_tone: 60,
            confidence: 90,
            bias_score: 50
          })
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock axios.create
    mockAxiosInstance = {
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    provider = new GrokProvider(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid configuration', () => {
      expect(provider.name).toBe('Grok');
      expect(provider.type).toBe('grok');
      expect(provider.config).toEqual(mockConfig);
    });

    it('should throw error for missing API key', () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };
      
      expect(() => new GrokProvider(invalidConfig)).toThrow(ProviderError);
      expect(() => new GrokProvider(invalidConfig)).toThrow('Grok API key is required');
    });

    it('should throw error for invalid API key format', () => {
      const invalidConfig = { ...mockConfig, apiKey: 'short' };
      
      expect(() => new GrokProvider(invalidConfig)).toThrow(ProviderError);
      expect(() => new GrokProvider(invalidConfig)).toThrow('Invalid Grok API key format');
    });

    it('should warn for unsupported model', () => {
      const configWithUnsupportedModel = { ...mockConfig, model: 'unsupported-model' };
      
      new GrokProvider(configWithUnsupportedModel);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Using potentially unsupported Grok model',
        expect.objectContaining({
          model: 'unsupported-model'
        })
      );
    });
  });

  describe('performAnalysis', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should successfully analyze article bias', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockGrokResponse
      });

      const result = await provider.analyzeArticle(mockRequest);

      expect(result).toEqual({
        biasScore: 50,
        biasAnalysis: {
          politicalLean: 'center',
          factualAccuracy: 85,
          emotionalTone: 60,
          confidence: 90
        },
        provider: 'Grok',
        confidence: 90,
        processingTime: expect.any(Number)
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'grok-beta',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert media analyst')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Test Article Title')
            })
          ]),
          temperature: 0.2,
          max_tokens: 600,
          stream: false
        })
      );
    });

    it('should handle JSON response with extra text', async () => {
      const responseWithExtraText = {
        ...mockGrokResponse,
        choices: [
          {
            ...mockGrokResponse.choices[0],
            message: {
              role: 'assistant',
              content: `Here's my analysis:

${JSON.stringify({
  political_lean: 'left',
  factual_accuracy: 75,
  emotional_tone: 40,
  confidence: 85,
  bias_score: 30
})}

Hope this helps!`
            }
          }
        ]
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: responseWithExtraText
      });

      const result = await provider.analyzeArticle(mockRequest);

      expect(result.biasScore).toBe(30);
      expect(result.biasAnalysis.politicalLean).toBe('left');
    });

    it('should retry on network errors', async () => {
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockGrokResponse
        });

      const result = await provider.analyzeArticle(mockRequest);

      expect(result.biasScore).toBe(50);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limiting with retry-after header', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '2' },
          data: { error: { message: 'Rate limit exceeded' } }
        }
      };

      mockAxiosInstance.post
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          status: 200,
          data: mockGrokResponse
        });

      const startTime = Date.now();
      const result = await provider.analyzeArticle(mockRequest);
      const endTime = Date.now();

      expect(result.biasScore).toBe(50);
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000); // Should wait at least 2 seconds
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should throw ProviderError for authentication errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(authError);

      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow(ProviderError);
      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow('Invalid Grok API key');
    });

    it('should throw ProviderError for invalid response format', async () => {
      const invalidResponse = {
        ...mockGrokResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Invalid JSON response'
            },
            finish_reason: 'stop'
          }
        ]
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: invalidResponse
      });

      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow(ProviderError);
      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow('Failed to parse bias analysis response');
    });

    it('should validate required fields in response', async () => {
      const incompleteResponse = {
        ...mockGrokResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                political_lean: 'center',
                factual_accuracy: 85
                // Missing other required fields
              })
            },
            finish_reason: 'stop'
          }
        ]
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: incompleteResponse
      });

      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow(ProviderError);
      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow('Missing required field');
    });

    it('should validate numeric field ranges', async () => {
      const invalidRangeResponse = {
        ...mockGrokResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                political_lean: 'center',
                factual_accuracy: 150, // Invalid range
                emotional_tone: 60,
                confidence: 90,
                bias_score: 50
              })
            },
            finish_reason: 'stop'
          }
        ]
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: invalidRangeResponse
      });

      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow(ProviderError);
      await expect(provider.analyzeArticle(mockRequest)).rejects.toThrow('Invalid factual_accuracy value');
    });

    it('should throw error when not initialized', async () => {
      const uninitializedProvider = new GrokProvider(mockConfig);

      await expect(uninitializedProvider.analyzeArticle(mockRequest)).rejects.toThrow(ProviderError);
      await expect(uninitializedProvider.analyzeArticle(mockRequest)).rejects.toThrow('Provider not initialized');
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should pass health check with successful API call', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockGrokResponse
      });

      const health = await provider.checkHealth();

      expect(health.available).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
    });

    it('should fail health check on API error', async () => {
      const apiError = {
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(apiError);

      const health = await provider.checkHealth();

      expect(health.available).toBe(false);
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it('should handle authentication errors in health check', async () => {
      const authError = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(authError);

      await expect(provider.checkHealth()).rejects.toThrow(ProviderError);
      await expect(provider.checkHealth()).rejects.toThrow('Invalid Grok API key');
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should track and enforce rate limits', async () => {
      const configWithLowLimit = { ...mockConfig, rateLimit: 2 };
      const rateLimitedProvider = new GrokProvider(configWithLowLimit);
      await rateLimitedProvider.initialize();

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: mockGrokResponse
      });

      // Make requests up to the limit
      await rateLimitedProvider.analyzeArticle(mockRequest);
      await rateLimitedProvider.analyzeArticle(mockRequest);

      // Third request should be delayed
      const startTime = Date.now();
      await rateLimitedProvider.analyzeArticle(mockRequest);
      const endTime = Date.now();

      // Should have waited for rate limit window to reset
      expect(endTime - startTime).toBeGreaterThan(0);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('initialization and cleanup', () => {
    it('should initialize successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockGrokResponse
      });

      await provider.initialize();

      expect(provider.isInitialized()).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Initializing LLM provider',
        { provider: 'Grok' }
      );
    });

    it('should cleanup successfully', async () => {
      await provider.initialize();
      await provider.cleanup();

      expect(provider.isInitialized()).toBe(false);
      expect(logger.info).toHaveBeenCalledWith(
        'Cleaning up LLM provider',
        { provider: 'Grok' }
      );
    });

    it('should handle initialization failure', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Initialization failed'));

      await expect(provider.initialize()).rejects.toThrow(ProviderError);
      expect(provider.isInitialized()).toBe(false);
    });
  });

  describe('prompt generation', () => {
    it('should generate appropriate prompt for Grok', async () => {
      await provider.initialize();
      
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: mockGrokResponse
      });

      await provider.analyzeArticle(mockRequest);

      const callArgs = mockAxiosInstance.post.mock.calls[0][1];
      const userMessage = callArgs.messages.find((msg: any) => msg.role === 'user');
      
      expect(userMessage.content).toContain('Hey Grok!');
      expect(userMessage.content).toContain('Test Article Title');
      expect(userMessage.content).toContain('This is test article content');
      expect(userMessage.content).toContain('Be precise and analytical');
    });
  });
});