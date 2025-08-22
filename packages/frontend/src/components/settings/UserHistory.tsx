import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  OpenInNew as OpenIcon
} from '@mui/icons-material';
import { UserService, UserHistory as UserHistoryType, UserInteraction } from '../../services/userService';

interface UserHistoryProps {
  open: boolean;
  onClose: () => void;
}

type HistoryFilter = 'all' | 'view' | 'bookmark' | 'share';

const getInteractionIcon = (type: string) => {
  switch (type) {
    case 'view':
      return <ViewIcon color="primary" />;
    case 'bookmark':
      return <BookmarkIcon color="secondary" />;
    case 'share':
      return <ShareIcon color="action" />;
    default:
      return <ViewIcon />;
  }
};

const getInteractionLabel = (type: string) => {
  switch (type) {
    case 'view':
      return 'Viewed';
    case 'bookmark':
      return 'Bookmarked';
    case 'share':
      return 'Shared';
    default:
      return type;
  }
};

export const UserHistory: React.FC<UserHistoryProps> = ({ open, onClose }) => {
  const [history, setHistory] = useState<UserHistoryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const loadHistory = async (page: number = 1, filterType?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let historyData: UserHistoryType;
      if (filterType === 'bookmark') {
        historyData = await UserService.getBookmarks(page, 20);
      } else {
        historyData = await UserService.getHistory(page, 20);
      }
      
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load user history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadHistory(1, filter === 'all' ? undefined : filter);
      setCurrentPage(1);
    }
  }, [open, filter]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    loadHistory(page, filter === 'all' ? undefined : filter);
  };

  const handleFilterChange = (_: React.SyntheticEvent, newValue: HistoryFilter) => {
    setFilter(newValue);
    setCurrentPage(1);
  };

  const handleOpenArticle = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Activity History</DialogTitle>
      <DialogContent>
        <Tabs value={filter} onChange={handleFilterChange} sx={{ mb: 2 }}>
          <Tab label="All Activity" value="all" />
          <Tab label="Views" value="view" />
          <Tab label="Bookmarks" value="bookmark" />
          <Tab label="Shares" value="share" />
        </Tabs>

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {history && !loading && (
          <>
            {history.history.length === 0 ? (
              <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                No activity found
              </Typography>
            ) : (
              <>
                <List>
                  {history.history.map((interaction: UserInteraction) => (
                    <ListItem key={`${interaction.id}-${interaction.timestamp}`} divider>
                      <ListItemIcon>
                        {getInteractionIcon(interaction.interactionType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {interaction.article_title || `Article ${interaction.articleId}`}
                            </Typography>
                            <Chip 
                              label={getInteractionLabel(interaction.interactionType)}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {new Date(interaction.timestamp).toLocaleString()}
                          </Typography>
                        }
                      />
                      {interaction.article_url && (
                        <IconButton
                          onClick={() => handleOpenArticle(interaction.article_url!)}
                          size="small"
                          title="Open article"
                        >
                          <OpenIcon />
                        </IconButton>
                      )}
                    </ListItem>
                  ))}
                </List>

                {history.pagination.totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={history.pagination.totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                    />
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
                  Showing {history.history.length} of {history.pagination.total} activities
                </Typography>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};