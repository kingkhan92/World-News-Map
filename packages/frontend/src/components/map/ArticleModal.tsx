import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from '../../types/map';
import { Article } from '../../types/api';
import { NewsService } from '../../services/newsService';
import { useUserInteractions } from '../../hooks/useUserInteractions';
import { BiasIndicator } from './BiasIndicator';
import { highlightSearchTerms } from '../filters/KeywordSearch';
import { format } from 'date-fns';

interface ArticleModalProps {
  pin: MapPin;
  open: boolean;
  onClose: () => void;
  fullScreen?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  searchKeywords?: string;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  pin,
  open,
  onClose,
  fullScreen = false,
  maxWidth = 'md',
  searchKeywords = '',
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const {
    recordView,
    toggleBookmark,
    shareArticle,
    checkBookmarkStatus,
    loading: interactionLoading
  } = useUserInteractions();

  // Fetch full article details
  const {
    data: fullArticle,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['article', pin.article.id],
    queryFn: () => NewsService.getArticle(pin.article.id),
    enabled: open,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Record view and check bookmark status when modal opens
  useEffect(() => {
    if (open && pin.article.id) {
      recordView(pin.article.id);
      loadBookmarkStatus();
    }
  }, [open, pin.article.id, recordView]);

  const loadBookmarkStatus = async () => {
    try {
      const bookmarked = await checkBookmarkStatus(pin.article.id);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
    }
  };

  const handleShare = async () => {
    if (!fullArticle) return;

    try {
      await shareArticle(
        fullArticle.id,
        fullArticle.title,
        fullArticle.summary,
        fullArticle.url
      );
      setShareSuccess(true);
    } catch (error) {
      console.error('Error sharing article:', error);
      setShareError(true);
    }
  };

  const handleBookmark = async () => {
    try {
      setBookmarkLoading(true);
      const result = await toggleBookmark(pin.article.id);
      setIsBookmarked(result.isBookmarked);
    } catch (error) {
      console.error('Error bookmarking article:', error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleOpenOriginal = () => {
    if (fullArticle) {
      window.open(fullArticle.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getBiasAnalysisText = (analysis: Article['biasAnalysis']) => {
    const leanText = {
      left: 'Left-leaning',
      center: 'Centrist',
      right: 'Right-leaning',
    };

    return `${leanText[analysis.politicalLean]} perspective with ${analysis.factualAccuracy}% factual accuracy`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          maxHeight: fullScreen ? '100vh' : '90vh',
          m: fullScreen ? 0 : 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              {highlightSearchTerms(pin.article.title, searchKeywords)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={pin.article.source} size="small" variant="outlined" />
              <BiasIndicator score={pin.article.biasScore} size="small" />
              {fullArticle && (
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(fullArticle.publishedAt), 'MMM dd, yyyy • HH:mm')}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="error">
              Failed to load article details. Please try again.
            </Alert>
          </Box>
        )}

        {fullArticle && (
          <Box>
            {/* Location */}
            {fullArticle.locationName && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {fullArticle.locationName}
                </Typography>
              </Box>
            )}

            {/* Summary */}
            <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
              {fullArticle.summary}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Content */}
            {fullArticle.content && (
              <Typography variant="body2" paragraph sx={{ lineHeight: 1.6 }}>
                {highlightSearchTerms(
                  fullArticle.content.length > 1000 
                    ? `${fullArticle.content.substring(0, 1000)}...`
                    : fullArticle.content,
                  searchKeywords
                )}
              </Typography>
            )}

            {/* Bias Analysis */}
            {fullArticle.biasAnalysis && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Bias Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getBiasAnalysisText(fullArticle.biasAnalysis)}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <BiasIndicator 
                    score={fullArticle.biasScore} 
                    size="large" 
                    showLabel={true}
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          <Button
            startIcon={
              bookmarkLoading ? (
                <CircularProgress size={16} />
              ) : isBookmarked ? (
                <BookmarkIcon />
              ) : (
                <BookmarkBorderIcon />
              )
            }
            onClick={handleBookmark}
            color={isBookmarked ? 'primary' : 'inherit'}
            variant={isBookmarked ? 'contained' : 'outlined'}
            size="small"
            disabled={bookmarkLoading}
          >
            {bookmarkLoading ? 'Saving...' : isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          
          <Button
            startIcon={<ShareIcon />}
            onClick={handleShare}
            variant="outlined"
            size="small"
            disabled={!fullArticle}
          >
            Share
          </Button>
          
          <Box sx={{ flex: 1 }} />
          
          <Button
            startIcon={<OpenInNewIcon />}
            onClick={handleOpenOriginal}
            variant="contained"
            size="small"
            disabled={!fullArticle}
          >
            Read Original
          </Button>
        </Box>
        
        {/* Success/Error Snackbars */}
        <Snackbar
          open={shareSuccess}
          autoHideDuration={3000}
          onClose={() => setShareSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setShareSuccess(false)}>
            Article link copied to clipboard!
          </Alert>
        </Snackbar>
        
        <Snackbar
          open={shareError}
          autoHideDuration={3000}
          onClose={() => setShareError(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setShareError(false)}>
            Failed to share article. Please try again.
          </Alert>
        </Snackbar>
      </DialogActions>
    </Dialog>
  );
};