import { vi } from 'vitest';
import { newsService } from '../newsService';
import { apiClient } from '../apiClient';

// Mock the API client
vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('newsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArticles', () => {
    it('fetches articles with default parameters', async () => {
      const mockArticles = [
        {
          id: 1,
          title: 'Test Article',
          latitude: 40.7128,
          longitude: -74.0060,
          publishedAt: '2023-01-01T00:00:00Z',
          source: 'test-source',
          biasScore: 50,
        },
      ];
      
      (apiClient.get as any).mockResolvedValue({ data: mockArticles });
      
      const result = await newsService.getArticles({});
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles', {
        params: {},
      });
      expect(result).toEqual(mockArticles);
    });

    it('includes date parameter when provided', async () => {
      (apiClient.get as any).mockResolvedValue({ data: [] });
      
      const testDate = new Date('2023-01-01');
      await newsService.getArticles({ date: testDate });
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles', {
        params: {
          date: testDate.toISOString().split('T')[0],
        },
      });
    });

    it('includes geographic bounds when provided', async () => {
      (apiClient.get as any).mockResolvedValue({ data: [] });
      
      const bounds = {
        north: 45,
        south: 35,
        east: -70,
        west: -80,
      };
      
      await newsService.getArticles({ bounds });
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles', {
        params: {
          north: 45,
          south: 35,
          east: -70,
          west: -80,
        },
      });
    });

    it('includes source filters when provided', async () => {
      (apiClient.get as any).mockResolvedValue({ data: [] });
      
      await newsService.getArticles({ sources: ['bbc', 'reuters'] });
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles', {
        params: {
          sources: 'bbc,reuters',
        },
      });
    });

    it('includes bias range when provided', async () => {
      (apiClient.get as any).mockResolvedValue({ data: [] });
      
      await newsService.getArticles({ biasRange: { min: 20, max: 80 } });
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles', {
        params: {
          biasMin: 20,
          biasMax: 80,
        },
      });
    });

    it('includes keywords when provided', async () => {
      (apiClient.get as any).mockResolvedValue({ data: [] });
      
      await newsService.getArticles({ keywords: 'climate change' });
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles', {
        params: {
          keywords: 'climate change',
        },
      });
    });
  });

  describe('getArticleById', () => {
    it('fetches single article by ID', async () => {
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        content: 'Article content',
        latitude: 40.7128,
        longitude: -74.0060,
      };
      
      (apiClient.get as any).mockResolvedValue({ data: mockArticle });
      
      const result = await newsService.getArticleById(1);
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/articles/1');
      expect(result).toEqual(mockArticle);
    });
  });

  describe('refreshNews', () => {
    it('triggers news refresh', async () => {
      (apiClient.post as any).mockResolvedValue({ data: { success: true } });
      
      const result = await newsService.refreshNews();
      
      expect(apiClient.post).toHaveBeenCalledWith('/api/news/refresh');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getSources', () => {
    it('fetches available news sources', async () => {
      const mockSources = ['bbc', 'reuters', 'cnn'];
      
      (apiClient.get as any).mockResolvedValue({ data: mockSources });
      
      const result = await newsService.getSources();
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/news/sources');
      expect(result).toEqual(mockSources);
    });
  });

  it('handles API errors gracefully', async () => {
    (apiClient.get as any).mockRejectedValue(new Error('Network error'));
    
    await expect(newsService.getArticles({})).rejects.toThrow('Network error');
  });
});