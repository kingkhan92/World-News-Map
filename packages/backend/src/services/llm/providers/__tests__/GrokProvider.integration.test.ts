import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProviderFactory } from '../../ProviderFactory.js';
import { ProviderConfigManager } from '../../ProviderConfigManager.js';
import { GrokProvider } from '../GrokProvider.js';

// Mock axios to prevent real API calls
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}));

// Mock logger
vi.mock('../../../../utils/logger.js');

describe('GrokProvider Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let factory: ProviderFactory;

  const mockEnv = {
    BIAS_ANALYSIS_PROVIDER: 'grok',
    BIAS_ANALYSIS_FALLBACK_PROVIDERS: 'openai,ollama',
    GROK_API_KEY: 'grok-test-key-123456789',
    GROK_MODEL: 'grok-beta',
    GROK_BASE_URL: 'https://api.x.ai/v1',
    GROK_TIMEOUT: '30000',
    GROK_MAX_RETRIES: '3',
    GROK_RATE_LIMIT: '60',
    LLM_HEALTH_CHECK_INTERVAL: '300000',
    LLM_ENABLE_FAILOVER: 'true'
  };

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Set mock environment
    Object.assign(process.env, mockEnv);
    
    // Reset singleton instances
    (ProviderFactory as any).instance = null;
    (ProviderConfigManager as any).instance = null;
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Cleanup factory if it exists
    if (factory) {
      await factory.cleanup();
    }
  });

  describe('Factory Integration', () => {
    it('should create GrokProvider through factory', async () => {
      const configManager = ProviderConfigManager.getInstance();
      const config = configManager.getFactoryConfig();
      
      factory = ProviderFactory.getInstance(config);
      
      // The factory should be able to create a Grok provider
      expect(config.primaryProvider).toBe('grok');
      expect(config.providerConfigs.grok).toBeDefined();
      expect(config.providerConfigs.grok.apiKey).toBe('grok-test-key-123456789');
      expect(config.providerConfigs.grok.model).toBe('grok-beta');
    });

    it('should load Grok configuration correctly', () => {
      const configManager = ProviderConfigManager.getInstance();
      const grokConfig = configManager.getProviderConfig('grok');
      
      expect(grokConfig.apiKey).toBe('grok-test-key-123456789');
      expect(grokConfig.model).toBe('grok-beta');
      expect(grokConfig.baseUrl).toBe('https://api.x.ai/v1');
      expect(grokConfig.timeout).toBe(30000);
      expect(grokConfig.maxRetries).toBe(3);
      expect(grokConfig.rateLimit).toBe(60);
    });

    it('should identify Grok as configured provider', () => {
      const configManager = ProviderConfigManager.getInstance();
      
      expect(configManager.isProviderConfigured('grok')).toBe(true);
      expect(configManager.getPrimaryProvider()).toBe('grok');
    });

    it('should include Grok in configuration summary', () => {
      const configManager = ProviderConfigManager.getInstance();
      const summary = configManager.getConfigSummary();
      
      expect(summary.primaryProvider).toBe('grok');
      expect(summary.configuredProviders).toContain('grok');
    });
  });

  describe('Provider Creation', () => {
    it('should create GrokProvider instance with correct properties', () => {
      const config = {
        apiKey: 'grok-test-key-123456789',
        baseUrl: 'https://api.x.ai/v1',
        model: 'grok-beta',
        timeout: 30000,
        maxRetries: 3,
        rateLimit: 60
      };

      const provider = new GrokProvider(config);
      
      expect(provider).toBeInstanceOf(GrokProvider);
      expect(provider.name).toBe('Grok');
      expect(provider.type).toBe('grok');
      expect(provider.config).toEqual(config);
      expect(provider.isInitialized()).toBe(false);
    });

    it('should validate configuration on creation', () => {
      const invalidConfigs = [
        { ...mockEnv, apiKey: '' }, // Missing API key
        { ...mockEnv, apiKey: 'short' }, // Invalid API key format
        { ...mockEnv, model: '' }, // Missing model
        { ...mockEnv, timeout: 0 }, // Invalid timeout
        { ...mockEnv, maxRetries: -1 } // Invalid max retries
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => {
          new GrokProvider(invalidConfig as any);
        }).toThrow();
      }
    });
  });

  describe('Default Configuration', () => {
    it('should use default values when environment variables are missing', () => {
      // Set minimal required config
      process.env.GROK_API_KEY = 'grok-test-key-123456789';
      
      // Clear other optional variables
      delete process.env.GROK_BASE_URL;
      delete process.env.GROK_MODEL;
      delete process.env.GROK_TIMEOUT;
      delete process.env.GROK_MAX_RETRIES;
      delete process.env.GROK_RATE_LIMIT;
      
      // Reset singleton to pick up new environment
      (ProviderConfigManager as any).instance = null;
      
      const configManager = ProviderConfigManager.getInstance();
      const config = configManager.getProviderConfig('grok');
      
      expect(config.apiKey).toBe('grok-test-key-123456789');
      expect(config.baseUrl).toBe('https://api.x.ai/v1'); // default
      expect(config.model).toBe('grok-beta'); // default
      expect(config.timeout).toBe(30000); // default
      expect(config.maxRetries).toBe(3); // default
      expect(config.rateLimit).toBe(60); // default
    });
  });
});