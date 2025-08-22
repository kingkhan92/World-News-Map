import { BiasAnalysisService } from '../biasAnalysisService.js';
import { ProviderFactory } from '../llm/ProviderFactory.js';
import { ProviderHealthMonitor } from '../llm/ProviderHealthMonitor.js';
import { ProviderConfigManager } from '../llm/ProviderConfigManager.js';
import { ProviderFallbackManager } from '../llm/ProviderFallbackManager.js';
import { 
  BiasAnalysisRequest, 
  BiasAnalysisResult,
  ProviderError,
  ProviderErrorType 
} from '../../types/llmProvider.js';
import { redisClient } from '../../utils/redis.js';

// Mock dependencies
jest.mock('../llm/ProviderFactory.js');
jest.mock('../llm/ProviderHealthMonitor.js');
jest.mock('../llm/ProviderConfigManager.js');
jest.mock('../llm/ProviderFallbackManager.js');
jest.mock('../../utils/redis.js');

describe('BiasAnalysisService with Fallback', () => {
  let mockFactory: jest.Mocked<ProviderFactory>;
  let mockHealthMonitor: jest.Mocked<ProviderHealthMonitor>;
  let mockConfigManager: jest.Mocked<ProviderConfigManager>;
  let mockFallbackManager: jest.Mocked<ProviderFallbackManager>;

  const sampleRequest: BiasAnalysisRequest = {
    title: 'Test Article Title',
    content: 'This is a test article content for bias analysis testing.',
    summary: 'Test summary',
    source: 'test-news-source'
  };

  const sampleResult: BiasAnalysisResult = {
    biasScore: 42,
    biasAnalysis: {
      politicalLean: 'left',
      factualAccuracy: 88,
      emotionalTone: 65,
      confidence: 92
    },
    provider: 'openai',
    confidence: 92,
    processingTime: 1200
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock ProviderFactory
    mockFactory = {
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      getAllProviders: jest.fn().mockReturnValue(new Map()),
      getProvider: jest.fn().mockReturnValue(null),
      getBestProvider: jest.fn().mockResolvedValue(null)
    } as any;

    // Mock ProviderHealthMonitor
    mockHealthMonitor = {
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      getHealthStatus: jest.fn().mockResolvedValue(new Map()),
      recordMetrics: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock ProviderConfigManager
    mockConfigManager = {
      getInstance: jest.fn().mockReturnValue(mockConfigManager),
      getPrimaryProvider: jest.fn().mockReturnValue('openai'),
      getFallbackProviders: jest.fn().mockReturnValue(['grok', 'ollama'])
    } as any;

    // Mock ProviderFallbackManager
    mockFallbackManager = {
      analyzeWithFallback: jest.fn().mockResolvedValue(sampleResult),
      getProviderChainHealth: jest.fn().mockResolvedValue({
        primary: { type: 'openai', healthy: true, responseTime: 1000 },
        fallbacks: [
          { type: 'grok', healthy: true, responseTime: 1500 },
          { type: 'ollama', healthy: false, responseTime: undefined }
        ],
        circuitBreakers: []
      }),
      getPerformanceSummary: jest.fn().mockResolvedValue(new Map()),
      resetCircuitBreakers: jest.fn()
    } as any;

    // Mock Redis
    (redisClient.get as jest.Mock).mockResolvedValue(null);
    (redisClient.setEx as jest.Mock).mockResolvedValue('OK');

    // Setup constructor mocks
    (ProviderFactory.getInstance as jest.Mock).mockReturnValue(mockFactory);
    (ProviderConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);
    (ProviderHealthMonitor as jest.Mock).mockImplementation(() => mockHealthMonitor);
    (ProviderFallbackManager as jest.Mock).mockImplementation(() => mockFallbackManager);

    // Cleanup any existing service state
    await BiasAnalysisService.cleanup();
  });

  afterEach(async () => {
    await BiasAnalysisService.cleanup();
  });

  describe('initialization', () => {
    it('should initialize all LLM provider components', async () => {
      // Execute
      await BiasAnalysisService.initialize();

      // Verify
      expect(ProviderConfigManager.getInstance).toHaveBeenCalled();
      expect(ProviderFactory.getInstance).toHaveBeenCalled();
      expect(mockFactory.initialize).toHaveBeenCalled();
      expect(mockHealthMonitor.startMonitoring).toHaveBeenCalled();
      expect(ProviderFallbackManager).toHaveBeenCalledWith(
        mockFactory,
        mockHealthMonitor,
        mockConfigManager
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Setup
      mockFactory.initialize.mockRejectedValue(new Error('Factory initialization failed'));

      // Execute & Verify
      await expect(BiasAnalysisService.initialize()).rejects.toThrow('Factory initialization failed');
    });

    it('should not reinitialize if already initialized', async () => {
      // Execute
      await BiasAnalysisService.initialize();
      await BiasAnalysisService.initialize(); // Second call

      // Verify - should only initialize once
      expect(mockFactory.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeArticle with fallback', () => {
    beforeEach(async () => {
      await BiasAnalysisService.initialize();
    });

    it('should use fallback manager for analysis', async () => {
      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(mockFallbackManager.analyzeWithFallback).toHaveBeenCalledWith(sampleRequest);
      expect(result).toEqual(sampleResult);
    });

    it('should cache successful results from providers', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockResolvedValue({
        ...sampleResult,
        provider: 'openai' // Not a fallback provider
      });

      // Execute
      await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('bias_analysis:'),
        7 * 24 * 60 * 60, // 7 days
        expect.stringContaining('"biasScore":42')
      );
    });

    it('should not cache fallback results', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockResolvedValue({
        ...sampleResult,
        provider: 'cached_fallback'
      });

      // Execute
      await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(redisClient.setEx).not.toHaveBeenCalled();
    });

    it('should not cache neutral fallback results', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockResolvedValue({
        ...sampleResult,
        provider: 'neutral_fallback'
      });

      // Execute
      await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(redisClient.setEx).not.toHaveBeenCalled();
    });

    it('should return cached results when available', async () => {
      // Setup
      const cachedResult = { ...sampleResult, provider: 'cached' };
      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedResult));

      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(result).toEqual(cachedResult);
      expect(mockFallbackManager.analyzeWithFallback).not.toHaveBeenCalled();
    });

    it('should handle complete fallback manager failure', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockRejectedValue(
        new Error('All providers failed')
      );

      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify - should return neutral fallback
      expect(result.provider).toBe('neutral_fallback');
      expect(result.biasScore).toBe(50);
      expect(result.biasAnalysis.politicalLean).toBe('center');
      expect(result.confidence).toBe(0);
    });

    it('should auto-initialize if not already initialized', async () => {
      // Setup - cleanup to reset initialization
      await BiasAnalysisService.cleanup();

      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(result).toEqual(sampleResult);
      expect(mockFactory.initialize).toHaveBeenCalled();
    });
  });

  describe('provider health monitoring', () => {
    beforeEach(async () => {
      await BiasAnalysisService.initialize();
    });

    it('should return provider health status', async () => {
      // Execute
      const health = await BiasAnalysisService.getProviderHealth();

      // Verify
      expect(mockFallbackManager.getProviderChainHealth).toHaveBeenCalled();
      expect(health.primary.type).toBe('openai');
      expect(health.fallbacks).toHaveLength(2);
    });

    it('should return performance summary', async () => {
      // Setup
      const mockSummary = new Map([
        ['openai', { averageResponseTime: 1000, successRate: 95, totalRequests: 100, recentErrors: 1 }],
        ['grok', { averageResponseTime: 1500, successRate: 90, totalRequests: 50, recentErrors: 2 }]
      ]);
      mockFallbackManager.getPerformanceSummary.mockResolvedValue(mockSummary);

      // Execute
      const summary = await BiasAnalysisService.getPerformanceSummary();

      // Verify
      expect(mockFallbackManager.getPerformanceSummary).toHaveBeenCalled();
      expect(summary).toEqual(mockSummary);
    });

    it('should reset circuit breakers', () => {
      // Execute
      BiasAnalysisService.resetCircuitBreakers();

      // Verify
      expect(mockFallbackManager.resetCircuitBreakers).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all components properly', async () => {
      // Setup
      await BiasAnalysisService.initialize();

      // Execute
      await BiasAnalysisService.cleanup();

      // Verify
      expect(mockHealthMonitor.stopMonitoring).toHaveBeenCalled();
      expect(mockFactory.cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup when not initialized', async () => {
      // Execute - should not throw
      await BiasAnalysisService.cleanup();

      // Verify - no calls should be made
      expect(mockHealthMonitor.stopMonitoring).not.toHaveBeenCalled();
      expect(mockFactory.cleanup).not.toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    beforeEach(async () => {
      await BiasAnalysisService.initialize();
    });

    it('should handle provider timeout errors', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockResolvedValue({
        ...sampleResult,
        provider: 'grok', // Fallback was used
        processingTime: 5000
      });

      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(result.provider).toBe('grok');
      expect(result.processingTime).toBe(5000);
    });

    it('should handle provider authentication errors', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockResolvedValue({
        ...sampleResult,
        provider: 'ollama', // Local provider used as fallback
        confidence: 80 // Slightly lower confidence
      });

      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(result.provider).toBe('ollama');
      expect(result.confidence).toBe(80);
    });

    it('should handle network connectivity issues', async () => {
      // Setup
      mockFallbackManager.analyzeWithFallback.mockResolvedValue({
        biasScore: 50,
        biasAnalysis: {
          politicalLean: 'center',
          factualAccuracy: 50,
          emotionalTone: 50,
          confidence: 20 // Low confidence for cached result
        },
        provider: 'cached_fallback',
        confidence: 20,
        processingTime: 0
      });

      // Execute
      const result = await BiasAnalysisService.analyzeArticle(sampleRequest);

      // Verify
      expect(result.provider).toBe('cached_fallback');
      expect(result.confidence).toBe(20);
    });
  });
});