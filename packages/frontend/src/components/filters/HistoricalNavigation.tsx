import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Slider,
  Tooltip,
  Fade,
  useTheme,
  useMediaQuery,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  FastRewind,
  FastForward,
} from '@mui/icons-material';
import { format, addDays, subDays, differenceInDays, isAfter, isBefore } from 'date-fns';

interface HistoricalNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  isLoading?: boolean;
  autoPlay?: boolean;
  playbackSpeed?: number; // milliseconds between dates
  onPlaybackChange?: (isPlaying: boolean) => void;
  className?: string;
}

export const HistoricalNavigation: React.FC<HistoricalNavigationProps> = ({
  currentDate,
  onDateChange,
  minDate = subDays(new Date(), 365), // Default to 1 year ago
  maxDate = new Date(),
  isLoading = false,
  autoPlay = false,
  playbackSpeed = 1000,
  onPlaybackChange,
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null);

  // Calculate total days and current position
  const totalDays = differenceInDays(maxDate, minDate);
  const currentPosition = differenceInDays(currentDate, minDate);

  // Handle playback control
  const handlePlayPause = useCallback(() => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    onPlaybackChange?.(newIsPlaying);
  }, [isPlaying, onPlaybackChange]);

  // Handle date navigation
  const handlePreviousDay = useCallback(() => {
    const newDate = subDays(currentDate, 1);
    if (!isBefore(newDate, minDate)) {
      onDateChange(newDate);
    }
  }, [currentDate, minDate, onDateChange]);

  const handleNextDay = useCallback(() => {
    const newDate = addDays(currentDate, 1);
    if (!isAfter(newDate, maxDate)) {
      onDateChange(newDate);
    }
  }, [currentDate, maxDate, onDateChange]);

  const handlePreviousWeek = useCallback(() => {
    const newDate = subDays(currentDate, 7);
    const targetDate = isBefore(newDate, minDate) ? minDate : newDate;
    onDateChange(targetDate);
  }, [currentDate, minDate, onDateChange]);

  const handleNextWeek = useCallback(() => {
    const newDate = addDays(currentDate, 7);
    const targetDate = isAfter(newDate, maxDate) ? maxDate : newDate;
    onDateChange(targetDate);
  }, [currentDate, maxDate, onDateChange]);

  // Handle slider change
  const handleSliderChange = useCallback((_: Event, value: number | number[]) => {
    const position = Array.isArray(value) ? value[0] : value;
    const newDate = addDays(minDate, position);
    onDateChange(newDate);
  }, [minDate, onDateChange]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && !isLoading) {
      const interval = setInterval(() => {
        const nextDate = addDays(currentDate, 1);
        
        if (isAfter(nextDate, maxDate)) {
          // Reached the end, stop playing
          setIsPlaying(false);
          onPlaybackChange?.(false);
        } else {
          onDateChange(nextDate);
        }
      }, playbackSpeed);

      setPlaybackInterval(interval);

      return () => {
        clearInterval(interval);
        setPlaybackInterval(null);
      };
    } else if (playbackInterval) {
      clearInterval(playbackInterval);
      setPlaybackInterval(null);
    }
  }, [isPlaying, isLoading, currentDate, maxDate, playbackSpeed, onDateChange, onPlaybackChange, playbackInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackInterval) {
        clearInterval(playbackInterval);
      }
    };
  }, [playbackInterval]);

  // Check if navigation is at boundaries
  const isAtStart = isBefore(currentDate, addDays(minDate, 1)) || 
                   differenceInDays(currentDate, minDate) === 0;
  const isAtEnd = isAfter(currentDate, subDays(maxDate, 1)) || 
                 differenceInDays(maxDate, currentDate) === 0;

  return (
    <Paper
      className={className}
      elevation={2}
      sx={{
        p: isMobile ? 1.5 : 2,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        minWidth: isMobile ? 280 : 400,
      }}
    >
      {/* Loading indicator */}
      {isLoading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0,
            borderRadius: '8px 8px 0 0',
          }} 
        />
      )}

      {/* Current Date Display */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {totalDays > 0 && (
            `Day ${currentPosition + 1} of ${totalDays + 1}`
          )}
        </Typography>
      </Box>

      {/* Timeline Slider */}
      <Box sx={{ px: 1, mb: 2 }}>
        <Slider
          value={currentPosition}
          min={0}
          max={totalDays}
          onChange={handleSliderChange}
          disabled={isLoading}
          sx={{
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
            },
            '& .MuiSlider-track': {
              height: 4,
            },
            '& .MuiSlider-rail': {
              height: 4,
              opacity: 0.3,
            },
          }}
        />
        
        {/* Date range labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {format(minDate, 'MMM d, yyyy')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {format(maxDate, 'MMM d, yyyy')}
          </Typography>
        </Box>
      </Box>

      {/* Navigation Controls */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: isMobile ? 0.5 : 1,
      }}>
        {/* Fast backward */}
        <Tooltip title="Previous week">
          <span>
            <IconButton
              onClick={handlePreviousWeek}
              disabled={isAtStart || isLoading}
              size={isMobile ? 'small' : 'medium'}
            >
              <FastRewind />
            </IconButton>
          </span>
        </Tooltip>

        {/* Previous day */}
        <Tooltip title="Previous day">
          <span>
            <IconButton
              onClick={handlePreviousDay}
              disabled={isAtStart || isLoading}
              size={isMobile ? 'small' : 'medium'}
            >
              <SkipPrevious />
            </IconButton>
          </span>
        </Tooltip>

        {/* Play/Pause */}
        <Tooltip title={isPlaying ? 'Pause playback' : 'Start playback'}>
          <span>
            <IconButton
              onClick={handlePlayPause}
              disabled={isAtEnd || isLoading}
              size="large"
              sx={{
                backgroundColor: isPlaying ? 'error.main' : 'primary.main',
                color: 'white',
                mx: 1,
                '&:hover': {
                  backgroundColor: isPlaying ? 'error.dark' : 'primary.dark',
                },
                '&:disabled': {
                  backgroundColor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </span>
        </Tooltip>

        {/* Next day */}
        <Tooltip title="Next day">
          <span>
            <IconButton
              onClick={handleNextDay}
              disabled={isAtEnd || isLoading}
              size={isMobile ? 'small' : 'medium'}
            >
              <SkipNext />
            </IconButton>
          </span>
        </Tooltip>

        {/* Fast forward */}
        <Tooltip title="Next week">
          <span>
            <IconButton
              onClick={handleNextWeek}
              disabled={isAtEnd || isLoading}
              size={isMobile ? 'small' : 'medium'}
            >
              <FastForward />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Playback Status */}
      <Fade in={isPlaying}>
        <Box sx={{ 
          textAlign: 'center', 
          mt: 1,
          p: 1,
          backgroundColor: 'action.hover',
          borderRadius: 1,
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Playing historical timeline...
          </Typography>
        </Box>
      </Fade>
    </Paper>
  );
};