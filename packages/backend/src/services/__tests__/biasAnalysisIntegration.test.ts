import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BiasAnalysisService } from '../biasAnalysisService.js';
import { NewsAggregationService } from '../newsAggregationService.js';
import { ArticleModel } from '../../models/Article.js';
import { CreateArticleData } from '../../types/models.js';

// Mock dependencies
vi.mock('../../models/Article.js');
vi.mock('../../utils/redis.js');
vi.mock('../../utils/logger.js');
vi.mock('axios');

const mockedArticleModel = vi.mocked(ArticleModel);

describe('Bias Analysis Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    process.env.BIAS_ANALYSIS_API_URL = 'https://api.test.com/bias-analysis';
    process.env.BIAS_ANALYSIS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.BIAS_ANALYSIS_API_URL;
    delete process.env.BIAS_ANALYSIS_API_KEY;
  });

  describe('News Aggregation Integration', () => {
    it('should trigger bias analysis for newly saved articles', async () => {
      // Mock news aggregation service
      const newsService = new NewsAggregationService();
      
      // Mock article creation
      const mockArticles: CreateArticleData[] = [
        {
          title: 'Test Article 1',
          content: 'Test content 1',
          summary: 'Test summary 1',
          url: 'https://test.com/article1',
          source: 'Test Source',
          published_at: new Date(),
        },
        {
          title: 'Test Article 2',
          content: 'Test content 2',
          summary: 'Test summary 2',
          url: 'https://test.com/article2',
          source: 'Test Source',
          published_at: new Date(),
        },
      ];

      // Mock saved articles with IDs
      const savedArticles = mockArticles.map((article, index) => ({
        ...article,
        id: index + 1,
        latitude: null,
        longitude: null,
        location_name: null,
        bias_score: null,
        bias_analysis: null,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Mock ArticleModel methods
      mockedArticleModel.findByUrl.mockResolvedValue(null); // No existing articles
      mockedArticleModel.createBatch.mockResolvedValue(savedArticles);
      mockedArticleModel.getStatistics.mockResolvedValue({
        totalArticles: 2,
        articlesWithLocation: 0,
        articlesWithBias: 0,
        uniqueSources: 1,
        dateRange: { earliest: new Date(), latest: new Date() },
      });

      // Mock bias analysis service methods
      const batchAnalyzeSpy = vi.spyOn(BiasAnalysisService, 'batchAnalyzeArticles')
        .mockResolvedValue(new Map([
          [1, {
            biasScore: 45,
            biasAnalysis: {
              politicalLean: 'center',
              factualAccuracy: 80,
              emotionalTone: 60,
              confidence: 85,
            },
          }],
          [2, {
            biasScore: 55,
            biasAnalysis: {
              politicalLean: 'right',
              factualAccuracy: 75,
              emotionalTone: 70,
              confidence: 80,
            },
          }],
        ]));

      // Mock news fetching
      vi.spyOn(newsService, 'fetchAllNews').mockResolvedValue(mockArticles);

      // Run the aggregation process
      const result = await newsService.aggregateAndSaveNews();

      // Verify the integration
      expect(result.total).toBe(2);
      expect(result.saved).toBe(2);
      expect(result.biasAnalyzed).toBe(2);
      expect(result.errors).toBe(0);

      // Verify bias analysis was called with correct article IDs
      expect(batchAnalyzeSpy).toHaveBeenCalledWith([1, 2]);
    });

    it('should handle bias analysis failures gracefully', async () => {
      const newsService = new NewsAggregationService();
      
      const mockArticles: CreateArticleData[] = [
        {
          title: 'Test Article',
          content: 'Test content',
          summary: 'Test summary',
          url: 'https://test.com/article',
          source: 'Test Source',
          published_at: new Date(),
        },
      ];

      const savedArticles = [{
        ...mockArticles[0],
        id: 1,
        latitude: null,
        longitude: null,
        location_name: null,
        bias_score: null,
        bias_analysis: null,
        created_at: new Date(),
        updated_at: new Date(),
      }];

      // Mock ArticleModel methods
      mockedArticleModel.findByUrl.mockResolvedValue(null);
      mockedArticleModel.createBatch.mockResolvedValue(savedArticles);
      mockedArticleModel.getStatistics.mockResolvedValue({
        totalArticles: 1,
        articlesWithLocation: 0,
        articlesWithBias: 0,
        uniqueSources: 1,
        dateRange: { earliest: new Date(), latest: new Date() },
      });

      // Mock bias analysis failure
      vi.spyOn(BiasAnalysisService, 'batchAnalyzeArticles')
        .mockRejectedValue(new Error('Bias analysis API error'));

      // Mock news fetching
      vi.spyOn(newsService, 'fetchAllNews').mockResolvedValue(mockArticles);

      // Run the aggregation process
      const result = await newsService.aggregateAndSaveNews();

      // Verify that news aggregation still succeeds even if bias analysis fails
      expect(result.total).toBe(1);
      expect(result.saved).toBe(1);
      expect(result.biasAnalyzed).toBe(0); // No articles analyzed due to error
      expect(result.errors).toBe(0); // Main process should not fail
    });
  });

  describe('Article Model Integration', () => {
    it('should update article with bias analysis results', async () => {
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        content: 'Test content with political implications',
        summary: 'Test summary',
        source: 'Test Source',
        url: 'https://test.com/article',
        published_at: new Date(),
        latitude: null,
        longitude: null,
        location_name: null,
        bias_score: null,
        bias_analysis: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const expectedBiasResult = {
        biasScore: 35,
        biasAnalysis: {
          politicalLean: 'left' as const,
          factualAccuracy: 80,
          emotionalTone: 70,
          confidence: 85,
        },
      };

      // Mock ArticleModel methods
      mockedArticleModel.findById.mockResolvedValue(mockArticle);
      mockedArticleModel.updateBiasAnalysis.mockResolvedValue({
        ...mockArticle,
        bias_score: expectedBiasResult.biasScore,
        bias_analysis: expectedBiasResult.biasAnalysis,
      });

      // Mock successful bias analysis
      vi.spyOn(BiasAnalysisService, 'analyzeArticle')
        .mockResolvedValue(expectedBiasResult);

      // Analyze the article
      const result = await BiasAnalysisService.analyzeAndStoreArticle(1);

      // Verify the result
      expect(result).toEqual(expectedBiasResult);
      expect(mockedArticleModel.updateBiasAnalysis).toHaveBeenCalledWith(
        1,
        expectedBiasResult.biasScore,
        expectedBiasResult.biasAnalysis
      );
    });
  });

  describe('Batch Processing Integration', () => {
    it('should process articles in batches with proper error handling', async () => {
      const articleIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      // Mock some articles to succeed and some to fail
      mockedArticleModel.findById.mockImplementation(async (id) => {
        if (id <= 8) {
          return {
            id,
            title: `Article ${id}`,
            content: `Content ${id}`,
            summary: `Summary ${id}`,
            source: 'Test Source',
            url: `https://test.com/article-${id}`,
            published_at: new Date(),
            latitude: null,
            longitude: null,
            location_name: null,
            bias_score: null,
            bias_analysis: null,
            created_at: new Date(),
            updated_at: new Date(),
          };
        }
        throw new Error(`Article ${id} not found`);
      });

      // Mock successful bias analysis
      vi.spyOn(BiasAnalysisService, 'analyzeArticle')
        .mockResolvedValue({
          biasScore: 50,
          biasAnalysis: {
            politicalLean: 'center',
            factualAccuracy: 80,
            emotionalTone: 60,
            confidence: 85,
          },
        });

      mockedArticleModel.updateBiasAnalysis.mockResolvedValue({} as any);

      // Process the batch
      const results = await BiasAnalysisService.batchAnalyzeArticles(articleIds);

      // Verify that only successful articles were processed
      expect(results.size).toBe(8); // Articles 1-8 should succeed, 9-10 should fail
      expect(mockedArticleModel.findById).toHaveBeenCalledTimes(10);
      expect(mockedArticleModel.updateBiasAnalysis).toHaveBeenCalledTimes(8);
    });
  });
});