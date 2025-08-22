import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, List, ListItem, Typography } from '@mui/material';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Number of items to render outside visible area
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  className?: string;
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  loadingComponent,
  emptyComponent,
  className,
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, visibleStart - overscan),
      end: Math.min(items.length - 1, visibleEnd + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i]) {
        result.push({
          index: i,
          item: items[i],
        });
      }
    }
    return result;
  }, [items, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);

    // Load more when near bottom
    if (onLoadMore && hasNextPage && !isLoading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const scrollPosition = scrollTop + clientHeight;
      
      // Trigger load more when 80% scrolled
      if (scrollPosition >= scrollHeight * 0.8) {
        onLoadMore();
      }
    }
  }, [onLoadMore, hasNextPage, isLoading]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const scrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.start * itemHeight;

  if (items.length === 0 && !isLoading) {
    return (
      <Box
        height={containerHeight}
        display="flex"
        alignItems="center"
        justifyContent="center"
        className={className}
      >
        {emptyComponent || (
          <Typography variant="body2" color="text.secondary">
            No items to display
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      ref={scrollElementRef}
      height={containerHeight}
      overflow="auto"
      onScroll={handleScroll}
      className={className}
      sx={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0,0,0,0.1)',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '4px',
        },
      }}
    >
      <Box height={totalHeight} position="relative">
        <Box
          position="absolute"
          top={offsetY}
          left={0}
          right={0}
        >
          <List disablePadding>
            {visibleItems.map(({ item, index }) => (
              <ListItem
                key={index}
                disablePadding
                sx={{
                  height: itemHeight,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {renderItem(item, index)}
              </ListItem>
            ))}
            {isLoading && (
              <ListItem
                sx={{
                  height: itemHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loadingComponent || (
                  <Typography variant="body2" color="text.secondary">
                    Loading more items...
                  </Typography>
                )}
              </ListItem>
            )}
          </List>
        </Box>
      </Box>
    </Box>
  );
}

// Hook for managing virtual scroll state
export const useVirtualScroll = <T,>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, visibleStart - 5),
      end: Math.min(items.length - 1, visibleEnd + 5),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const scrollToItem = useCallback((index: number) => {
    setScrollTop(index * itemHeight);
  }, [itemHeight]);

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    scrollToItem,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.start * itemHeight,
  };
};