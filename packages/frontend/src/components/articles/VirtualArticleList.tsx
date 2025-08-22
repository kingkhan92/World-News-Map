import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Skeleton,
  useTheme,
} from '@mui/material';
import { format } from 'date-fns';
import { VirtualScrollList } from '../common/VirtualScrollList';
import { BiasIndicator } from '../map/BiasIndicator';
import { Article } from '../../types/api';
import { useLazyData } from '../../hooks/useLazyData';
import { NewsService } from '../../services/newsService';

interface VirtualArticleListProps {
  articles: Article[];
  onArticleClick?: (article: Article) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  containerHeight?: number;
  searchKeywords?: string;
  className?: string;
}

interface ArticleItemProps {
  article: Article;
  onClick?: (article: Article) => void;
  searchKeywords?: string;
}

const ArticleItem: React.FC<ArticleItemProps> = ({ 
  article, 
  onClick, 
  searchKeywords 
}) => {
  const theme = useTheme();

  const handleClick = useCallback(() => {
    onClick?.(article);
  }, [article, onClick]);

  const highlightText = useCallback((text: string, keywords?: string) => {
    if (!keywords) return text;
    
    const regex = new RegExp(`(${keywords})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: theme.palette.warning.light }}>
          {part}
        </mark>
      ) : part
    );
  }, [theme.palette.warning.light]);

  const getSourceColor = useCallback((source: string) => {
    // Generate consistent color based on source name
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = source.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
  }, []);

  return (
    <Card
      sx={{
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        } : {},
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="flex-start" gap={2}>
          {/* Source Avatar */}
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: '0.75rem',
              bgcolor: getSourceColor(article.source),
              flexShrink: 0,
            }}
          >
            {article.source.substring(0, 2).toUpperCase()}
          </Avatar>

          {/* Article Content */}
          <Box flex={1} minWidth={0}>
            {/* Title */}
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                lineHeight: 1.3,
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {highlightText(article.title, searchKeywords)}
            </Typography>

            {/* Summary */}
            {article.summary && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.4,
                }}
              >
                {highlightText(article.summary, searchKeywords)}
              </Typography>
            )}

            {/* Metadata Row */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={1}
            >
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                {/* Source Chip */}
                <Chip
                  label={article.source}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />

                {/* Location */}
                {article.locationName && (
                  <Chip
                    label={article.locationName}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}

                {/* Published Date */}
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(article.publishedAt), 'MMM d, yyyy')}
                </Typography>
              </Box>

              {/* Bias Score */}
              {article.biasScore !== null && article.biasScore !== undefined && (
                <BiasIndicator
                  score={article.biasScore}
                  size="small"
                  showLabel={false}
                />
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const ArticleItemSkeleton: React.FC = () => (
  <Card sx={{ width: '100%' }}>
    <CardContent sx={{ p: 2 }}>
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Skeleton variant="circular" width={32} height={32} />
        <Box flex={1}>
          <Skeleton variant="text" width="80%" height={24} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mt: 0.5 }} />
          <Skeleton variant="text" width="100%" height={16} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="70%" height={16} />
          <Box display="flex" gap={1} mt={1.5}>
            <Skeleton variant="rounded" width={60} height={20} />
            <Skeleton variant="rounded" width={80} height={20} />
            <Skeleton variant="text" width={80} height={16} />
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const VirtualArticleList: React.FC<VirtualArticleListProps> = ({
  articles,
  onArticleClick,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  containerHeight = 600,
  searchKeywords,
  className,
}) => {
  const theme = useTheme();

  // Item height calculation (approximate)
  const itemHeight = 140; // Estimated height per article item

  const renderArticleItem = useCallback((article: Article, index: number) => (
    <ArticleItem
      key={article.id}
      article={article}
      onClick={onArticleClick}
      searchKeywords={searchKeywords}
    />
  ), [onArticleClick, searchKeywords]);

  const loadingComponent = useMemo(() => (
    <Box display="flex" justifyContent="center" alignItems="center" p={2}>
      <ArticleItemSkeleton />
    </Box>
  ), []);

  const emptyComponent = useMemo(() => (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={4}
      textAlign="center"
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No articles found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Try adjusting your filters or search terms
      </Typography>
    </Box>
  ), []);

  return (
    <Box className={className}>
      <VirtualScrollList
        items={articles}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderArticleItem}
        onLoadMore={onLoadMore}
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        loadingComponent={loadingComponent}
        emptyComponent={emptyComponent}
        overscan={3}
      />
    </Box>
  );
};

// Hook for managing article list with virtual scrolling
export const useVirtualArticleList = (
  queryParams: any,
  pageSize: number = 20
) => {
  const {
    data: articles,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    refresh,
  } = useLazyData({
    queryKey: ['articles', 'virtual', queryParams],
    queryFn: (params) => NewsService.getArticles({ ...queryParams, ...params }),
    pageSize,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    articles,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
    refresh,
  };
};