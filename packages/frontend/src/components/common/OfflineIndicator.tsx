import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Popover,
  Paper,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Cloud as OnlineIcon,
  Sync as SyncIcon,
  Storage as CacheIcon,
  Delete as ClearIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useOfflineSupport } from '../../hooks/useOfflineSupport';

interface OfflineIndicatorProps {
  showDetails?: boolean;
  variant?: 'chip' | 'icon' | 'full';
  size?: 'small' | 'medium';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showDetails = false,
  variant = 'chip',
  size = 'medium'
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  
  const {
    isOnline,
    isOfflineMode,
    hasOfflineData,
    offlineData,
    enableOfflineMode,
    disableOfflineMode,
    syncWhenOnline,
    clearOfflineData
  } = useOfflineSupport();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showDetails) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggleOfflineMode = () => {
    if (isOfflineMode) {
      disableOfflineMode();
    } else {
      enableOfflineMode();
    }
  };

  const handleSync = async () => {
    await syncWhenOnline();
  };

  const handleClearCache = () => {
    clearOfflineData();
    handleClose();
  };

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <OfflineIcon />,
        label: hasOfflineData ? 'Offline (Cached)' : 'Offline',
        color: hasOfflineData ? 'warning' : 'error',
        description: hasOfflineData 
          ? 'Using cached data while offline'
          : 'No cached data available'
      };
    }
    
    if (isOfflineMode) {
      return {
        icon: <CacheIcon />,
        label: 'Offline Mode',
        color: 'info',
        description: 'Caching data for offline use'
      };
    }
    
    return {
      icon: <OnlineIcon />,
      label: 'Online',
      color: 'success',
      description: 'Connected and syncing'
    };
  };

  const statusInfo = getStatusInfo();
  const open = Boolean(anchorEl);

  const formatLastSync = (timestamp: string | undefined) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={`${statusInfo.label}: ${statusInfo.description}`}>
        <IconButton
          size={size}
          onClick={handleClick}
          color={statusInfo.color as any}
        >
          {statusInfo.icon}
        </IconButton>
      </Tooltip>
    );
  }

  if (variant === 'full') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ color: `${statusInfo.color}.main` }}>
          {statusInfo.icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {statusInfo.label}
        </Typography>
        {showDetails && (
          <IconButton size="small" onClick={handleClick}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  }

  // Default chip variant
  return (
    <>
      <Chip
        icon={statusInfo.icon}
        label={statusInfo.label}
        color={statusInfo.color as any}
        size={size}
        onClick={showDetails ? handleClick : undefined}
        clickable={showDetails}
      />
      
      {showDetails && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Paper sx={{ p: 2, minWidth: 300 }}>
            <Typography variant="h6" gutterBottom>
              Offline Support
            </Typography>
            
            <Alert 
              severity={isOnline ? 'success' : 'warning'} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {statusInfo.description}
              </Typography>
            </Alert>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isOfflineMode}
                    onChange={handleToggleOfflineMode}
                    disabled={!isOnline}
                  />
                }
                label="Enable offline mode"
              />
              
              {hasOfflineData && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Cached Data:
                  </Typography>
                  <Typography variant="body2">
                    • {offlineData?.articles?.length || 0} articles
                  </Typography>
                  <Typography variant="body2">
                    • Last sync: {formatLastSync(offlineData?.lastSync)}
                  </Typography>
                </Box>
              )}
              
              <Divider />
              
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={handleClose}>
                  Close
                </Button>
                
                {hasOfflineData && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClearCache}
                    color="error"
                  >
                    Clear Cache
                  </Button>
                )}
                
                {isOnline && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SyncIcon />}
                    onClick={handleSync}
                  >
                    Sync Now
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Popover>
      )}
    </>
  );
};

export default OfflineIndicator;