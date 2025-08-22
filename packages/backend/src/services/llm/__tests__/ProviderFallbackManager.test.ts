import { ProviderFallbackManager } from '../ProviderFallbackManager.js';
import { ProviderFactory } from '../ProviderFactory.js';
import { ProviderHealthMonitor } from '../ProviderHealthMonitor.js';
import { ProviderConfigManager } from '../ProviderConfigManager.js';
import { 
  LLMProvider, 
  ProviderType, 
  BiasAnalysisRequest, 
  BiasAnalysisResult,
  ProviderError,
  ProviderErrorType,
  ProviderHealth 
} from '../../../types/llmProvider.js';
import { redisClient } from '../../../utils/redis.js';
import { logger } from '../../../utils/logger.js';

// Mock dependencies
jest.mock('../../../utils/redis.js');
jest.mock('../../../utils/logger.js');

describe('ProviderFallbackManager', () => {
  let fallbackManager: ProviderFallbackManager;
  let mockFactory: jest.Mocked<ProviderFactory>;
  let mockHealthMonitor: jest.Mocked<ProviderHealthMonitor>;
  let mockConfigManager: jest.Mocked<ProviderConfigManager>;
  let mockProvider1: jest.Mocked<LLMProvider>;
  let mockProvider2: jest.Mocked<LLMProvider>;
  let mockProvider3: jest.Mocked<LLMProvider>;

  const sampleRequest: BiasAnalysisRequest = {
    title: 'Test Article',
    content: 'This is test content for bias analysis.',
    summary: 'Test summary',
    source: 'test-source'
  };

  const sampleResult: BiasAnalysisResult = {
    biasScore: 45,
    biasAnalysis: {
      politicalLean: 'left',
      factualAccuracy: 85,
      emotionalTone: 60,
      confidence: 90
    },
    provider: 'openai',
    confidence: 90,
    processingTime: 1500
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock providers
    mockProvider1 = {
      name: 'OpenAI Provider',
      type: 'openai',
      config: { model: 'gpt-3.5-turbo', timeout: 30000, maxRetries: 3 },
      analyzeArticle: jest.fn(),
      checkHealth: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true)
    };

    mockProvider2 = {
      name: 'Grok Provider',
      type: 'grok',
      config: { model: 'grok-beta', timeout: 30000, maxRetries: 3 },
      analyzeArticle: jest.fn(),
      checkHealth: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true)
    };

    mockProvider3 = {
      name: 'Ollama Provider',
      type: 'ollama',
      config: { model: 'llama2:7b', timeout: 60000, maxRetries: 2 },
      analyzeArticle: jest.fn(),
      checkHealth: jest.fn(),
      initialize: jest.fn(),
      cleanup: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true)
    };

    // Mock factory
    mockFactory = {
      getAllProviders: jest.fn().mockReturnValue(new Map([
        ['openai', mockProvider1],
        ['grok', mockProvider2],
        ['ollama', mockProvider3]
      ])),
      getProvider: jest.fn().mockImplementation((type: ProviderType) => {
        const providers = { openai: mockProvider1, grok: mockProvider2, ollama: mockProvider3 };
        return providers[type] || null;
      }),
      getBestProvider: jest.fn()
    } as any;

    // Mock health monitor
    mockHealthMonitor = {
      getHealthStatus: jest.fn(),
      getProviderHealth: jest.fn(),
      recordMetrics: jest.fn(),
      getProviderMetrics: jest.fn()
    } as any;

    // Mock config manager
    mockConfigManager = {
      getPrimaryProvider: jest.fn().mockReturnValue('openai'),
      getFallbackProviders: jest.fn().mockReturnValue(['grok', 'ollama'])
    } as any;

    // Mock Redis
    (redisClient.get as jest.Mock).mockResolvedValue(null);
    (redisClient.setEx as jest.Mock).mockResolvedValue('OK');

    fallbackManager = new ProviderFallbackManager(
      mockFactory,
      mockHealthMonitor,
      mockConfigManager
    );
  });

  describe('analyzeWithFallback', () => {
    it('should use primary provider when healthy', async () => {
      // Setup
      mockProvider1.analyzeArticle.mockResolvedValue(sampleResult);
      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }],
        ['ollama', { available: true, responseTime: 2000, lastChecked: new Date() }]
      ]));

      // Execute
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify
      expect(result).toEqual(sampleResult);
      expect(mockProvider1.analyzeArticle).toHaveBeenCalledWith(sampleRequest);
      expect(mockProvider2.analyzeArticle).not.toHaveBeenCalled();
      expect(mockProvider3.analyzeArticle).not.toHaveBeenCalled();
      expect(mockHealthMonitor.recordMetrics).toHaveBeenCalledWith('openai', expect.any(Number), true);
    });

    it('should fallback to secondary provider when primary fails', async () => {
      // Setup
      mockProvider1.analyzeArticle.mockRejectedValue(new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        'openai',
        'Network error'
      ));
      mockProvider2.analyzeArticle.mockResolvedValue({
        ...sampleResult,
        provider: 'grok'
      });
      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }],
        ['ollama', { available: true, responseTime: 2000, lastChecked: new Date() }]
      ]));

      // Execute
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify
      expect(result.provider).toBe('grok');
      expect(mockProvider1.analyzeArticle).toHaveBeenCalledWith(sampleRequest);
      expect(mockProvider2.analyzeArticle).toHaveBeenCalledWith(sampleRequest);
      expect(mockProvider3.analyzeArticle).not.toHaveBeenCalled();
      expect(mockHealthMonitor.recordMetrics).toHaveBeenCalledWith('openai', expect.any(Number), false);
      expect(mockHealthMonitor.recordMetrics).toHaveBeenCalledWith('grok', expect.any(Number), true);
    });

    it('should use cached fallback when all providers fail', async () => {
      // Setup - all providers fail
      const error = new ProviderError(ProviderErrorType.NETWORK_ERROR, 'test', 'Network error');
      mockProvider1.analyzeArticle.mockRejectedValue(error);
      mockProvider2.analyzeArticle.mockRejectedValue(error);
      mockProvider3.analyzeArticle.mockRejectedValue(error);
      
      // Mock cached result
      const cachedResult = { ...sampleResult, provider: 'cached_openai' };
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify({
        ...cachedResult,
        cachedAt: new Date().toISOString(),
        originalProvider: 'openai'
      }));

      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }],
        ['ollama', { available: true, responseTime: 2000, lastChecked: new Date() }]
      ]));

      // Execute
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify
      expect(result.provider).toBe('cached_fallback');
      expect(result.confidence).toBeLessThan(cachedResult.confidence); // Confidence should be reduced
      expect(mockProvider1.analyzeArticle).toHaveBeenCalled();
      expect(mockProvider2.analyzeArticle).toHaveBeenCalled();
      expect(mockProvider3.analyzeArticle).toHaveBeenCalled();
    });

    it('should return neutral fallback when no cached result available', async () => {
      // Setup - all providers fail and no cache
      const error = new ProviderError(ProviderErrorType.NETWORK_ERROR, 'test', 'Network error');
      mockProvider1.analyzeArticle.mockRejectedValue(error);
      mockProvider2.analyzeArticle.mockRejectedValue(error);
      mockProvider3.analyzeArticle.mockRejectedValue(error);
      
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }],
        ['ollama', { available: true, responseTime: 2000, lastChecked: new Date() }]
      ]));

      // Execute
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify
      expect(result.provider).toBe('neutral_fallback');
      expect(result.biasScore).toBe(50);
      expect(result.biasAnalysis.politicalLean).toBe('center');
      expect(result.confidence).toBe(0);
    });

    it('should skip providers with open circuit breakers', async () => {
      // Setup - simulate multiple failures to open circuit breaker
      const error = new ProviderError(ProviderErrorType.NETWORK_ERROR, 'openai', 'Network error');
      
      // First, cause enough failures to open circuit breaker
      mockProvider1.analyzeArticle.mockRejectedValue(error);
      mockProvider2.analyzeArticle.mockResolvedValue({ ...sampleResult, provider: 'grok' });
      
      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }],
        ['ollama', { available: true, responseTime: 2000, lastChecked: new Date() }]
      ]));

      // Cause multiple failures to open circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await fallbackManager.analyzeWithFallback(sampleRequest);
        } catch (e) {
          // Expected to fail or fallback
        }
      }

      // Reset mocks for the actual test
      jest.clearAllMocks();
      mockProvider1.analyzeArticle.mockResolvedValue(sampleResult);
      mockProvider2.analyzeArticle.mockResolvedValue({ ...sampleResult, provider: 'grok' });

      // Execute - should skip openai due to circuit breaker
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify - should use grok instead of openai
      expect(result.provider).toBe('grok');
      expect(mockProvider1.analyzeArticle).not.toHaveBeenCalled(); // Skipped due to circuit breaker
      expect(mockProvider2.analyzeArticle).toHaveBeenCalled();
    });
  });

  describe('getProviderChainHealth', () => {
    it('should return health status for all providers', async () => {
      // Setup
      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: false, responseTime: undefined, error: 'API key invalid', lastChecked: new Date() }],
        ['ollama', { available: true, responseTime: 2000, lastChecked: new Date() }]
      ]));

      // Execute
      const health = await fallbackManager.getProviderChainHealth();

      // Verify
      expect(health.primary.type).toBe('openai');
      expect(health.primary.healthy).toBe(true);
      expect(health.primary.responseTime).toBe(1000);
      
      expect(health.fallbacks).toHaveLength(2);
      expect(health.fallbacks[0].type).toBe('grok');
      expect(health.fallbacks[0].healthy).toBe(false);
      expect(health.fallbacks[1].type).toBe('ollama');
      expect(health.fallbacks[1].healthy).toBe(true);
    });
  });

  describe('resetCircuitBreakers', () => {
    it('should reset all circuit breakers and error counts', () => {
      // Execute
      fallbackManager.resetCircuitBreakers();

      // Verify - should not throw and should log
      expect(logger.info).toHaveBeenCalledWith('All circuit breakers reset');
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return performance metrics for all providers', async () => {
      // Setup
      mockHealthMonitor.getProviderMetrics.mockImplementation((type: ProviderType) => {
        const metrics = {
          openai: { averageResponseTime: 1000, successRate: 95, totalRequests: 100, recentErrors: 1 },
          grok: { averageResponseTime: 1500, successRate: 90, totalRequests: 50, recentErrors: 2 },
          ollama: { averageResponseTime: 2000, successRate: 85, totalRequests: 30, recentErrors: 0 }
        };
        return Promise.resolve(metrics[type] || { averageResponseTime: 0, successRate: 0, totalRequests: 0, recentErrors: 0 });
      });

      // Execute
      const summary = await fallbackManager.getPerformanceSummary();

      // Verify
      expect(summary.size).toBe(3);
      expect(summary.get('openai')).toMatchObject({
        averageResponseTime: 1000,
        successRate: 95,
        totalRequests: 100,
        recentErrors: 1,
        circuitBreakerOpen: false
      });
    });
  });

  describe('error handling and circuit breakers', () => {
    it('should handle timeout errors appropriately', async () => {
      // Setup
      const timeoutError = new ProviderError(
        ProviderErrorType.TIMEOUT_ERROR,
        'openai',
        'Analysis timed out after 30000ms'
      );
      
      mockProvider1.analyzeArticle.mockRejectedValue(timeoutError);
      mockProvider2.analyzeArticle.mockResolvedValue({ ...sampleResult, provider: 'grok' });
      
      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }]
      ]));

      // Execute
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify
      expect(result.provider).toBe('grok');
      expect(mockHealthMonitor.recordMetrics).toHaveBeenCalledWith('openai', expect.any(Number), false);
    });

    it('should handle rate limit errors appropriately', async () => {
      // Setup
      const rateLimitError = new ProviderError(
        ProviderErrorType.RATE_LIMIT_ERROR,
        'openai',
        'Rate limit exceeded'
      );
      
      mockProvider1.analyzeArticle.mockRejectedValue(rateLimitError);
      mockProvider2.analyzeArticle.mockResolvedValue({ ...sampleResult, provider: 'grok' });
      
      mockHealthMonitor.getHealthStatus.mockResolvedValue(new Map([
        ['openai', { available: true, responseTime: 1000, lastChecked: new Date() }],
        ['grok', { available: true, responseTime: 1500, lastChecked: new Date() }]
      ]));

      // Execute
      const result = await fallbackManager.analyzeWithFallback(sampleRequest);

      // Verify
      expect(result.provider).toBe('grok');
      expect(logger.warn).toHaveBeenCalledWith(
        'Provider failed, trying next in chain',
        expect.objectContaining({
          provider: 'openai',
          error: 'Rate limit exceeded'
        })
      );
    });
  });
});