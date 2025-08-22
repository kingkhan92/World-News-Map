import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  History as HistoryIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { SettingsPanel } from './SettingsPanel';
import { UserHistory } from './UserHistory';

export const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              User Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your account settings and preferences
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Account Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {user?.email}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body1">
                    {user ? new Date().toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Current Preferences Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Preferences
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Default View
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {preferences.defaultView === 'map' ? '2D Map' : '3D Globe'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Bias Threshold
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {preferences.biasThreshold}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Auto Refresh
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {preferences.autoRefresh ? 'Enabled' : 'Disabled'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Preferred Sources
                  </Typography>
                  <Typography variant="body1">
                    {preferences.preferredSources.length > 0 
                      ? `${preferences.preferredSources.length} sources selected`
                      : 'No preferences set'
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Settings Actions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Settings & Preferences
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Customize your news viewing experience, set bias thresholds, 
                  and manage your preferred news sources.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => setSettingsOpen(true)}
                  fullWidth
                >
                  Open Settings
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Activity History */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Activity History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  View your reading history, bookmarked articles, and sharing activity.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setHistoryOpen(true)}
                  fullWidth
                >
                  View History
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Settings Dialog */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* History Dialog */}
      <UserHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </Container>
  );
};