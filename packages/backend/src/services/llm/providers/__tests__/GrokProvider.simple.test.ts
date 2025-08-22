import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrokProvider } from '../GrokProvider.js';
import { BiasAnalysisRequest } from '../../../../types/llmProvider.js';

// Mock axios to avoid real API calls
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

// Mock logger to avoid console output during tests
vi.mock('../../../../utils/logger.js');

describe('GrokProvider - Simple Tests', () => {
  let provider: GrokProvider;

  const validConfig = {
    apiKey: 'grok-test-key-123456789',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-beta',
    timeout: 30000,
    maxRetries: 3,
    rateLimit: 60
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GrokProvider(validConfig);
  });

  it('should create provider with correct properties', () => {
    expect(provider.name).toBe('Grok');
    expect(provider.type).toBe('grok');
    expect(provider.config).toEqual(validConfig);
  });

  it('should not be initialized by default', () => {
    expect(provider.isInitialized()).toBe(false);
  });

  it('should validate request parameters', async () => {
    await provider.initialize();

    const invalidRequest: BiasAnalysisRequest = {
      title: '',
      content: 'Some content'
    };

    await expect(provider.analyzeArticle(invalidRequest)).rejects.toThrow('Article title is required');
  });

  it('should validate content parameter', async () => {
    await provider.initialize();

    const invalidRequest: BiasAnalysisRequest = {
      title: 'Valid title',
      content: ''
    };

    await expect(provider.analyzeArticle(invalidRequest)).rejects.toThrow('Article content is required');
  });

  it('should have correct provider type for factory registration', () => {
    expect(provider.type).toBe('grok');
  });
});