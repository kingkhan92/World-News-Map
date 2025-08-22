import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  CardActions,
  Avatar,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { MapPin } from '../../types/map';
import { BiasIndicator } from './BiasIndicator';
import { highlightSearchTerms } from '../filters/KeywordSearch';
import { format } from 'date-fns';

interface ArticlePreviewProps {
  pin: MapPin;
  onReadMore: (pin: MapPin) => void;
  onOpenOriginal?: (url: string) => void;
  compact?: boolean;
  showActions?: boolean;
  searchKeywords?: string;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({
  pin,
  onReadMore,
  onOpenOriginal,
  compact = false,
  showActions = true,
  searchKeywords = '',
}) => {
  const handleReadMore = () => {
    onReadMore(pin);
  };

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenOriginal && pin.article.url) {
      onOpenOriginal(pin.article.url);
    }
  };

  const getSourceInitials = (source: string) => {
    return source
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSourceColor = (source: string) => {
    // Generate a consistent color based on source name
    const hash = source.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#d32f2f', '#0288d1'];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Card 
      sx={{ 
        maxWidth: compact ? 280 : 400,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
      onClick={handleReadMore}
    >
      <CardContent sx={{ pb: showActions ? 1 : 2 }}>
        {/* Header with source and bias */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: '0.75rem',
              bgcolor: getSourceColor(pin.article.source),
            }}
          >
            {getSourceInitials(pin.article.source)}
          </Avatar>
          
          <Chip 
            label={pin.article.source} 
            size="small" 
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
          
          <Box sx={{ flex: 1 }} />
          
          <BiasIndicator 
            score={pin.article.biasScore} 
            size="small" 
            showLabel={!compact}
          />
        </Box>

        {/* Title */}
        <Typography 
          variant={compact ? "body2" : "h6"} 
          component="h3" 
          gutterBottom
          sx={{
            fontWeight: 600,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {highlightSearchTerms(pin.article.title, searchKeywords)}
        </Typography>

        {/* Summary */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
            mb: 1.5,
          }}
        >
          {highlightSearchTerms(pin.article.summary, searchKeywords)}
        </Typography>

        {/* Metadata */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {pin.article.locationName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {pin.article.locationName}
              </Typography>
            </Box>
          )}
          
          {pin.article.publishedAt && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {format(new Date(pin.article.publishedAt), 'MMM dd, HH:mm')}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      {showActions && (
        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Button 
            size="small" 
            onClick={handleReadMore}
            variant="contained"
            sx={{ mr: 1 }}
          >
            Read More
          </Button>
          
          {pin.article.url && (
            <Button 
              size="small" 
              onClick={handleOpenOriginal}
              startIcon={<OpenInNewIcon />}
              variant="outlined"
            >
              Original
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};