import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import axios from 'axios';
import { OllamaProvider } from '../OllamaProvider.js';
import { ProviderError, ProviderErrorType, BiasAnalysisRequest } from '../../../../types/llmProvider.js';

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

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let mockAxiosInstance: any;

  const defaultConfig = {
    baseUrl: 'http://localhost:11434',
    model: 'llama2:7b',
    timeout: 30000,
    maxRetries: 2,
    temperature: 0.3
  };

  const mockBiasRequest: BiasAnalysisRequest = {
    title: 'Test Article Title',
    content: 'This is a test article content for bias analysis.',
    summary: 'Test summary',
    source: 'Test Source'
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock axios.create
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError = vi.fn();
    
    provider = new OllamaProvider(defaultConfig);
  });

  afterEach(async () => {
    if (provider.isInitialized()) {
      await provider.cleanup();
    }
  });

  describe('constructor', () => {
    it('should create provider with valid configuration', () => {
      expect(provider.name).toBe('Ollama');
      expect(provider.type).toBe('ollama');
      expect(provider.config).toEqual(defaultConfig);
    });

    it('should throw error for missing baseUrl', () => {
      expect(() => {
        new OllamaProvider({
          ...defaultConfig,
          baseUrl: ''
        });
      }).toThrow(ProviderError);
    });

    it('should throw error for invalid baseUrl format', () => {
      expect(() => {
        new OllamaProvider({
          ...defaultConfig,
          baseUrl: 'invalid-url'
        });
      }).toThrow(ProviderError);
    });

    it('should throw error for missing model', () => {
      expect(() => {
        new OllamaProvider({
          ...defaultConfig,
          model: ''
        });
      }).toThrow(ProviderError);
    });

    it('should throw error for invalid temperature', () => {
      expect(() => {
        new OllamaProvider({
          ...defaultConfig,
          temperature: 3.0
        });
      }).toThrow(ProviderError);
    });

    it('should throw error for invalid topP', () => {
      expect(() => {
        new OllamaProvider({
          ...defaultConfig,
          topP: 1.5
        });
      }).toThrow(ProviderError);
    });

    it('should throw error for invalid topK', () => {
      expect(() => {
        new OllamaProvider({
          ...defaultConfig,
          topK: 0
        });
      }).toThrow(ProviderError);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with available model', async () => {
      // Mock successful status check
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { models: [] }
      });

      // Mock successful model list with our model
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          models: [
            {
              name: 'llama2:7b',
              model: 'llama2:7b',
              modified_at: '2024-01-01T00:00:00Z',
              size: 3800000000,
              digest: 'sha256:abc123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      });

      // Mock successful test request
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hello!'
          },
          done: true
        }
      });

      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);
    });

    it('should pull model if not available locally', async () => {
      // Mock successful status check
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { models: [] }
      });

      // Mock empty model list initially
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { models: [] }
      });

      // Mock successful model pull
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      // Mock model list after pull
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          models: [
            {
              name: 'llama2:7b',
              model: 'llama2:7b',
              modified_at: '2024-01-01T00:00:00Z',
              size: 3800000000,
              digest: 'sha256:abc123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      });

      // Mock successful test request
      mockAxiosInstance.post.mockResolvedValueOnce({
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hello!'
          },
          done: true
        }
      });

      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);
      
      // Verify pull was called
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/pull', {
        name: 'llama2:7b'
      }, expect.any(Object));
    });

    it('should throw error if Ollama server is not running', async () => {
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(connectionError);

      await expect(provider.initialize()).rejects.toThrow(ProviderError);
    });

    it('should throw error if model cannot be pulled', async () => {
      // Mock successful status check
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { models: [] }
      });

      // Mock empty model list
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: { models: [] }
      });

      // Mock failed model pull
      mockAxiosInstance.post.mockRejectedValue(new Error('Model not found'));

      await expect(provider.initialize()).rejects.toThrow(ProviderError);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      // Initialize provider for health check tests
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          models: [
            {
              name: 'llama2:7b',
              model: 'llama2:7b',
              modified_at: '2024-01-01T00:00:00Z',
              size: 3800000000,
              digest: 'sha256:abc123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      });

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hello!'
          },
          done: true
        }
      });

      await provider.initialize();
    });

    it('should pass health check when server is healthy', async () => {
      const health = await provider.checkHealth();
      
      expect(health.available).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it('should fail health check when server is unreachable', async () => {
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(connectionError);

      const health = await provider.checkHealth();
      
      expect(health.available).toBe(false);
      expect(health.error).toContain('not running');
    });

    it('should fail health check when model is not available', async () => {
      // Mock server running but model not available
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { models: [] }
      });

      const health = await provider.checkHealth();
      
      expect(health.available).toBe(false);
      expect(health.error).toContain('not available');
    });
  });

  describe('bias analysis', () => {
    beforeEach(async () => {
      // Initialize provider for analysis tests
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          models: [
            {
              name: 'llama2:7b',
              model: 'llama2:7b',
              modified_at: '2024-01-01T00:00:00Z',
              size: 3800000000,
              digest: 'sha256:abc123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      });

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hello!'
          },
          done: true
        }
      });

      await provider.initialize();
    });

    it('should analyze article bias successfully with JSON response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: JSON.stringify({
              political_lean: 'center',
              factual_accuracy: 85,
              emotional_tone: 60,
              confidence: 80,
              bias_score: 50
            })
          },
          done: true,
          total_duration: 1000000000,
          eval_count: 100
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.analyzeArticle(mockBiasRequest);

      expect(result.biasScore).toBe(50);
      expect(result.biasAnalysis.politicalLean).toBe('center');
      expect(result.biasAnalysis.factualAccuracy).toBe(85);
      expect(result.biasAnalysis.emotionalTone).toBe(60);
      expect(result.biasAnalysis.confidence).toBe(80);
      expect(result.provider).toBe('Ollama');
      expect(result.confidence).toBe(80);
    });

    it('should analyze article bias successfully with structured text response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: `POLITICAL_LEAN: center
FACTUAL_ACCURACY: 85
EMOTIONAL_TONE: 60
CONFIDENCE: 80
BIAS_SCORE: 50`
          },
          done: true,
          total_duration: 1000000000,
          eval_count: 100
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.analyzeArticle(mockBiasRequest);

      expect(result.biasScore).toBe(50);
      expect(result.biasAnalysis.politicalLean).toBe('center');
      expect(result.biasAnalysis.factualAccuracy).toBe(85);
      expect(result.biasAnalysis.emotionalTone).toBe(60);
      expect(result.biasAnalysis.confidence).toBe(80);
    });

    it('should handle JSON response with extra text', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: `Here is my analysis:

{
  "political_lean": "left",
  "factual_accuracy": 75,
  "emotional_tone": 40,
  "confidence": 85,
  "bias_score": 30
}

This analysis is based on the content provided.`
          },
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.analyzeArticle(mockBiasRequest);

      expect(result.biasScore).toBe(30);
      expect(result.biasAnalysis.politicalLean).toBe('left');
    });

    it('should throw error for invalid request without title', async () => {
      const invalidRequest = { ...mockBiasRequest, title: '' };

      await expect(provider.analyzeArticle(invalidRequest)).rejects.toThrow(ProviderError);
    });

    it('should throw error for invalid request without content', async () => {
      const invalidRequest = { ...mockBiasRequest, content: '' };

      await expect(provider.analyzeArticle(invalidRequest)).rejects.toThrow(ProviderError);
    });

    it('should throw error for invalid response format', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Invalid response format'
          },
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(ProviderError);
    });

    it('should throw error for missing required fields in JSON response', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: JSON.stringify({
              political_lean: 'center',
              factual_accuracy: 85
              // Missing other required fields
            })
          },
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(ProviderError);
    });

    it('should throw error for invalid political_lean value', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: JSON.stringify({
              political_lean: 'invalid',
              factual_accuracy: 85,
              emotional_tone: 60,
              confidence: 80,
              bias_score: 50
            })
          },
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(ProviderError);
    });

    it('should throw error for out-of-range numeric values', async () => {
      const mockResponse = {
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: JSON.stringify({
              political_lean: 'center',
              factual_accuracy: 150, // Invalid: > 100
              emotional_tone: 60,
              confidence: 80,
              bias_score: 50
            })
          },
          done: true
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(ProviderError);
    });

    it('should retry on server errors', async () => {
      // First call fails with server error
      mockAxiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 500 },
          message: 'Server error'
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            model: 'llama2:7b',
            created_at: '2024-01-01T00:00:00Z',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                political_lean: 'center',
                factual_accuracy: 85,
                emotional_tone: 60,
                confidence: 80,
                bias_score: 50
              })
            },
            done: true
          }
        });

      mockedAxios.isAxiosError.mockReturnValue(true);

      const result = await provider.analyzeArticle(mockBiasRequest);
      expect(result.biasScore).toBe(50);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should throw timeout error', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(ProviderError);
    });
  });

  describe('model capabilities', () => {
    it('should return available models', () => {
      const models = provider.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('should return model capabilities for known models', () => {
      const capabilities = provider.getModelCapabilities('llama3:8b');
      expect(capabilities).toEqual({
        supportsJson: true,
        contextLength: 8192
      });
    });

    it('should return undefined for unknown models', () => {
      const capabilities = provider.getModelCapabilities('unknown-model');
      expect(capabilities).toBeUndefined();
    });

    it('should return capabilities for configured model', () => {
      const capabilities = provider.getModelCapabilities();
      expect(capabilities).toEqual({
        supportsJson: false,
        contextLength: 4096
      });
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      // Initialize provider for error handling tests
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          models: [
            {
              name: 'llama2:7b',
              model: 'llama2:7b',
              modified_at: '2024-01-01T00:00:00Z',
              size: 3800000000,
              digest: 'sha256:abc123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      });

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hello!'
          },
          done: true
        }
      });

      await provider.initialize();
    });

    it('should handle connection refused error', async () => {
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(connectionError);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(
        expect.objectContaining({
          type: ProviderErrorType.NETWORK_ERROR,
          message: expect.stringContaining('not running')
        })
      );
    });

    it('should handle model not found error', async () => {
      const notFoundError = {
        response: { status: 404 },
        message: 'Model not found'
      };
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(notFoundError);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(
        expect.objectContaining({
          type: ProviderErrorType.CONFIGURATION_ERROR,
          message: expect.stringContaining('Model not found')
        })
      );
    });

    it('should handle bad request error', async () => {
      const badRequestError = {
        response: { status: 400, data: { error: 'Bad request' } },
        message: 'Bad request'
      };
      
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(badRequestError);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(
        expect.objectContaining({
          type: ProviderErrorType.MODEL_ERROR
        })
      );
    });

    it('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValue(unknownError);

      await expect(provider.analyzeArticle(mockBiasRequest)).rejects.toThrow(
        expect.objectContaining({
          type: ProviderErrorType.UNKNOWN_ERROR
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      // Initialize first
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          models: [
            {
              name: 'llama2:7b',
              model: 'llama2:7b',
              modified_at: '2024-01-01T00:00:00Z',
              size: 3800000000,
              digest: 'sha256:abc123',
              details: {
                parent_model: '',
                format: 'gguf',
                family: 'llama',
                families: ['llama'],
                parameter_size: '7B',
                quantization_level: 'Q4_0'
              }
            }
          ]
        }
      });

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: {
          model: 'llama2:7b',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Hello!'
          },
          done: true
        }
      });

      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);

      await provider.cleanup();
      expect(provider.isInitialized()).toBe(false);
    });
  });
});