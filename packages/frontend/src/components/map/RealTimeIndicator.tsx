import React, { useState, useEffect } from 'react'
import {
  Box,
  Chip,
  Fade,
  Typography,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  Notifications as NotificationIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { Article } from '../../types/Article'

interface RecentUpdate {
  id: string
  type: 'new' | 'updated' | 'deleted'
  article: Article
  timestamp: number
}

interface RealTimeIndicatorProps {
  maxRecentUpdates?: number
  showRecentUpdates?: boolean
}

export const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  maxRecentUpdates = 5,
  showRecentUpdates = true,
}) => {
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [newUpdateCount, setNewUpdateCount] = useState(0)

  const { isConnected, connectionError } = useRealTimeUpdates({
    onNewsUpdate: (data) => {
      const update: RecentUpdate = {
        id: `${data.article.id}-${data.timestamp}`,
        type: data.type,
        article: data.article,
        timestamp: data.timestamp,
      }

      setRecentUpdates(prev => {
        const updated = [update, ...prev].slice(0, maxRecentUpdates)
        return updated
      })

      setNewUpdateCount(prev => prev + 1)

      // Auto-hide new update count after 5 seconds
      setTimeout(() => {
        setNewUpdateCount(0)
      }, 5000)
    },
    autoConnect: true,
  })

  const handleToggleDetails = () => {
    setShowDetails(!showDetails)
    if (!showDetails) {
      setNewUpdateCount(0) // Clear count when opening details
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleString()
  }

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'new': return 'success'
      case 'updated': return 'info'
      case 'deleted': return 'error'
      default: return 'default'
    }
  }

  const getUpdateTypeLabel = (type: string) => {
    switch (type) {
      case 'new': return 'New'
      case 'updated': return 'Updated'
      case 'deleted': return 'Removed'
      default: return type
    }
  }

  if (!isConnected && !connectionError) {
    return null // Don't show anything if not connected and no error
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 1000,
        maxWidth: 350,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: isConnected ? 'success.main' : 'error.main',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            icon={<NotificationIcon />}
            label={isConnected ? 'Live Updates' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
          
          {newUpdateCount > 0 && (
            <Fade in={true}>
              <Chip
                label={`${newUpdateCount} new`}
                color="primary"
                size="small"
                variant="outlined"
              />
            </Fade>
          )}

          {showRecentUpdates && recentUpdates.length > 0 && (
            <IconButton
              size="small"
              onClick={handleToggleDetails}
              sx={{ ml: 'auto' }}
            >
              {showDetails ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </Box>

        {connectionError && (
          <Typography variant="caption" color="error" display="block">
            {connectionError}
          </Typography>
        )}

        {showRecentUpdates && (
          <Collapse in={showDetails}>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Recent Updates
              </Typography>
              
              {recentUpdates.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  No recent updates
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {recentUpdates.map((update) => (
                    <Box
                      key={update.id}
                      sx={{
                        p: 1,
                        mb: 1,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={getUpdateTypeLabel(update.type)}
                          color={getUpdateTypeColor(update.type) as any}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(update.timestamp)}
                        </Typography>
                      </Box>
                      
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {update.article.title}
                      </Typography>
                      
                      {update.article.source && (
                        <Typography variant="caption" color="text.secondary">
                          {update.article.source}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        )}
      </Paper>
    </Box>
  )
}

export default RealTimeIndicator