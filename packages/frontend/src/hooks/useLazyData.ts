import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../services/queryClient';

interface UseLazyDataOptions<T> {
  queryKey: any[];
  queryFn: (params: any) => Promise<T[]>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface LazyDataResult<T> {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasNextPage: boolean;
  loadMore: () => void;
  refresh: () => void;
  totalCount?: number;
}

export function useLazyData<T>({
  queryKey,
  queryFn,
  pageSize = 20,
  enabled = true,
  staleTime = 5 * 60 * 1000,
  cacheTime = 10 * 60 * 1000,
}: UseLazyDataOptions<T>): LazyDataResult<T> {
  const [currentPage, setCurrentPage] = useState(0);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  // Query for current page
  const {
    data: pageData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKey, currentPage],
    queryFn: () => queryFn({
      limit: pageSize,
      offset: currentPage * pageSize,
    }),
    enabled: enabled && !loadingRef.current,
    staleTime,
    cacheTime,
    keepPreviousData: true,
  });

  // Update all data when new page data arrives
  useEffect(() => {
    if (pageData) {
      setIsLoadingMore(false);
      loadingRef.current = false;

      if (currentPage === 0) {
        // First page - replace all data
        setAllData(pageData);
      } else {
        // Subsequent pages - append data
        setAllData(prev => [...prev, ...pageData]);
      }

      // Check if we have more pages
      setHasNextPage(pageData.length === pageSize);
    }
  }, [pageData, currentPage, pageSize]);

  // Load more data
  const loadMore = useCallback(() => {
    if (!hasNextPage || isLoading || isLoadingMore || loadingRef.current) {
      return;
    }

    setIsLoadingMore(true);
    loadingRef.current = true;
    setCurrentPage(prev => prev + 1);
  }, [hasNextPage, isLoading, isLoadingMore]);

  // Refresh data (reset to first page)
  const refresh = useCallback(() => {
    setCurrentPage(0);
    setAllData([]);
    setHasNextPage(true);
    setIsLoadingMore(false);
    loadingRef.current = false;
    refetch();
  }, [refetch]);

  return {
    data: allData,
    isLoading: isLoading && currentPage === 0,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    refresh,
  };
}

// Hook for intersection observer-based lazy loading
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options,
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options]);

  return targetRef;
}

// Hook for lazy loading images
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const loadImage = useCallback(() => {
    if (!src || isLoaded) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setIsError(false);
    };
    img.onerror = () => {
      setIsError(true);
      setIsLoaded(false);
    };
    img.src = src;
  }, [src, isLoaded]);

  const targetRef = useIntersectionObserver(loadImage, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  return {
    src: imageSrc,
    isLoaded,
    isError,
    ref: targetRef,
  };
}

// Hook for progressive data loading based on viewport
export function useProgressiveLoading<T>(
  items: T[],
  batchSize: number = 10,
  delay: number = 100
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const loadMore = useCallback(() => {
    if (visibleCount >= items.length) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + batchSize, items.length));
    }, delay);
  }, [visibleCount, items.length, batchSize, delay]);

  const reset = useCallback(() => {
    setVisibleCount(batchSize);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [batchSize]);

  useEffect(() => {
    reset();
  }, [items, reset]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    loadMore,
    reset,
  };
}