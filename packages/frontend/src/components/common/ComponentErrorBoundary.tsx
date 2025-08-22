import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Lightweight error boundary for individual components
 * Shows a minimal error UI that doesn't break the page layout
 */
export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  componentName = 'Component',
  onError
}) => {
  const handleRetry = () => {
    window.location.reload();
  };

  const fallback = (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">
          {componentName} failed to load
        </Typography>
      </Alert>
      <Button
        size="small"
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={handleRetry}
      >
        Refresh
      </Button>
    </Box>
  );

  return (
    <ErrorBoundary
      level="component"
      fallback={fallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ComponentErrorBoundary;