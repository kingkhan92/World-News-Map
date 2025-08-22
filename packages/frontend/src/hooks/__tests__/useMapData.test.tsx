import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMapData } from '../useMapData';
import React from 'react';

// Mock the news service
vi.mock('../../../services/newsService', () => ({
  newsService: {
    getArticles: vi.fn(),
    getArticleById: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMapData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches articles with default filters', async () => {
    const mockArticles = [
      {
        id: 1,
        title: 'Test Article',
        latitude: 40.7128,
        longitude: -74.0060,
        publishedAt: new Date(),
        source: 'test-source',
        biasScore: 50,
      },
    ];
    
    const { newsService } = require('../../../services/newsService');
    newsService.getArticles.mockResolvedValue(mockArticles);
    
    const { result } = renderHook(() => useMapData(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.articles).toEqual(mockArticles);
    expect(newsService.getArticles).toHaveBeenCalledWith({
      date: expect.any(Date),
      bounds: undefined,
      sources: undefined,
      biasRange: undefined,
      keywords: undefined,
    });
  });

  it('applies date filter', async () => {
    const { newsService } = require('../../../services/newsService');
    newsService.getArticles.mockResolvedValue([]);
    
    const testDate = new Date('2023-01-01');
    const { result } = renderHook(() => useMapData({ date: testDate }), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(newsService.getArticles).toHaveBeenCalledWith({
      date: testDate,
      bounds: undefined,
      sources: undefined,
      biasRange: undefined,
      keywords: undefined,
    });
  });

  it('applies geographic bounds filter', async () => {
    const { newsService } = require('../../../services/newsService');
    newsService.getArticles.mockResolvedValue([]);
    
    const bounds = {
      north: 45,
      south: 35,
      east: -70,
      west: -80,
    };
    
    const { result } = renderHook(() => useMapData({ bounds }), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(newsService.getArticles).toHaveBeenCalledWith({
      date: expect.any(Date),
      bounds,
      sources: undefined,
      biasRange: undefined,
      keywords: undefined,
    });
  });

  it('handles loading state', () => {
    const { newsService } = require('../../../services/newsService');
    newsService.getArticles.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { result } = renderHook(() => useMapData(), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.articles).toEqual([]);
  });

  it('handles error state', async () => {
    const { newsService } = require('../../../services/newsService');
    newsService.getArticles.mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useMapData(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.articles).toEqual([]);
  });

  it('refetches data when filters change', async () => {
    const { newsService } = require('../../../services/newsService');
    newsService.getArticles.mockResolvedValue([]);
    
    const { result, rerender } = renderHook(
      ({ date }) => useMapData({ date }),
      {
        wrapper: createWrapper(),
        initialProps: { date: new Date('2023-01-01') },
      }
    );
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(newsService.getArticles).toHaveBeenCalledTimes(1);
    
    rerender({ date: new Date('2023-01-02') });
    
    await waitFor(() => {
      expect(newsService.getArticles).toHaveBeenCalledTimes(2);
    });
  });
});