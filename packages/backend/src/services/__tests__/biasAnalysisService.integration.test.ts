import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BiasAnalysisService } from '../biasAnalysisService.js';
import { BiasAnalysisRequest } from '../../types/llmProvider.js';

describe('BiasAnalysisService Integration Tests', () => {
  beforeAll(async () => {
    // Initialize the service
    await BiasAnalysisService.initialize();
  });

  afterAll(async () => {
    // Cleanup the service
    await BiasAnalysisService.cleanup();
  });

  describe('Multi-provider support', () => {
    it('should get available providers', async () => {
      const providers = await BiasAnalysisService.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should get provider configurations', async () => {
      const configs = await BiasAnalysisService.getProviderConfigurations();
      expect(typeof configs).toBe('object');
      expect(Object.keys(configs).length).toBeGreaterThan(0);
    });

    it('should get provider health status', async () => {
      const health = await BiasAnalysisService.getProviderHealth();
      expect(typeof health).toBe('object');
      expect(health).toHaveProperty('primary');
      expect(health).toHaveProperty('fallbacks');
      expect(health).toHaveProperty('circuitBreakers');
    });

    it('should analyze article with provider selection', async () => {
      const request: BiasAnalysisRequest = {
        title: 'Test Article: Economic Policy Changes',
        content: 'The government announced new economic policies that aim to reduce inflation and stimulate growth. These policies include tax reforms and increased public spending.',
        summary: 'Government announces new economic policies.',
        source: 'Test Source'
      };

      // Test without preferred provider
      const result1 = await BiasAnalysisService.analyzeArticle(request);
      expect(result1).toHaveProperty('biasScore');
      expect(result1).toHaveProperty('biasAnalysis');
      expect(result1).toHaveProperty('provider');
      expect(result1).toHaveProperty('confidence');
      expect(result1).toHaveProperty('processingTime');

      // Test with preferred provider (if available)
      const providers = await BiasAnalysisService.getAvailableProviders();
      if (providers.length > 0) {
        const result2 = await BiasAnalysisService.analyzeArticle(request, providers[0]);
        expect(result2).toHaveProperty('biasScore');
        expect(result2).toHaveProperty('provider');
      }
    });

    it('should handle provider-specific caching', async () => {
      const request: BiasAnalysisRequest = {
        title: 'Cache Test Article',
        content: 'This is a test article for cache functionality.',
        summary: 'Cache test',
        source: 'Test Source'
      };

      // First call should hit the provider
      const result1 = await BiasAnalysisService.analyzeArticle(request);
      
      // Second call should use cache
      const result2 = await BiasAnalysisService.analyzeArticle(request);
      
      expect(result1.biasScore).toBe(result2.biasScore);
      expect(result1.biasAnalysis).toEqual(result2.biasAnalysis);
    });

    it('should get cache statistics with provider breakdown', async () => {
      const stats = await BiasAnalysisService.getCacheStats();
      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('providerBreakdown');
      expect(typeof stats.providerBreakdown).toBe('object');
    });

    it('should test individual providers', async () => {
      const providers = await BiasAnalysisService.getAvailableProviders();
      
      if (providers.length > 0) {
        const testResult = await BiasAnalysisService.testProvider(providers[0]);
        expect(testResult).toHaveProperty('success');
        expect(testResult).toHaveProperty('responseTime');
        
        if (testResult.success) {
          expect(testResult).toHaveProperty('result');
          expect(testResult.result).toHaveProperty('biasScore');
          expect(testResult.result).toHaveProperty('biasAnalysis');
        } else {
          expect(testResult).toHaveProperty('error');
        }
      }
    });

    it('should clear provider-specific cache', async () => {
      const providers = await BiasAnalysisService.getAvailableProviders();
      
      if (providers.length > 0) {
        // This should not throw an error
        await expect(BiasAnalysisService.clearProviderCache(providers[0])).resolves.not.toThrow();
      }
    });
  });

  describe('Fallback behavior', () => {
    it('should handle provider failures gracefully', async () => {
      const request: BiasAnalysisRequest = {
        title: 'Fallback Test Article',
        content: 'This article tests the fallback behavior when providers fail.',
        summary: 'Fallback test',
        source: 'Test Source'
      };

      // Even if providers fail, should return a result (neutral fallback)
      const result = await BiasAnalysisService.analyzeArticle(request);
      expect(result).toHaveProperty('biasScore');
      expect(result).toHaveProperty('biasAnalysis');
      expect(result).toHaveProperty('provider');
    });
  });
});