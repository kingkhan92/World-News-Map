import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, MapViewState, FilterState } from '../types/map';
import { NewsService, NewsQueryParams } from '../services/newsService';
import { getFiltersFromUrl, updateUrlWithFilters } from '../utils/urlFilters';
import { queryKeys, cacheUtils } from '../services/queryClient';

interface UseMapDataOptions {
  initialViewState?: MapViewState;
  initialFilters?: Partial<FilterState>;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enableUrlPersistence?: boolean;
}

export const useMapData = (options: UseMapDataOptions = {}) => {
  const queryClient = useQueryClient();
  
  // Default view state (centered on world)
  const defaultViewState: MapViewState = {
    center: [20, 0], // Slightly north of equator
    zoom: 3,
  };

  // Default filters
  const defaultFilters: FilterState = {
    dateRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
    },
    sources: [],
    biasRange: [0, 100],
    keywords: '',
  };

  const [viewState, setViewState] = useState<MapViewState>(
    options.initialViewState || defaultViewState
  );
  
  // Initialize filters from URL if persistence is enabled
  const getInitialFilters = useCallback((): FilterState => {
    const baseFilters = {
      ...defaultFilters,
      ...options.initialFilters,
    };

    if (options.enableUrlPersistence) {
      return getFiltersFromUrl(baseFilters);
    }

    return baseFilters;
  }, [options.initialFilters, options.enableUrlPersistence]);

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);

  // Convert filters to query parameters
  const getQueryParams = useCallback((): NewsQueryParams => {
    const params: NewsQueryParams = {
      biasRange: filters.biasRange,
      limit: 1000, // Get a reasonable amount of articles
    };

    // Handle date filtering - if start and end are the same, use single date
    // Otherwise, use date range
    const startDate = filters.dateRange.start.toISOString().split('T')[0];
    const endDate = filters.dateRange.end.toISOString().split('T')[0];
    
    if (startDate === endDate) {
      params.date = endDate;
    } else {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    if (viewState.bounds) {
      params.bounds = viewState.bounds;
    }

    if (filters.sources.length > 0) {
      params.sources = filters.sources;
    }

    if (filters.keywords.trim()) {
      params.keywords = filters.keywords.trim();
    }

    if (filters.region) {
      params.bounds = filters.region;
    }

    return params;
  }, [filters, viewState.bounds]);

  // Query for articles
  const {
    data: articles = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.articles(getQueryParams()),
    queryFn: () => NewsService.getArticles(getQueryParams()),
    staleTime: 3 * 60 * 1000, // 3 minutes for map data
    cacheTime: 15 * 60 * 1000, // 15 minutes cache time
    refetchOnWindowFocus: false,
    retry: 2,
    // Enable background refetching for real-time updates
    refetchInterval: options.autoRefresh ? (options.refreshInterval || 5 * 60 * 1000) : false,
  });

  // Convert articles to map pins
  const pins: MapPin[] = NewsService.articlesToMapPins(articles);

  // Auto-refresh functionality
  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, options.refreshInterval || 5 * 60 * 1000); // Default 5 minutes

    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, refetch]);

  // Update view state
  const updateViewState = useCallback((newViewState: MapViewState) => {
    setViewState(newViewState);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Update URL if persistence is enabled
      if (options.enableUrlPersistence) {
        updateUrlWithFilters(updated, true);
      }
      
      return updated;
    });
  }, [options.enableUrlPersistence]);

  // Reset filters to default
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    try {
      await NewsService.refreshNews();
      await refetch();
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }, [refetch]);

  // Invalidate and refetch data
  const invalidateData = useCallback(() => {
    cacheUtils.invalidateArticles();
  }, []);

  return {
    // Data
    pins,
    articles,
    
    // State
    viewState,
    filters,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    updateViewState,
    updateFilters,
    resetFilters,
    refreshData,
    invalidateData,
    refetch,
  };
};