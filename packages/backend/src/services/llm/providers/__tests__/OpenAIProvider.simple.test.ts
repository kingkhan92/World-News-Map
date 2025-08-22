import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../OpenAIProvider.js';
import { 
  ProviderError, 
  ProviderErrorType, 
  BiasAnalysisRequest 
} from '../../../../types/llmProvider.js';

describe('OpenAIProvider - Simple Tests', () => {
  const mockConfig = {
    apiKey: 'sk-test-key-123',
    model: 'gpt-3.5-turbo',
    timeout: 30000,
    maxRetries: 3,
    temperature: 0.3,
    maxTokens: 500
  };

  describe('constructor', () => {
    it('should create provider with valid config', () => {
      const provider = new OpenAIProvider(mockConfig);
      
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

    it('should accept valid OpenAI models', () => {
      const validModels = [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-4',
        'gpt-4-32k',
        'gpt-4-turbo-preview',
        'gpt-4-1106-preview'
      ];

      for (const model of validModels) {
        expect(() => {
          new OpenAIProvider({ ...mockConfig, model });
        }).not.toThrow();
      }
    });
  });

  describe('configuration validation', () => {
    it('should validate required configuration fields', () => {
      const invalidConfigs = [
        { ...mockConfig, model: '' },
        { ...mockConfig, timeout: 0 },
        { ...mockConfig, timeout: -1000 },
        { ...mockConfig, maxRetries: -1 }
      ];

      for (const config of invalidConfigs) {
        expect(() => {
          new OpenAIProvider(config);
        }).toThrow();
      }
    });

    it('should accept valid configuration ranges', () => {
      const validConfigs = [
        { ...mockConfig, timeout: 1000 },
        { ...mockConfig, timeout: 60000 },
        { ...mockConfig, maxRetries: 0 },
        { ...mockConfig, maxRetries: 5 },
        { ...mockConfig, temperature: 0 },
        { ...mockConfig, temperature: 1 },
        { ...mockConfig, maxTokens: 100 },
        { ...mockConfig, maxTokens: 4000 }
      ];

      for (const config of validConfigs) {
        expect(() => {
          new OpenAIProvider(config);
        }).not.toThrow();
      }
    });
  });

  describe('bias prompt generation', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should generate structured bias analysis prompt', () => {
      const request: BiasAnalysisRequest = {
        title: 'Test Article Title',
        content: 'This is test content for bias analysis.',
        summary: 'Test summary',
        source: 'Test Source'
      };

      // Access the protected method through type assertion
      const prompt = (provider as any).generateBiasPrompt(request);

      expect(prompt).toContain('Test Article Title');
      expect(prompt).toContain('This is test content for bias analysis.');
      expect(prompt).toContain('Test summary');
      expect(prompt).toContain('Test Source');
      expect(prompt).toContain('political_lean');
      expect(prompt).toContain('factual_accuracy');
      expect(prompt).toContain('emotional_tone');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('bias_score');
      expect(prompt).toContain('JSON');
    });

    it('should handle optional fields in prompt generation', () => {
      const request: BiasAnalysisRequest = {
        title: 'Test Article Title',
        content: 'This is test content for bias analysis.'
        // No summary or source
      };

      const prompt = (provider as any).generateBiasPrompt(request);

      expect(prompt).toContain('Test Article Title');
      expect(prompt).toContain('This is test content for bias analysis.');
      expect(prompt).not.toContain('Summary:');
      expect(prompt).not.toContain('Source:');
    });
  });

  describe('bias score normalization', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should normalize bias scores to 0-100 range', () => {
      const testCases = [
        { input: -10, expected: 0 },
        { input: 0, expected: 0 },
        { input: 25.7, expected: 26 },
        { input: 50, expected: 50 },
        { input: 75.3, expected: 75 },
        { input: 100, expected: 100 },
        { input: 150, expected: 100 }
      ];

      for (const testCase of testCases) {
        const result = (provider as any).normalizeBiasScore(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('response validation', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should validate complete bias response', () => {
      const validResponse = {
        political_lean: 'center' as const,
        factual_accuracy: 85,
        emotional_tone: 60,
        confidence: 90,
        bias_score: 50
      };

      expect(() => {
        (provider as any).validateBiasResponse(validResponse);
      }).not.toThrow();
    });

    it('should reject response with missing fields', () => {
      const incompleteResponse = {
        political_lean: 'center' as const,
        factual_accuracy: 85
        // Missing other required fields
      };

      expect(() => {
        (provider as any).validateBiasResponse(incompleteResponse);
      }).toThrow('Missing required field');
    });

    it('should reject response with invalid political lean', () => {
      const invalidResponse = {
        political_lean: 'invalid',
        factual_accuracy: 85,
        emotional_tone: 60,
        confidence: 90,
        bias_score: 50
      };

      expect(() => {
        (provider as any).validateBiasResponse(invalidResponse);
      }).toThrow('Invalid political_lean value');
    });

    it('should reject response with out-of-range numeric values', () => {
      const testCases = [
        { field: 'factual_accuracy', value: -10 },
        { field: 'factual_accuracy', value: 150 },
        { field: 'emotional_tone', value: -5 },
        { field: 'emotional_tone', value: 105 },
        { field: 'confidence', value: -1 },
        { field: 'confidence', value: 101 },
        { field: 'bias_score', value: -20 },
        { field: 'bias_score', value: 120 }
      ];

      for (const testCase of testCases) {
        const invalidResponse = {
          political_lean: 'center' as const,
          factual_accuracy: 85,
          emotional_tone: 60,
          confidence: 90,
          bias_score: 50,
          [testCase.field]: testCase.value
        };

        expect(() => {
          (provider as any).validateBiasResponse(invalidResponse);
        }).toThrow(`Invalid ${testCase.field} value`);
      }
    });

    it('should reject response with non-numeric values', () => {
      const invalidResponse = {
        political_lean: 'center' as const,
        factual_accuracy: 'not a number',
        emotional_tone: 60,
        confidence: 90,
        bias_score: 50
      };

      expect(() => {
        (provider as any).validateBiasResponse(invalidResponse);
      }).toThrow('Invalid factual_accuracy value');
    });
  });

  describe('error categorization', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should categorize axios errors correctly', () => {
      const testCases = [
        {
          error: {
            isAxiosError: true,
            response: { status: 401, data: { error: { message: 'Invalid API key' } } }
          },
          expectedType: ProviderErrorType.AUTHENTICATION_ERROR
        },
        {
          error: {
            isAxiosError: true,
            response: { status: 429, data: { error: { message: 'Rate limit exceeded' } } }
          },
          expectedType: ProviderErrorType.RATE_LIMIT_ERROR
        },
        {
          error: {
            isAxiosError: true,
            response: { status: 400, data: { error: { message: 'Bad request' } } }
          },
          expectedType: ProviderErrorType.MODEL_ERROR
        },
        {
          error: {
            isAxiosError: true,
            response: { status: 500, data: { error: { message: 'Server error' } } }
          },
          expectedType: ProviderErrorType.NETWORK_ERROR
        }
      ];

      for (const testCase of testCases) {
        const result = (provider as any).handleOpenAIError(testCase.error);
        expect(result).toBeInstanceOf(ProviderError);
        expect(result.type).toBe(testCase.expectedType);
      }
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      const result = (provider as any).handleOpenAIError(timeoutError);
      expect(result).toBeInstanceOf(ProviderError);
      expect(result.type).toBe(ProviderErrorType.TIMEOUT_ERROR);
    });

    it('should categorize unknown errors correctly', () => {
      const unknownError = new Error('Unknown error');

      const result = (provider as any).handleOpenAIError(unknownError);
      expect(result).toBeInstanceOf(ProviderError);
      expect(result.type).toBe(ProviderErrorType.UNKNOWN_ERROR);
    });
  });

  describe('initialization state', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should start uninitialized', () => {
      expect(provider.isInitialized()).toBe(false);
    });

    it('should throw error when analyzing before initialization', async () => {
      const request: BiasAnalysisRequest = {
        title: 'Test Article',
        content: 'Test content'
      };

      await expect(provider.analyzeArticle(request))
        .rejects.toThrow('Provider not initialized');
    });
  });
});