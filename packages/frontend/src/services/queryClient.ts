import { QueryClient } from '@tanstack/react-query';

// Create optimized query client with caching configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Retry failed requests up to 2 times
      retry: 2,
      // Use exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys factory for consistent cache key management
export const queryKeys = {
  // Articles
  articles: (params?: any) => ['articles', params],
  article: (id: number) => ['article', id],
  
  // Sources
  sources: () => ['sources'],
  
  // Statistics
  statistics: () => ['statistics'],
  
  // User data
  user: () => ['user'],
  userPreferences: () => ['user', 'preferences'],
  userHistory: () => ['user', 'history'],
  
  // Cache stats
  cacheStats: () => ['cache', 'stats'],
} as const;

// Cache utilities
export const cacheUtils = {
  /**
   * Invalidate all article-related queries
   */
  invalidateArticles: () => {
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    queryClient.invalidateQueries({ queryKey: ['article'] });
  },

  /**
   * Invalidate sources cache
   */
  invalidateSources: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sources() });
  },

  /**
   * Invalidate statistics cache
   */
  invalidateStatistics: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.statistics() });
  },

  /**
   * Prefetch articles for better performance
   */
  prefetchArticles: (params?: any) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.articles(params),
      staleTime: 5 * 60 * 1000,
    });
  },

  /**
   * Set article data in cache
   */
  setArticleData: (id: number, data: any) => {
    queryClient.setQueryData(queryKeys.article(id), data);
  },

  /**
   * Get cached article data
   */
  getCachedArticle: (id: number) => {
    return queryClient.getQueryData(queryKeys.article(id));
  },

  /**
   * Remove specific article from cache
   */
  removeArticle: (id: number) => {
    queryClient.removeQueries({ queryKey: queryKeys.article(id) });
  },

  /**
   * Clear all cached data
   */
  clearAll: () => {
    queryClient.clear();
  },

  /**
   * Get cache stats
   */
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.isActive()).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
    };
  },
};