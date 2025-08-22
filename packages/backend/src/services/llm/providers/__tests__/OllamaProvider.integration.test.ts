import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { OllamaProvider } from '../OllamaProvider.js';
import { BiasAnalysisRequest, ProviderError } from '../../../../types/llmProvider.js';

/**
 * Integration tests for OllamaProvider
 * 
 * These tests require a running Ollama instance with a model available.
 * Set OLLAMA_INTEGRATION_TESTS=true to run these tests.
 * 
 * Prerequisites:
 * 1. Ollama server running on localhost:11434 (or set OLLAMA_BASE_URL)
 * 2. A model available (default: llama2:7b, or set OLLAMA_MODEL)
 * 
 * To run:
 * OLLAMA_INTEGRATION_TESTS=true npm test -- OllamaProvider.integration.test.ts
 */

const shouldRunIntegrationTests = process.env.OLLAMA_INTEGRATION_TESTS === 'true';
const testCondition = shouldRunIntegrationTests ? describe : describe.skip;

testCondition('OllamaProvider Integration Tests', () => {
  let provider: OllamaProvider;
  
  const config = {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama2:7b',
    timeout: 60000, // Longer timeout for integration tests
    maxRetries: 1,
    temperature: 0.3
  };

  const mockBiasRequest: BiasAnalysisRequest = {
    title: 'Local Government Announces New Environmental Policy',
    content: `The city council voted unanimously yesterday to implement a comprehensive environmental policy that includes mandatory recycling programs, carbon emission reduction targets, and incentives for renewable energy adoption. Mayor Johnson stated that this initiative will position the city as a leader in environmental sustainability while creating new jobs in the green energy sector. Critics argue that the policy may increase costs for local businesses and residents.`,
    summary: 'City council approves new environmental policy with recycling programs and emission targets.',
    source: 'Local News Network'
  };

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      return;
    }

    console.log('Setting up Ollama integration tests...');
    console.log(`Using Ollama at: ${config.baseUrl}`);
    console.log(`Using model: ${config.model}`);
    
    provider = new OllamaProvider(config);
    
    try {
      await provider.initialize();
      console.log('Ollama provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Ollama provider:', error.message);
      console.log('Make sure Ollama is running and the model is available');
      throw error;
    }
  }, 120000); // 2 minute timeout for initialization

  afterAll(async () => {
    if (provider && provider.isInitialized()) {
      await provider.cleanup();
    }
  });

  beforeEach(() => {
    if (!shouldRunIntegrationTests) {
      return;
    }
    
    if (!provider || !provider.isInitialized()) {
      throw new Error('Provider not initialized. Check Ollama setup.');
    }
  });

  describe('Health Checks', () => {
    it('should pass health check with running Ollama instance', async () => {
      const health = await provider.checkHealth();
      
      expect(health.available).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
      
      console.log(`Health check passed in ${health.responseTime}ms`);
    });

    it('should report available models', () => {
      const models = provider.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain(config.model);
      
      console.log('Available models:', models);
    });

    it('should report model capabilities', () => {
      const capabilities = provider.getModelCapabilities();
      
      expect(capabilities).toBeDefined();
      expect(typeof capabilities.supportsJson).toBe('boolean');
      expect(typeof capabilities.contextLength).toBe('number');
      expect(capabilities.contextLength).toBeGreaterThan(0);
      
      console.log('Model capabilities:', capabilities);
    });
  });

  describe('Bias Analysis', () => {
    it('should analyze article bias successfully', async () => {
      console.log('Starting bias analysis...');
      const startTime = Date.now();
      
      const result = await provider.analyzeArticle(mockBiasRequest);
      
      const duration = Date.now() - startTime;
      console.log(`Analysis completed in ${duration}ms`);
      
      // Validate result structure
      expect(result).toBeDefined();
      expect(result.provider).toBe('Ollama');
      expect(typeof result.biasScore).toBe('number');
      expect(result.biasScore).toBeGreaterThanOrEqual(0);
      expect(result.biasScore).toBeLessThanOrEqual(100);
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(typeof result.processingTime).toBe('number');
      expect(result.processingTime).toBeGreaterThan(0);
      
      // Validate bias analysis structure
      expect(result.biasAnalysis).toBeDefined();
      expect(['left', 'center', 'right']).toContain(result.biasAnalysis.politicalLean);
      expect(typeof result.biasAnalysis.factualAccuracy).toBe('number');
      expect(result.biasAnalysis.factualAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.biasAnalysis.factualAccuracy).toBeLessThanOrEqual(100);
      expect(typeof result.biasAnalysis.emotionalTone).toBe('number');
      expect(result.biasAnalysis.emotionalTone).toBeGreaterThanOrEqual(0);
      expect(result.biasAnalysis.emotionalTone).toBeLessThanOrEqual(100);
      expect(typeof result.biasAnalysis.confidence).toBe('number');
      expect(result.biasAnalysis.confidence).toBeGreaterThanOrEqual(0);
      expect(result.biasAnalysis.confidence).toBeLessThanOrEqual(100);
      
      console.log('Analysis result:', {
        biasScore: result.biasScore,
        politicalLean: result.biasAnalysis.politicalLean,
        factualAccuracy: result.biasAnalysis.factualAccuracy,
        emotionalTone: result.biasAnalysis.emotionalTone,
        confidence: result.confidence,
        processingTime: result.processingTime
      });
    }, 120000); // 2 minute timeout for analysis

    it('should handle different article types', async () => {
      const politicalArticle: BiasAnalysisRequest = {
        title: 'Government Announces Tax Reform Package',
        content: `The administration unveiled a comprehensive tax reform package today, promising significant cuts for middle-class families while closing loopholes used by wealthy individuals and corporations. The proposal includes reducing the standard tax rate from 22% to 18% and increasing the child tax credit. Opposition leaders criticized the plan as fiscally irresponsible and warned it could lead to increased national debt.`,
        source: 'Political News Wire'
      };

      console.log('Analyzing political article...');
      const result = await provider.analyzeArticle(politicalArticle);
      
      expect(result.biasScore).toBeGreaterThanOrEqual(0);
      expect(result.biasScore).toBeLessThanOrEqual(100);
      expect(['left', 'center', 'right']).toContain(result.biasAnalysis.politicalLean);
      
      console.log('Political article analysis:', {
        biasScore: result.biasScore,
        politicalLean: result.biasAnalysis.politicalLean,
        confidence: result.confidence
      });
    }, 120000);

    it('should handle articles with minimal content', async () => {
      const shortArticle: BiasAnalysisRequest = {
        title: 'Weather Update',
        content: 'Sunny skies expected tomorrow with temperatures reaching 75°F.',
        source: 'Weather Service'
      };

      console.log('Analyzing short article...');
      const result = await provider.analyzeArticle(shortArticle);
      
      expect(result.biasScore).toBeGreaterThanOrEqual(0);
      expect(result.biasScore).toBeLessThanOrEqual(100);
      
      // Weather articles should typically be neutral
      expect(result.biasAnalysis.politicalLean).toBe('center');
      
      console.log('Short article analysis:', {
        biasScore: result.biasScore,
        politicalLean: result.biasAnalysis.politicalLean,
        confidence: result.confidence
      });
    }, 120000);

    it('should maintain consistency across multiple analyses', async () => {
      console.log('Testing analysis consistency...');
      
      const results = [];
      const numTests = 3;
      
      for (let i = 0; i < numTests; i++) {
        console.log(`Running analysis ${i + 1}/${numTests}...`);
        const result = await provider.analyzeArticle(mockBiasRequest);
        results.push(result);
      }
      
      // Check that results are reasonably consistent
      const biasScores = results.map(r => r.biasScore);
      const politicalLeans = results.map(r => r.biasAnalysis.politicalLean);
      
      console.log('Bias scores:', biasScores);
      console.log('Political leans:', politicalLeans);
      
      // Bias scores should be within a reasonable range of each other
      const maxScore = Math.max(...biasScores);
      const minScore = Math.min(...biasScores);
      const scoreRange = maxScore - minScore;
      
      // Allow for some variation but not too much (within 30 points)
      expect(scoreRange).toBeLessThanOrEqual(30);
      
      // Political lean should be consistent or at least reasonable
      const uniqueLeans = [...new Set(politicalLeans)];
      expect(uniqueLeans.length).toBeLessThanOrEqual(2); // Allow for some variation
      
      console.log(`Consistency test passed. Score range: ${scoreRange}, Unique leans: ${uniqueLeans.length}`);
    }, 300000); // 5 minute timeout for multiple analyses
  });

  describe('Error Handling', () => {
    it('should handle invalid requests gracefully', async () => {
      const invalidRequest: BiasAnalysisRequest = {
        title: '',
        content: '',
        source: 'Test'
      };

      await expect(provider.analyzeArticle(invalidRequest)).rejects.toThrow(ProviderError);
    });

    it('should handle very long content', async () => {
      const longContent = 'This is a test article. '.repeat(1000); // ~24,000 characters
      
      const longArticle: BiasAnalysisRequest = {
        title: 'Very Long Article',
        content: longContent,
        source: 'Test Source'
      };

      console.log('Testing with very long content...');
      
      // Should either succeed or fail gracefully
      try {
        const result = await provider.analyzeArticle(longArticle);
        expect(result.biasScore).toBeGreaterThanOrEqual(0);
        expect(result.biasScore).toBeLessThanOrEqual(100);
        console.log('Long content analysis succeeded');
      } catch (error) {
        // If it fails, it should be a proper ProviderError
        expect(error).toBeInstanceOf(ProviderError);
        console.log('Long content analysis failed gracefully:', error.message);
      }
    }, 180000); // 3 minute timeout for long content
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      await provider.analyzeArticle(mockBiasRequest);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 2 minutes for most models
      expect(duration).toBeLessThan(120000);
      
      console.log(`Performance test passed. Analysis took ${duration}ms`);
    }, 150000);

    it('should handle concurrent requests', async () => {
      console.log('Testing concurrent requests...');
      
      const requests = Array(3).fill(null).map((_, i) => ({
        ...mockBiasRequest,
        title: `${mockBiasRequest.title} - Request ${i + 1}`
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        requests.map(request => provider.analyzeArticle(request))
      );
      
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.biasScore).toBeGreaterThanOrEqual(0);
        expect(result.biasScore).toBeLessThanOrEqual(100);
      });
      
      console.log(`Concurrent requests completed in ${duration}ms`);
      console.log('Results:', results.map(r => ({
        biasScore: r.biasScore,
        politicalLean: r.biasAnalysis.politicalLean
      })));
    }, 300000); // 5 minute timeout for concurrent requests
  });
});

// Helper to check if Ollama is available
export async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

// Export for use in other tests
export { shouldRunIntegrationTests };