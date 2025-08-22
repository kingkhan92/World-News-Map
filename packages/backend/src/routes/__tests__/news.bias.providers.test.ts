import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import newsRouter from '../news.js';
import { BiasAnalysisService } from '../../services/biasAnalysisService.js';

// Mock the BiasAnalysisService
vi.mock('../../services/biasAnalysisService.js');
vi.mock('../../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

const mockedBiasAnalysisService = vi.mocked(BiasAnalysisService);

const app = express();
app.use(express.json());
app.use('/api/news', newsRouter);

describe('News API - Bias Provider Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/news/bias/providers', () => {
    it('should return available providers and configurations', async () => {
      const mockProviders = ['openai', 'grok', 'ollama'];
      const mockConfigurations = {
        openai: { model: 'gpt-3.5-turbo', timeout: 30000 },
        grok: { model: 'grok-beta', timeout: 30000 },
        ollama: { model: 'llama2:7b', timeout: 30000 }
      };

      mockedBiasAnalysisService.getAvailableProviders.mockResolvedValue(mockProviders);
      mockedBiasAnalysisService.getProviderConfigurations.mockResolvedValue(mockConfigurations);

      const response = await request(app)
        .get('/api/news/bias/providers')
        .expect(200);

      expect(response.body).toHaveProperty('providers', mockProviders);
      expect(response.body).toHaveProperty('configurations', mockConfigurations);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle errors when getting providers', async () => {
      mockedBiasAnalysisService.getAvailableProviders.mockRejectedValue(new Error('Provider error'));

      const response = await request(app)
        .get('/api/news/bias/providers')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ProvidersListFailed');
    });
  });

  describe('POST /api/news/bias/providers/:provider/test', () => {
    it('should test a specific provider successfully', async () => {
      const mockTestResult = {
        success: true,
        result: {
          biasScore: 45,
          biasAnalysis: {
            politicalLean: 'center',
            factualAccuracy: 85,
            emotionalTone: 60,
            confidence: 90
          },
          provider: 'openai',
          confidence: 90,
          processingTime: 1500
        },
        responseTime: 1500
      };

      mockedBiasAnalysisService.testProvider.mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/news/bias/providers/openai/test')
        .send({
          sampleRequest: {
            title: 'Test Article',
            content: 'Test content',
            source: 'Test Source'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('provider', 'openai');
      expect(response.body).toHaveProperty('testResult', mockTestResult);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle provider test failures', async () => {
      mockedBiasAnalysisService.testProvider.mockRejectedValue(new Error('Test failed'));

      const response = await request(app)
        .post('/api/news/bias/providers/invalid/test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ProviderTestFailed');
    });
  });

  describe('POST /api/news/bias/analyze-content', () => {
    it('should analyze arbitrary content successfully', async () => {
      const mockResult = {
        biasScore: 55,
        biasAnalysis: {
          politicalLean: 'center',
          factualAccuracy: 80,
          emotionalTone: 65,
          confidence: 85
        },
        provider: 'openai',
        confidence: 85,
        processingTime: 2000
      };

      mockedBiasAnalysisService.analyzeArticle.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/news/bias/analyze-content')
        .send({
          title: 'Test Article Title',
          content: 'This is test content for bias analysis.',
          summary: 'Test summary',
          source: 'Test Source',
          provider: 'openai'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('biasScore', 55);
      expect(response.body.result).toHaveProperty('provider', 'openai');
      
      expect(mockedBiasAnalysisService.analyzeArticle).toHaveBeenCalledWith(
        {
          title: 'Test Article Title',
          content: 'This is test content for bias analysis.',
          summary: 'Test summary',
          source: 'Test Source'
        },
        'openai'
      );
    });

    it('should require title and content', async () => {
      const response = await request(app)
        .post('/api/news/bias/analyze-content')
        .send({
          summary: 'Test summary'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('InvalidInput');
    });
  });

  describe('DELETE /api/news/bias/cache/:provider', () => {
    it('should clear provider-specific cache', async () => {
      mockedBiasAnalysisService.clearProviderCache.mockResolvedValue();

      const response = await request(app)
        .delete('/api/news/bias/cache/openai')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('provider', 'openai');
      expect(mockedBiasAnalysisService.clearProviderCache).toHaveBeenCalledWith('openai');
    });

    it('should handle cache clear errors', async () => {
      mockedBiasAnalysisService.clearProviderCache.mockRejectedValue(new Error('Cache error'));

      const response = await request(app)
        .delete('/api/news/bias/cache/openai')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('CacheClearFailed');
    });
  });

  describe('POST /api/news/bias/analyze/:id with provider selection', () => {
    it('should analyze article with preferred provider', async () => {
      const mockResult = {
        biasScore: 60,
        biasAnalysis: {
          politicalLean: 'center',
          factualAccuracy: 75,
          emotionalTone: 70,
          confidence: 80
        },
        provider: 'grok',
        confidence: 80,
        processingTime: 1800
      };

      mockedBiasAnalysisService.analyzeAndStoreArticle.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/news/bias/analyze/123')
        .send({
          provider: 'grok'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('provider', 'grok');
      
      expect(mockedBiasAnalysisService.analyzeAndStoreArticle).toHaveBeenCalledWith(123, 'grok');
    });
  });

  describe('POST /api/news/bias/analyze-batch with provider selection', () => {
    it('should analyze batch with preferred provider', async () => {
      const mockResults = new Map([
        [1, { biasScore: 45, biasAnalysis: {}, provider: 'openai', confidence: 85, processingTime: 1500 }],
        [2, { biasScore: 55, biasAnalysis: {}, provider: 'openai', confidence: 80, processingTime: 1600 }]
      ]);

      mockedBiasAnalysisService.batchAnalyzeArticles.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/news/bias/analyze-batch')
        .send({
          articleIds: [1, 2],
          provider: 'openai'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('processed', 2);
      expect(response.body).toHaveProperty('total', 2);
      
      expect(mockedBiasAnalysisService.batchAnalyzeArticles).toHaveBeenCalledWith([1, 2], 'openai');
    });
  });
});