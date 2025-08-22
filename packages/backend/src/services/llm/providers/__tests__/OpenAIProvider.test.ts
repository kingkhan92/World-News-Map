import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { OpenAIProvider } from '../OpenAIProvider.js';
import { 
  ProviderError, 
  ProviderErrorType, 
  BiasAnalysisRequest 
} from '../../../../types/llmProvider.js';

// Mock axios
const mockPost = vi.fn();
const mockAxiosInstance = {
  post: mockPost,
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn()
  }
}));

const mockedAxios = axios as any;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockAxiosInstance: any;

  const mockConfig = {
    apiKey: 'sk-test-key-123',
    model: 'gpt-3.5-turbo',
    timeout: 30000,
    maxRetries: 3,
    temperature: 0.3,
    maxTokens: 500
  };

  const mockRequest: BiasAnalysisRequest = {
    title: 'Test Article Title',
    content: 'This is a test article content for bias analysis.',
    summary: 'Test summary',
    source: 'Test Source'
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockPost.mockClear();
    
    mockedAxios.isAxiosError = vi.fn((error: any) => {
      return error && error.isAxiosError === true;
    });

    provider = new OpenAIProvider(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      expect(provider.name).toBe('OpenAI');
      expect(provider.type).toBe('openai');
      expect(provider.config).toEqual(mockConfig);
    });

    it('should throw error for missing API key', () => {
      expect(() => {
        new OpenAIProvider({ ...mockConfig, apiKey: '' });
      }).toThrow(ProviderError);
    });

    it('should throw error for invalid API key format', () => {
      expect(() => {
        new OpenAIProvider({ ...mockConfig, apiKey: 'invalid-key' });
      }).toThrow(ProviderError);
    });

    it('should warn for unsupported model', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      new OpenAIProvider({ ...mockConfig, model: 'unsupported-model' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('analyzeArticle', () => {
    const mockOpenAIResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-3.5-turbo',
      choices: [{
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
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    };

    beforeEach(async () => {
      // Mock successful health check for initialization
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: mockOpenAIResponse
      });
      
      await provider.initialize();
    });

    it('should successfully analyze article', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: mockOpenAIResponse
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
        provider: 'OpenAI',
        confidence: 90,
        processingTime: expect.any(Number)
      });
    });

    it('should handle authentication error', async () => {
      const authError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key'
            }
          }
        }
      };

      mockPost.mockRejectedValueOnce(authError);

      await expect(provider.analyzeArticle(mockRequest))
        .rejects.toThrow(ProviderError);
    });

    it('should handle rate limit error with retry', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: {
            'retry-after': '1'
          },
          data: {
            error: {
              message: 'Rate limit exceeded'
            }
          }
        }
      };

      // First call fails with rate limit, second succeeds
      mockPost
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          status: 200,
          data: mockOpenAIResponse
        });

      const result = await provider.analyzeArticle(mockRequest);
      
      expect(result.biasScore).toBe(50);
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid JSON response', async () => {
      const invalidResponse = {
        ...mockOpenAIResponse,
        choices: [{
          ...mockOpenAIResponse.choices[0],
          message: {
            role: 'assistant',
            content: 'Invalid JSON response'
          }
        }]
      };

      mockPost.mockResolvedValueOnce({
        status: 200,
        data: invalidResponse
      });

      await expect(provider.analyzeArticle(mockRequest))
        .rejects.toThrow(ProviderError);
    });

    it('should handle missing required fields in response', async () => {
      const incompleteResponse = {
        ...mockOpenAIResponse,
        choices: [{
          ...mockOpenAIResponse.choices[0],
          message: {
            role: 'assistant',
            content: JSON.stringify({
              political_lean: 'center',
              // Missing other required fields
            })
          }
        }]
      };

      mockPost.mockResolvedValueOnce({
        status: 200,
        data: incompleteResponse
      });

      await expect(provider.analyzeArticle(mockRequest))
        .rejects.toThrow(ProviderError);
    });

    it('should validate numeric field ranges', async () => {
      const invalidRangeResponse = {
        ...mockOpenAIResponse,
        choices: [{
          ...mockOpenAIResponse.choices[0],
          message: {
            role: 'assistant',
            content: JSON.stringify({
              political_lean: 'center',
              factual_accuracy: 150, // Invalid range
              emotional_tone: 60,
              confidence: 90,
              bias_score: 50
            })
          }
        }]
      };

      mockPost.mockResolvedValueOnce({
        status: 200,
        data: invalidRangeResponse
      });

      await expect(provider.analyzeArticle(mockRequest))
        .rejects.toThrow(ProviderError);
    });

    it('should handle timeout error', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      mockPost.mockRejectedValueOnce(timeoutError);

      await expect(provider.analyzeArticle(mockRequest))
        .rejects.toThrow(ProviderError);
    });

    it('should exhaust retries on persistent errors', async () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            error: {
              message: 'Internal server error'
            }
          }
        }
      };

      // Mock all retry attempts to fail
      mockPost.mockRejectedValue(serverError);

      await expect(provider.analyzeArticle(mockRequest))
        .rejects.toThrow(ProviderError);

      // Should have tried maxRetries + 1 times
      expect(mockPost).toHaveBeenCalledTimes(4);
    });
  });

  describe('checkHealth', () => {
    it('should pass health check with valid response', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [{ message: { content: 'Hello' } }]
        }
      });

      const health = await provider.checkHealth();

      expect(health.available).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it('should fail health check on authentication error', async () => {
      const authError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key'
            }
          }
        }
      };

      mockPost.mockRejectedValueOnce(authError);

      const health = await provider.checkHealth();

      expect(health.available).toBe(false);
      expect(health.error).toContain('Invalid API key');
    });

    it('should fail health check on rate limit', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded'
            }
          }
        }
      };

      mockPost.mockRejectedValueOnce(rateLimitError);

      const health = await provider.checkHealth();

      expect(health.available).toBe(false);
      expect(health.error).toContain('Rate limit exceeded');
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { choices: [{ message: { content: 'Hello' } }] }
      });

      await provider.initialize();

      expect(provider.isInitialized()).toBe(true);
    });

    it('should fail initialization on health check failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.initialize()).rejects.toThrow(ProviderError);
      expect(provider.isInitialized()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      // Initialize first
      mockPost.mockResolvedValueOnce({
        status: 200,
        data: { choices: [{ message: { content: 'Hello' } }] }
      });
      
      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);

      await provider.cleanup();
      expect(provider.isInitialized()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should categorize different error types correctly', async () => {
      const testCases = [
        {
          error: { isAxiosError: true, response: { status: 401 } },
          expectedType: ProviderErrorType.AUTHENTICATION_ERROR
        },
        {
          error: { isAxiosError: true, response: { status: 429 } },
          expectedType: ProviderErrorType.RATE_LIMIT_ERROR
        },
        {
          error: { isAxiosError: true, response: { status: 400 } },
          expectedType: ProviderErrorType.MODEL_ERROR
        },
        {
          error: { isAxiosError: true, response: { status: 500 } },
          expectedType: ProviderErrorType.NETWORK_ERROR
        },
        {
          error: { code: 'ETIMEDOUT' },
          expectedType: ProviderErrorType.TIMEOUT_ERROR
        }
      ];

      for (const testCase of testCases) {
        mockPost.mockRejectedValueOnce(testCase.error);

        try {
          await provider.analyzeArticle(mockRequest);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(ProviderError);
          expect((error as ProviderError).type).toBe(testCase.expectedType);
        }
      }
    });
  });
});