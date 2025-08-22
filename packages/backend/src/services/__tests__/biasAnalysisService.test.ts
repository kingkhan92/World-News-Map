import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { BiasAnalysisService } from '../biasAnalysisService.js';
import { ArticleModel } from '../../models/Article.js';
import { redisClient } from '../../utils/redis.js';
import { logger } from '../../utils/logger.js';

// Mock dependencies
vi.mock('axios');
vi.mock('../../models/Article.js');
vi.mock('../../utils/redis.js');
vi.mock('../../utils/logger.js');

const mockedAxios = vi.mocked(axios);
const mockedArticleModel = vi.mocked(ArticleModel);
const mockedRedisClient = vi.mocked(redisClient);
const mockedLogger = vi.mocked(logger);

describe('BiasAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    process.env.BIAS_ANALYSIS_API_URL = 'https://api.test.com/bias-analysis';
    process.env.BIAS_ANALYSIS_API_KEY = 'test-api-key';
    
    // Mock Redis connection
    mockedRedisClient.get = vi.fn();
    mockedRedisClient.setEx = vi.fn();
    mockedRedisClient.del = vi.fn();
    mockedRedisClient.keys = vi.fn();
    mockedRedisClient.info = vi.fn();
  });

  afterEach(() => {
    delete process.env.BIAS_ANALYSIS_API_URL;
    delete process.env.BIAS_ANALYSIS_API_KEY;
  });

  describe('analyzeArticle', () => {
    const mockRequest = {
      title: 'Test Article Title',
      content: 'Test article content with political implications',
      summary: 'Test summary',
      source: 'Test Source',
    };

    const mockAnalysisResult = {
      biasScore: 45,
      biasAnalysis: {
        political_lean: 'center' as const,
        factual_accuracy: 85,
        emotional_tone: 60,
        confidence: 90,
        bias_score: 45,
      },
    };

    const expectedResult = {
      biasScore: 45,
      biasAnalysis: {
        politicalLean: 'center' as const,
        factualAccuracy: 85,
        emotionalTone: 60,
        confidence: 90,
      },
    };

    it('should return cached result if available', async () => {
      // Mock cached result
      mockedRedisClient.get.mockResolvedValue(JSON.stringify(expectedResult));

      const result = await BiasAnalysisService.analyzeArticle(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(mockedRedisClient.get).toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Returning cached bias analysis',
        expect.any(Object)
      );
    });

    it('should call AI API and cache result when not cached', async () => {
      // Mock no cached result
      mockedRedisClient.get.mockResolvedValue(null);
      
      // Mock successful AI API response
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: mockAIResponse,
      });

      const result = await BiasAnalysisService.analyzeArticle(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.test.com/bias-analysis',
        {
          title: mockRequest.title,
          content: mockRequest.content,
          summary: mockRequest.summary,
          source: mockRequest.source,
        },
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      expect(mockedRedisClient.setEx).toHaveBeenCalled();
    });

    it('should return fallback analysis when AI API fails', async () => {
      // Mock no cached result
      mockedRedisClient.get.mockResolvedValue(null);
      
      // Mock AI API failure
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await BiasAnalysisService.analyzeArticle(mockRequest);

      expect(result).toEqual({
        biasScore: 50,
        biasAnalysis: {
          politicalLean: 'center',
          factualAccuracy: 50,
          emotionalTone: 50,
          confidence: 0,
        },
      });
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Bias analysis failed',
        { error: 'API Error' }
      );
    });

    it('should handle missing API key', async () => {
      delete process.env.BIAS_ANALYSIS_API_KEY;
      
      // Mock no cached result
      mockedRedisClient.get.mockResolvedValue(null);

      const result = await BiasAnalysisService.analyzeArticle(mockRequest);

      expect(result).toEqual({
        biasScore: 50,
        biasAnalysis: {
          politicalLean: 'center',
          factualAccuracy: 50,
          emotionalTone: 50,
          confidence: 0,
        },
      });
    });
  });

  describe('analyzeAndStoreArticle', () => {
    const mockArticle = {
      id: 1,
      title: 'Test Article',
      content: 'Test content',
      summary: 'Test summary',
      source: 'Test Source',
      bias_score: null,
      bias_analysis: null,
      url: 'https://test.com/article',
      published_at: new Date(),
      latitude: null,
      longitude: null,
      location_name: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should analyze and store bias for article without existing analysis', async () => {
      mockedArticleModel.findById.mockResolvedValue(mockArticle);
      mockedRedisClient.get.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          political_lean: 'left',
          factual_accuracy: 80,
          emotional_tone: 70,
          confidence: 85,
          bias_score: 35,
        },
      });
      mockedArticleModel.updateBiasAnalysis.mockResolvedValue({
        ...mockArticle,
        bias_score: 35,
        bias_analysis: {
          politicalLean: 'left',
          factualAccuracy: 80,
          emotionalTone: 70,
          confidence: 85,
        },
      });

      const result = await BiasAnalysisService.analyzeAndStoreArticle(1);

      expect(result).toEqual({
        biasScore: 35,
        biasAnalysis: {
          politicalLean: 'left',
          factualAccuracy: 80,
          emotionalTone: 70,
          confidence: 85,
        },
      });
      expect(mockedArticleModel.updateBiasAnalysis).toHaveBeenCalledWith(
        1,
        35,
        {
          politicalLean: 'left',
          factualAccuracy: 80,
          emotionalTone: 70,
          confidence: 85,
        }
      );
    });

    it('should return existing analysis if already analyzed', async () => {
      const analyzedArticle = {
        ...mockArticle,
        bias_score: 60,
        bias_analysis: {
          politicalLean: 'right' as const,
          factualAccuracy: 75,
          emotionalTone: 65,
          confidence: 80,
        },
      };
      
      mockedArticleModel.findById.mockResolvedValue(analyzedArticle);

      const result = await BiasAnalysisService.analyzeAndStoreArticle(1);

      expect(result).toEqual({
        biasScore: 60,
        biasAnalysis: {
          politicalLean: 'right',
          factualAccuracy: 75,
          emotionalTone: 65,
          confidence: 80,
        },
      });
      expect(mockedArticleModel.updateBiasAnalysis).not.toHaveBeenCalled();
    });

    it('should return null if article not found', async () => {
      mockedArticleModel.findById.mockResolvedValue(null);

      const result = await BiasAnalysisService.analyzeAndStoreArticle(999);

      expect(result).toBeNull();
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Article not found for bias analysis',
        { articleId: 999 }
      );
    });
  });

  describe('batchAnalyzeArticles', () => {
    it('should process articles in batches', async () => {
      const articleIds = [1, 2, 3, 4, 5, 6];
      
      // Mock successful analysis for each article
      mockedArticleModel.findById.mockImplementation(async (id) => ({
        id,
        title: `Article ${id}`,
        content: `Content ${id}`,
        summary: `Summary ${id}`,
        source: 'Test Source',
        bias_score: null,
        bias_analysis: null,
        url: `https://test.com/article-${id}`,
        published_at: new Date(),
        latitude: null,
        longitude: null,
        location_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      mockedRedisClient.get.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          political_lean: 'center',
          factual_accuracy: 80,
          emotional_tone: 60,
          confidence: 85,
          bias_score: 50,
        },
      });

      const results = await BiasAnalysisService.batchAnalyzeArticles(articleIds);

      expect(results.size).toBe(6);
      expect(mockedArticleModel.findById).toHaveBeenCalledTimes(6);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Batch bias analysis completed',
        { processed: 6, total: 6 }
      );
    });

    it('should handle errors in batch processing', async () => {
      const articleIds = [1, 2];
      
      // Mock first article success, second article failure
      mockedArticleModel.findById
        .mockResolvedValueOnce({
          id: 1,
          title: 'Article 1',
          content: 'Content 1',
          summary: 'Summary 1',
          source: 'Test Source',
          bias_score: null,
          bias_analysis: null,
          url: 'https://test.com/article-1',
          published_at: new Date(),
          latitude: null,
          longitude: null,
          location_name: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .mockRejectedValueOnce(new Error('Database error'));

      mockedRedisClient.get.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {
          political_lean: 'center',
          factual_accuracy: 80,
          emotional_tone: 60,
          confidence: 85,
          bias_score: 50,
        },
      });

      const results = await BiasAnalysisService.batchAnalyzeArticles(articleIds);

      expect(results.size).toBe(1);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to analyze article in batch',
        { articleId: 2, error: 'Database error' }
      );
    });
  });

  describe('getArticlesNeedingAnalysis', () => {
    it('should return article IDs that need bias analysis', async () => {
      const mockArticles = [
        { id: 1, bias_score: null },
        { id: 2, bias_score: 50 },
        { id: 3, bias_score: null },
      ];

      mockedArticleModel.findWithFilters.mockResolvedValue(mockArticles as any);

      const result = await BiasAnalysisService.getArticlesNeedingAnalysis(50);

      expect(result).toEqual([1, 3]);
      expect(mockedArticleModel.findWithFilters).toHaveBeenCalledWith(
        { biasScoreMin: undefined, biasScoreMax: undefined },
        50
      );
    });
  });

  describe('analyzeRecentArticles', () => {
    it('should analyze recent articles automatically', async () => {
      const mockArticleIds = [1, 2, 3];
      
      // Mock getArticlesNeedingAnalysis
      vi.spyOn(BiasAnalysisService, 'getArticlesNeedingAnalysis')
        .mockResolvedValue(mockArticleIds);
      
      // Mock batchAnalyzeArticles
      vi.spyOn(BiasAnalysisService, 'batchAnalyzeArticles')
        .mockResolvedValue(new Map());

      await BiasAnalysisService.analyzeRecentArticles();

      expect(BiasAnalysisService.getArticlesNeedingAnalysis).toHaveBeenCalledWith(20);
      expect(BiasAnalysisService.batchAnalyzeArticles).toHaveBeenCalledWith(mockArticleIds);
    });

    it('should handle no articles needing analysis', async () => {
      vi.spyOn(BiasAnalysisService, 'getArticlesNeedingAnalysis')
        .mockResolvedValue([]);
      
      const batchSpy = vi.spyOn(BiasAnalysisService, 'batchAnalyzeArticles');

      await BiasAnalysisService.analyzeRecentArticles();

      expect(batchSpy).not.toHaveBeenCalled();
      expect(mockedLogger.info).toHaveBeenCalledWith('No articles need bias analysis');
    });
  });

  describe('clearCache', () => {
    it('should clear bias analysis cache', async () => {
      const mockKeys = ['bias_analysis:key1', 'bias_analysis:key2'];
      mockedRedisClient.keys.mockResolvedValue(mockKeys);
      mockedRedisClient.del.mockResolvedValue(2);

      await BiasAnalysisService.clearCache();

      expect(mockedRedisClient.keys).toHaveBeenCalledWith('bias_analysis:*');
      expect(mockedRedisClient.del).toHaveBeenCalledWith(mockKeys);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Bias analysis cache cleared',
        { keysDeleted: 2 }
      );
    });

    it('should handle empty cache', async () => {
      mockedRedisClient.keys.mockResolvedValue([]);

      await BiasAnalysisService.clearCache();

      expect(mockedRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockKeys = ['bias_analysis:key1', 'bias_analysis:key2'];
      const mockMemoryInfo = 'used_memory:1024\nused_memory_human:1K';
      
      mockedRedisClient.keys.mockResolvedValue(mockKeys);
      mockedRedisClient.info.mockResolvedValue(mockMemoryInfo);

      const stats = await BiasAnalysisService.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 2,
        memoryUsage: mockMemoryInfo,
      });
    });

    it('should handle Redis errors gracefully', async () => {
      mockedRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await BiasAnalysisService.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        memoryUsage: 'unavailable',
      });
    });
  });
});