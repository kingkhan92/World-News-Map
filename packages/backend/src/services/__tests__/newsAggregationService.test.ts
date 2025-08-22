import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { NewsAggregationService } from '../newsAggregationService.js';
import { ArticleModel } from '../../models/Article.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock ArticleModel
vi.mock('../../models/Article.js', () => ({
  ArticleModel: {
    findByUrl: vi.fn(),
    createBatch: vi.fn(),
    getStatistics: vi.fn()
  }
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('NewsAggregationService', () => {
  let service: NewsAggregationService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.NEWS_API_KEY = 'test-news-api-key';
    process.env.GUARDIAN_API_KEY = 'test-guardian-key';
    process.env.OPENCAGE_API_KEY = 'test-geocoding-key';
    
    service = new NewsAggregationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAllNews', () => {
    it('should fetch news from all sources successfully', async () => {
      // Mock NewsAPI response
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('newsapi.org/v2/top-headlines')) {
          return Promise.resolve({
            data: {
              status: 'ok',
              articles: [
                {
                  title: 'Test News Article',
                  description: 'Test description',
                  content: 'Test content',
                  url: 'https://example.com/article1',
                  source: { name: 'Test Source' },
                  publishedAt: '2024-01-01T12:00:00Z'
                }
              ]
            }
          });
        }
        
        if (url.includes('content.guardianapis.com')) {
          return Promise.resolve({
            data: {
              response: {
                status: 'ok',
                results: [
                  {
                    webTitle: 'Guardian Test Article',
                    webUrl: 'https://guardian.com/article1',
                    fields: {
                      bodyText: 'Guardian content',
                      trailText: 'Guardian summary'
                    },
                    webPublicationDate: '2024-01-01T12:00:00Z'
                  }
                ]
              }
            }
          });
        }
        
        if (url.includes('newsapi.org/v2/everything')) {
          return Promise.resolve({
            data: {
              status: 'ok',
              articles: [
                {
                  title: 'Reuters Test Article',
                  description: 'Reuters description',
                  content: 'Reuters content',
                  url: 'https://reuters.com/article1',
                  publishedAt: '2024-01-01T12:00:00Z'
                }
              ]
            }
          });
        }
        
        if (url.includes('opencagedata.com')) {
          return Promise.resolve({
            data: {
              results: [
                {
                  geometry: {
                    lat: 40.7128,
                    lng: -74.0060
                  }
                }
              ]
            }
          });
        }
        
        return Promise.reject(new Error('Unknown URL'));
      });

      const articles = await service.fetchAllNews();
      
      expect(articles).toHaveLength(3);
      expect(articles[0]).toMatchObject({
        title: 'Test News Article',
        source: 'Test Source',
        url: 'https://example.com/article1'
      });
      expect(articles[1]).toMatchObject({
        title: 'Guardian Test Article',
        source: 'The Guardian',
        url: 'https://guardian.com/article1'
      });
      expect(articles[2]).toMatchObject({
        title: 'Reuters Test Article',
        source: 'Reuters',
        url: 'https://reuters.com/article1'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const articles = await service.fetchAllNews();
      
      expect(articles).toHaveLength(0);
    });

    it('should filter out invalid articles', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'ok',
          articles: [
            {
              title: 'Valid Article',
              description: 'Valid description',
              url: 'https://example.com/valid',
              source: { name: 'Valid Source' },
              publishedAt: '2024-01-01T12:00:00Z'
            },
            {
              title: '[Removed]',
              description: 'Removed article',
              url: 'https://example.com/removed',
              source: { name: 'Source' },
              publishedAt: '2024-01-01T12:00:00Z'
            },
            {
              // Missing title
              description: 'No title',
              url: 'https://example.com/notitle',
              source: { name: 'Source' },
              publishedAt: '2024-01-01T12:00:00Z'
            }
          ]
        }
      });

      const articles = await service.fetchAllNews();
      
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Valid Article');
    });
  });

  describe('extractLocationNames', () => {
    it('should extract location names from text', () => {
      const service = new NewsAggregationService();
      const text = 'Breaking news from New York and London about the situation in Tokyo';
      
      // Access private method for testing
      const extractLocationNames = (service as any).extractLocationNames.bind(service);
      const locations = extractLocationNames(text);
      
      expect(locations).toContain('New York');
      expect(locations).toContain('London');
      expect(locations).toContain('Tokyo');
    });

    it('should handle text with no locations', () => {
      const service = new NewsAggregationService();
      const text = 'This is a generic news article with no specific locations mentioned';
      
      const extractLocationNames = (service as any).extractLocationNames.bind(service);
      const locations = extractLocationNames(text);
      
      expect(locations).toHaveLength(0);
    });
  });

  describe('geocodeLocation', () => {
    it('should geocode location successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          results: [
            {
              geometry: {
                lat: 40.7128,
                lng: -74.0060
              }
            }
          ]
        }
      });

      const service = new NewsAggregationService();
      const geocodeLocation = (service as any).geocodeLocation.bind(service);
      const result = await geocodeLocation('New York');
      
      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060
      });
    });

    it('should handle geocoding failures', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Geocoding error'));

      const service = new NewsAggregationService();
      const geocodeLocation = (service as any).geocodeLocation.bind(service);
      const result = await geocodeLocation('Unknown Location');
      
      expect(result).toEqual({
        latitude: null,
        longitude: null
      });
    });

    it('should return null when no API key is configured', async () => {
      delete process.env.OPENCAGE_API_KEY;
      
      const service = new NewsAggregationService();
      const geocodeLocation = (service as any).geocodeLocation.bind(service);
      const result = await geocodeLocation('New York');
      
      expect(result).toEqual({
        latitude: null,
        longitude: null
      });
    });
  });

  describe('saveArticlesToDatabase', () => {
    it('should save new articles to database', async () => {
      const mockArticles = [
        {
          title: 'Test Article 1',
          content: 'Content 1',
          summary: 'Summary 1',
          url: 'https://example.com/1',
          source: 'Test Source',
          published_at: new Date(),
          latitude: null,
          longitude: null,
          location_name: null
        },
        {
          title: 'Test Article 2',
          content: 'Content 2',
          summary: 'Summary 2',
          url: 'https://example.com/2',
          source: 'Test Source',
          published_at: new Date(),
          latitude: null,
          longitude: null,
          location_name: null
        }
      ];

      vi.mocked(ArticleModel.findByUrl).mockResolvedValue(null);
      vi.mocked(ArticleModel.createBatch).mockResolvedValue([]);

      await service.saveArticlesToDatabase(mockArticles);

      expect(ArticleModel.findByUrl).toHaveBeenCalledTimes(2);
      expect(ArticleModel.createBatch).toHaveBeenCalledWith(mockArticles);
    });

    it('should skip existing articles', async () => {
      const mockArticles = [
        {
          title: 'Existing Article',
          content: 'Content',
          summary: 'Summary',
          url: 'https://example.com/existing',
          source: 'Test Source',
          published_at: new Date(),
          latitude: null,
          longitude: null,
          location_name: null
        }
      ];

      vi.mocked(ArticleModel.findByUrl).mockResolvedValue({
        id: 1,
        title: 'Existing Article',
        content: 'Content',
        summary: 'Summary',
        url: 'https://example.com/existing',
        source: 'Test Source',
        published_at: new Date(),
        latitude: null,
        longitude: null,
        location_name: null,
        bias_score: null,
        bias_analysis: null,
        created_at: new Date(),
        updated_at: new Date()
      });

      await service.saveArticlesToDatabase(mockArticles);

      expect(ArticleModel.findByUrl).toHaveBeenCalledTimes(1);
      expect(ArticleModel.createBatch).not.toHaveBeenCalled();
    });

    it('should handle empty articles array', async () => {
      await service.saveArticlesToDatabase([]);

      expect(ArticleModel.findByUrl).not.toHaveBeenCalled();
      expect(ArticleModel.createBatch).not.toHaveBeenCalled();
    });
  });

  describe('aggregateAndSaveNews', () => {
    it('should complete full aggregation process successfully', async () => {
      // Mock successful API responses
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'ok',
          articles: [
            {
              title: 'Test Article',
              description: 'Test description',
              content: 'Test content',
              url: 'https://example.com/test',
              source: { name: 'Test Source' },
              publishedAt: '2024-01-01T12:00:00Z'
            }
          ]
        }
      });

      vi.mocked(ArticleModel.findByUrl).mockResolvedValue(null);
      vi.mocked(ArticleModel.createBatch).mockResolvedValue([]);
      vi.mocked(ArticleModel.getStatistics).mockResolvedValue({
        totalArticles: 1,
        articlesWithLocation: 0,
        articlesWithBias: 0,
        uniqueSources: 1,
        dateRange: { earliest: new Date(), latest: new Date() }
      });

      const result = await service.aggregateAndSaveNews();

      expect(result.total).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
    });

    it('should handle errors in aggregation process', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.aggregateAndSaveNews();

      expect(result.total).toBe(0);
      expect(result.saved).toBe(0);
      expect(result.errors).toBe(1);
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits between API calls', async () => {
      const startTime = Date.now();
      
      // Mock multiple API calls
      mockedAxios.get.mockResolvedValue({
        data: { status: 'ok', articles: [] }
      });

      const service = new NewsAggregationService();
      
      // Make multiple calls that should trigger rate limiting
      await Promise.all([
        service.fetchAllNews(),
        service.fetchAllNews()
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least some time due to rate limiting
      expect(duration).toBeGreaterThan(100);
    });
  });
});