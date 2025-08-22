import React from 'react'
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Popover,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material'
import {
  Wifi as ConnectedIcon,
  WifiOff as DisconnectedIcon,
  Sync as ConnectingIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'

interface ConnectionStatusProps {
  showDetails?: boolean
  size?: 'small' | 'medium'
  variant?: 'chip' | 'icon' | 'full'
  onReconnect?: () => void
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  size = 'medium',
  variant = 'chip',
  onReconnect,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  
  const {
    isConnected,
    isConnecting,
    connectionError,
    lastPingTime,
    reconnect,
  } = useRealTimeUpdates({ autoConnect: false })

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (showDetails) {
      setAnchorEl(event.currentTarget)
    }
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleReconnect = async () => {
    try {
      await reconnect()
      onReconnect?.()
    } catch (error) {
      console.error('Manual reconnection failed:', error)
    }
    handleClose()
  }

  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        icon: <ConnectingIcon />,
        label: 'Connecting...',
        color: 'warning' as const,
        description: 'Establishing real-time connection'
      }
    }
    
    if (connectionError) {
      return {
        icon: <ErrorIcon />,
        label: 'Connection Error',
        color: 'error' as const,
        description: connectionError
      }
    }
    
    if (isConnected) {
      return {
        icon: <ConnectedIcon />,
        label: 'Live Updates',
        color: 'success' as const,
        description: 'Real-time updates active'
      }
    }
    
    return {
      icon: <DisconnectedIcon />,
      label: 'Offline',
      color: 'default' as const,
      description: 'Real-time updates unavailable'
    }
  }

  const statusInfo = getStatusInfo()
  const open = Boolean(anchorEl)

  const formatLastPing = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleString()
  }

  if (variant === 'icon') {
    return (
      <Tooltip title={`${statusInfo.label}: ${statusInfo.description}`}>
        <IconButton
          size={size}
          onClick={handleClick}
          color={statusInfo.color}
          sx={{
            animation: isConnecting ? 'spin 2s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        >
          {statusInfo.icon}
        </IconButton>
      </Tooltip>
    )
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
        <Box
          sx={{
            color: `${statusInfo.color}.main`,
            display: 'flex',
            alignItems: 'center',
            animation: isConnecting ? 'pulse 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
        >
          {statusInfo.icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {statusInfo.label}
        </Typography>
        {(connectionError || !isConnected) && (
          <IconButton
            size="small"
            onClick={handleReconnect}
            disabled={isConnecting}
            title="Reconnect"
          >
            {isConnecting ? (
              <CircularProgress size={16} />
            ) : (
              <RefreshIcon fontSize="small" />
            )}
          </IconButton>
        )}
      </Box>
    )
  }

  // Default chip variant
  return (
    <>
      <Chip
        icon={statusInfo.icon}
        label={statusInfo.label}
        color={statusInfo.color}
        size={size}
        onClick={showDetails ? handleClick : undefined}
        clickable={showDetails}
        sx={{
          '& .MuiChip-icon': {
            animation: isConnecting ? 'pulse 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          },
        }}
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
          <Paper sx={{ p: 2, minWidth: 250 }}>
            <Typography variant="h6" gutterBottom>
              Connection Status
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{statusInfo.label}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statusInfo.description}
              </Typography>
            </Box>
            
            {isConnected && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Last ping: {formatLastPing(lastPingTime)}
                </Typography>
              </Box>
            )}
            
            {connectionError && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="error.main">
                  Error: {connectionError}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={handleClose}>
                Close
              </Button>
              {(connectionError || !isConnected) && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleReconnect}
                  disabled={isConnecting}
                  startIcon={
                    isConnecting ? (
                      <CircularProgress size={16} />
                    ) : (
                      <RefreshIcon />
                    )
                  }
                >
                  Reconnect
                </Button>
              )}
            </Box>
          </Paper>
        </Popover>
      )}
    </>
  )
}

export default ConnectionStatus