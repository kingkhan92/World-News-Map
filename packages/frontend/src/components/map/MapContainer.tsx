import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Snackbar, 
  Alert, 
  ToggleButton, 
  ToggleButtonGroup, 
  Fade,
  useTheme,
  useMediaQuery,
  Tooltip,
  Zoom,
  CircularProgress
} from '@mui/material';
import { Map as MapIcon, Public as GlobeIcon } from '@mui/icons-material';
import { LazyMapView, LazyGlobeView, LazyArticleModal, useMapComponentPreloader } from './LazyMapComponents';
import { RealTimeIndicator } from './RealTimeIndicator';
import { FilterPanel } from '../filters';
import { MapPin, MapViewType, MapViewState } from '../../types/map';
import { useMapData } from '../../hooks/useMapData';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import './MapContainer.css';

interface MapContainerProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  defaultViewType?: MapViewType;
  className?: string;
  onViewTypeChange?: (viewType: MapViewType) => void;
  onPinInteraction?: (pin: MapPin, action: 'click' | 'hover') => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  autoRefresh = false,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  onError,
  defaultViewType = 'map',
  className,
  onViewTypeChange,
  onPinInteraction,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Preload map components for better performance
  const { preloadOnHover, preloadComponents } = useMapComponentPreloader();
  
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [viewType, setViewType] = useState<MapViewType>(defaultViewType);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousViewState, setPreviousViewState] = useState<MapViewState | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    pins,
    viewState,
    filters,
    isLoading,
    error,
    updateViewState,
    updateFilters,
    refreshData,
  } = useMapData({
    autoRefresh,
    refreshInterval,
    enableUrlPersistence: true,
  });

  // Set up real-time updates
  const {
    isConnected,
    isConnecting,
    connectionError,
    subscribeToRegion,
    unsubscribeFromRegion,
  } = useRealTimeUpdates({
    onNewsUpdate: (data) => {
      console.log('New article received:', data.article.title);
      // The useMapData hook will automatically update via React Query cache
    },
    onConnectionStatusChange: (status) => {
      if (status.error && !status.connected) {
        setErrorMessage(`Real-time updates: ${status.error}`);
      }
    },
    autoConnect: true,
  });

  // Memoized pin data for performance optimization
  const optimizedPins = useMemo(() => {
    // On mobile, limit pins for better performance
    if (isMobile && pins.length > 100) {
      return pins.slice(0, 100);
    }
    return pins;
  }, [pins, isMobile]);

  // Handle pin click with interaction callback
  const handlePinClick = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
    onPinInteraction?.(pin, 'click');
  }, [onPinInteraction]);

  // Handle pin hover for additional interactions
  const handlePinHover = useCallback((pin: MapPin) => {
    onPinInteraction?.(pin, 'hover');
  }, [onPinInteraction]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setSelectedPin(null);
  }, []);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while loading map data';
      setErrorMessage(message);
      onError?.(error instanceof Error ? error : new Error(message));
    }
  }, [error, onError]);

  // Handle error snackbar close
  const handleErrorClose = useCallback(() => {
    setErrorMessage('');
  }, []);

  // Handle view type change with smooth transition and state preservation
  const handleViewTypeChange = useCallback((_: React.MouseEvent<HTMLElement>, newViewType: MapViewType | null) => {
    if (newViewType && newViewType !== viewType) {
      setIsTransitioning(true);
      
      // Store current view state for smooth transition
      setPreviousViewState(viewState);
      
      // Notify parent component
      onViewTypeChange?.(newViewType);
      
      // Add transition delay for smooth animation
      const transitionDelay = isMobile ? 100 : 200;
      setTimeout(() => {
        setViewType(newViewType);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }, transitionDelay);
    }
  }, [viewType, viewState, onViewTypeChange, isMobile]);

  // Enhanced view state management with transition support
  const handleViewStateChange = useCallback((newViewState: MapViewState) => {
    updateViewState(newViewState);
  }, [updateViewState]);

  // Handle filter panel toggle
  const handleFilterToggle = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Parameters<typeof updateFilters>[0]) => {
    updateFilters(newFilters);
  }, [updateFilters]);

  // Handle data refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [refreshData]);

  // Responsive view state adjustments
  useEffect(() => {
    if (isMobile && viewState.zoom > 10) {
      // Limit zoom on mobile for better performance
      updateViewState({
        ...viewState,
        zoom: Math.min(viewState.zoom, 8),
      });
    }
  }, [isMobile, viewState, updateViewState]);

  return (
    <Box 
      className={className}
      sx={{ 
        height: '100%', 
        width: '100%', 
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        isOpen={showFilters}
        onToggle={handleFilterToggle}
        enableUrlPersistence={true}
      />

      {/* View Toggle Controls - Responsive positioning */}
      <Zoom in={!isTransitioning} timeout={300}>
        <Box
          sx={{
            position: 'absolute',
            top: isMobile ? 8 : 16,
            right: isMobile ? 8 : 16,
            zIndex: 1000,
          }}
        >
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={handleViewTypeChange}
            aria-label="map view type"
            size={isMobile ? 'small' : 'medium'}
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              borderRadius: 2,
              boxShadow: theme.shadows[4],
              '& .MuiToggleButton-root': {
                border: 'none',
                minWidth: isMobile ? 40 : 48,
                minHeight: isMobile ? 40 : 48,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              },
            }}
          >
            <Tooltip title="2D Map View" placement="left">
              <ToggleButton 
                value="map" 
                aria-label="2D map view"
                onMouseEnter={preloadOnHover}
              >
                <MapIcon fontSize={isMobile ? 'small' : 'medium'} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="3D Globe View" placement="left">
              <ToggleButton 
                value="globe" 
                aria-label="3D globe view"
                onMouseEnter={preloadOnHover}
              >
                <GlobeIcon fontSize={isMobile ? 'small' : 'medium'} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>
      </Zoom>

      {/* Main Map Container with Enhanced Transitions */}
      <Paper 
        elevation={0} 
        sx={{ 
          height: '100%', 
          width: '100%',
          borderRadius: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Transition overlay for smooth view switching */}
        {isTransitioning && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={isMobile ? 32 : 48} />
          </Box>
        )}

        <Fade 
          in={!isTransitioning} 
          timeout={{ 
            enter: 400, 
            exit: 200 
          }}
          mountOnEnter
          unmountOnExit
        >
          <Box sx={{ height: '100%', width: '100%' }}>
            {viewType === 'map' ? (
              <LazyMapView
                pins={optimizedPins}
                viewState={viewState}
                onViewStateChange={handleViewStateChange}
                onPinClick={handlePinClick}
                loading={isLoading}
              />
            ) : (
              <LazyGlobeView
                pins={optimizedPins}
                viewState={viewState}
                onViewStateChange={handleViewStateChange}
                onPinClick={handlePinClick}
                loading={isLoading}
              />
            )}
          </Box>
        </Fade>
      </Paper>

      {/* Article Modal - Responsive sizing */}
      {selectedPin && (
        <LazyArticleModal
          pin={selectedPin}
          open={!!selectedPin}
          onClose={handleModalClose}
          fullScreen={isMobile}
          maxWidth={isTablet ? 'md' : 'lg'}
          searchKeywords={filters.keywords}
        />
      )}

      {/* Error Snackbar - Responsive positioning */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleErrorClose}
        anchorOrigin={{ 
          vertical: isMobile ? 'bottom' : 'top', 
          horizontal: 'center' 
        }}
        sx={{
          bottom: isMobile ? 16 : undefined,
          top: isMobile ? undefined : 16,
        }}
      >
        <Alert 
          onClose={handleErrorClose} 
          severity="error" 
          sx={{ 
            width: '100%',
            maxWidth: isMobile ? '90vw' : '400px',
          }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Real-time Updates Indicator */}
      <RealTimeIndicator showRecentUpdates={true} maxRecentUpdates={5} />
    </Box>
  );
};