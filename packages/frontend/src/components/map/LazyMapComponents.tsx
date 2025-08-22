import React, { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy load heavy map components
const GlobeView = lazy(() => import('./GlobeView'));
const MapView = lazy(() => import('./MapView'));
const ArticleModal = lazy(() => import('./ArticleModal'));

// Loading fallback component
const MapLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading map...' }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    minHeight="400px"
    gap={2}
  >
    <CircularProgress size={48} />
    <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      {message}
    </Box>
  </Box>
);

// Lazy-loaded GlobeView with loading fallback
export const LazyGlobeView: React.FC<any> = (props) => (
  <Suspense fallback={<MapLoadingFallback message="Loading 3D globe..." />}>
    <GlobeView {...props} />
  </Suspense>
);

// Lazy-loaded MapView with loading fallback
export const LazyMapView: React.FC<any> = (props) => (
  <Suspense fallback={<MapLoadingFallback message="Loading map..." />}>
    <MapView {...props} />
  </Suspense>
);

// Lazy-loaded ArticleModal with loading fallback
export const LazyArticleModal: React.FC<any> = (props) => (
  <Suspense fallback={
    <Box display="flex" justifyContent="center" alignItems="center" p={3}>
      <CircularProgress size={24} />
    </Box>
  }>
    <ArticleModal {...props} />
  </Suspense>
);

// Preload components for better UX
export const preloadMapComponents = () => {
  // Preload components when user is likely to need them
  import('./GlobeView');
  import('./MapView');
  import('./ArticleModal');
};

// Hook to preload components on user interaction
export const useMapComponentPreloader = () => {
  const preloadOnHover = React.useCallback(() => {
    preloadMapComponents();
  }, []);

  const preloadOnFocus = React.useCallback(() => {
    preloadMapComponents();
  }, []);

  return {
    preloadOnHover,
    preloadOnFocus,
    preloadComponents: preloadMapComponents,
  };
};