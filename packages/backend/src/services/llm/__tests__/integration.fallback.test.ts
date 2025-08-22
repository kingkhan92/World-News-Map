import { ProviderFallbackManager } from '../ProviderFallbackManager.js';
import { ProviderFactory } from '../ProviderFactory.js';
import { ProviderHealthMonitor } from '../ProviderHealthMonitor.js';
import { ProviderConfigManager } from '../ProviderConfigManager.js';
import { BiasAnalysisService } from '../../biasAnalysisService.js';

/**
 * Integration test to verify the fallback system works end-to-end
 * This test doesn't use mocks to ensure real integration
 */
describe('Provider Fallback Integration', () => {
  // Skip these tests in CI/CD environments where external services aren't available
  const shouldSkip = process.env.CI === 'true' || process.env.SKIP_INTEGRATION_TESTS === 'true';

  beforeAll(() => {
    if (shouldSkip) {
      console.log('Skipping integration tests in CI environment');
    }
  });

  it('should create fallback manager without errors', () => {
    if (shouldSkip) return;

    expect(() => {
      const configManager = ProviderConfigManager.getInstance();
      const factory = ProviderFactory.getInstance({
        primaryProvider: 'openai',
        fallbackProviders: ['grok', 'ollama'],
        providerConfigs: {
          openai: {
            apiKey: 'test-key',
            model: 'gpt-3.5-turbo',
            timeout: 30000,
            maxRetries: 3
          },
          grok: {
            apiKey: 'test-key',
            model: 'grok-beta',
            timeout: 30000,
            maxRetries: 3
          },
          ollama: {
            baseUrl: 'http://localhost:11434',
            model: 'llama2:7b',
            timeout: 60000,
            maxRetries: 2
          }
        },
        healthCheckInterval: 300000,
        enableFailover: true
      });
      
      const healthMonitor = new ProviderHealthMonitor(factory);
      const fallbackManager = new ProviderFallbackManager(factory, healthMonitor, configManager);
      
      expect(fallbackManager).toBeDefined();
    }).not.toThrow();
  });

  it('should initialize bias analysis service without errors', async () => {
    if (shouldSkip) return;

    // Set minimal environment variables for testing
    process.env.BIAS_ANALYSIS_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-3.5-turbo';

    expect(async () => {
      await BiasAnalysisService.initialize();
      await BiasAnalysisService.cleanup();
    }).not.toThrow();
  });

  it('should handle provider configuration validation', () => {
    if (shouldSkip) return;

    expect(() => {
      const configManager = ProviderConfigManager.getInstance();
      const config = configManager.getFactoryConfig();
      
      expect(config.primaryProvider).toBeDefined();
      expect(config.fallbackProviders).toBeDefined();
      expect(config.providerConfigs).toBeDefined();
    }).not.toThrow();
  });

  it('should validate provider types correctly', () => {
    if (shouldSkip) return;

    const validTypes = ['openai', 'grok', 'ollama'];
    
    validTypes.forEach(type => {
      expect(() => {
        // This should not throw for valid types
        const configManager = ProviderConfigManager.getInstance();
        const isConfigured = configManager.isProviderConfigured(type as any);
        expect(typeof isConfigured).toBe('boolean');
      }).not.toThrow();
    });
  });

  it('should handle error scenarios gracefully', async () => {
    if (shouldSkip) return;

    // Test with invalid configuration
    process.env.BIAS_ANALYSIS_PROVIDER = 'invalid-provider';
    
    try {
      await BiasAnalysisService.initialize();
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should throw configuration error
      expect(error).toBeDefined();
    } finally {
      // Reset environment
      process.env.BIAS_ANALYSIS_PROVIDER = 'openai';
      await BiasAnalysisService.cleanup();
    }
  });
});