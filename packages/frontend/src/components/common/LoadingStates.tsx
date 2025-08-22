import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Card,
  CardContent,
  Stack,
  Fade,
  Backdrop
} from '@mui/material';
import { keyframes } from '@mui/system';

// Pulse animation for loading elements
const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 40,
  color = 'primary',
  fullScreen = false
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999
        })
      }}
    >
      <CircularProgress size={size} color={color} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );

  if (fullScreen) {
    return (
      <Backdrop open sx={{ color: '#fff', zIndex: 9999 }}>
        {content}
      </Backdrop>
    );
  }

  return content;
};

interface ProgressBarProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showPercentage = true,
  color = 'primary'
}) => {
  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {message && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {message}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        {showPercentage && (
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface PulsingDotsProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const PulsingDots: React.FC<PulsingDotsProps> = ({
  size = 'medium',
  color = 'primary.main'
}) => {
  const dotSize = size === 'small' ? 6 : size === 'large' ? 12 : 8;
  
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            bgcolor: color,
            animation: `${pulse} 1.4s ease-in-out ${index * 0.16}s infinite both`
          }}
        />
      ))}
    </Box>
  );
};

interface SkeletonLoaderProps {
  type: 'article' | 'map' | 'list' | 'card' | 'text';
  count?: number;
  height?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type,
  count = 1,
  height
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'article':
        return (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={120} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width={100} />
              </Box>
            </CardContent>
          </Card>
        );

      case 'map':
        return (
          <Box sx={{ position: 'relative', height: height || 400 }}>
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              sx={{ borderRadius: 1 }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                gap: 1
              }}
            >
              <Skeleton variant="rectangular" width={80} height={32} />
              <Skeleton variant="rectangular" width={60} height={32} />
            </Box>
          </Box>
        );

      case 'list':
        return (
          <Stack spacing={1}>
            {Array.from({ length: count }).map((_, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              </Box>
            ))}
          </Stack>
        );

      case 'card':
        return (
          <Card>
            <Skeleton variant="rectangular" height={140} />
            <CardContent>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
            </CardContent>
          </Card>
        );

      case 'text':
        return (
          <Box>
            {Array.from({ length: count }).map((_, index) => (
              <Skeleton
                key={index}
                variant="text"
                width={`${Math.random() * 40 + 60}%`}
                height={height}
              />
            ))}
          </Box>
        );

      default:
        return <Skeleton variant="rectangular" height={height || 100} />;
    }
  };

  return (
    <Fade in timeout={300}>
      <Box>
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ mb: type === 'article' ? 0 : 2 }}>
            {renderSkeleton()}
          </Box>
        ))}
      </Box>
    </Fade>
  );
};

interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  children,
  message = 'Loading...',
  blur = true
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          ...(loading && blur && {
            filter: 'blur(2px)',
            pointerEvents: 'none'
          })
        }}
      >
        {children}
      </Box>
      
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1
          }}
        >
          <LoadingSpinner message={message} />
        </Box>
      )}
    </Box>
  );
};

interface InlineLoadingProps {
  loading: boolean;
  size?: number;
  message?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  loading,
  size = 20,
  message
}) => {
  if (!loading) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default {
  LoadingSpinner,
  ProgressBar,
  PulsingDots,
  SkeletonLoader,
  LoadingOverlay,
  InlineLoading
};