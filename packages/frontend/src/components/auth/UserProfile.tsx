import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Divider,
  Avatar,
  IconButton,
} from '@mui/material';
import { Person, Save, Cancel } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { UserPreferences } from '../../types/api';
import { authService } from '../../services/authService';

export const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [preferences, setPreferences] = useState<UserPreferences>(
    user?.preferences || {
      defaultView: 'map',
      preferredSources: [],
      biasThreshold: 50,
      autoRefresh: true,
    }
  );

  // Available news sources
  const availableSources = [
    'BBC News',
    'CNN',
    'Reuters',
    'Associated Press',
    'The Guardian',
    'NPR',
    'Al Jazeera',
    'Deutsche Welle',
  ];

  // Handle preference changes
  const handlePreferenceChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  // Handle source toggle
  const handleSourceToggle = (source: string) => {
    const currentSources = preferences.preferredSources;
    const newSources = currentSources.includes(source)
      ? currentSources.filter(s => s !== source)
      : [...currentSources, source];
    
    handlePreferenceChange('preferredSources', newSources);
  };

  // Save preferences
  const handleSave = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const updatedUser = await authService.updatePreferences(preferences);
      updateUser(updatedUser);
      setIsEditing(false);
      setSuccess('Preferences updated successfully!');
    } catch (error: any) {
      setError(error.response?.data?.error?.message || 'Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setPreferences(user?.preferences || {
      defaultView: 'map',
      preferredSources: [],
      biasThreshold: 50,
      autoRefresh: true,
    });
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (!user) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          User information not available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
          <Person />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h2">
            User Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        {!isEditing && (
          <Button
            variant="outlined"
            onClick={() => setIsEditing(true)}
            startIcon={<Person />}
          >
            Edit Preferences
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Preferences */}
      <Typography variant="h6" gutterBottom>
        Map Preferences
      </Typography>

      {/* Default View */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Default View
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={preferences.defaultView === 'map' ? 'contained' : 'outlined'}
            onClick={() => handlePreferenceChange('defaultView', 'map')}
            disabled={!isEditing}
            size="small"
          >
            2D Map
          </Button>
          <Button
            variant={preferences.defaultView === 'globe' ? 'contained' : 'outlined'}
            onClick={() => handlePreferenceChange('defaultView', 'globe')}
            disabled={!isEditing}
            size="small"
          >
            3D Globe
          </Button>
        </Box>
      </Box>

      {/* Bias Threshold */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Bias Threshold: {preferences.biasThreshold}
        </Typography>
        <TextField
          type="range"
          min="0"
          max="100"
          value={preferences.biasThreshold}
          onChange={(e) => handlePreferenceChange('biasThreshold', parseInt(e.target.value))}
          disabled={!isEditing}
          fullWidth
          helperText="Articles with bias scores above this threshold will be highlighted"
        />
      </Box>

      {/* Auto Refresh */}
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={preferences.autoRefresh}
              onChange={(e) => handlePreferenceChange('autoRefresh', e.target.checked)}
              disabled={!isEditing}
            />
          }
          label="Auto-refresh news articles"
        />
      </Box>

      {/* Preferred Sources */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Preferred News Sources
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableSources.map((source) => (
            <Chip
              key={source}
              label={source}
              onClick={() => isEditing && handleSourceToggle(source)}
              color={preferences.preferredSources.includes(source) ? 'primary' : 'default'}
              variant={preferences.preferredSources.includes(source) ? 'filled' : 'outlined'}
              clickable={isEditing}
              disabled={!isEditing}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {preferences.preferredSources.length === 0 
            ? 'No sources selected - all sources will be shown'
            : `${preferences.preferredSources.length} source(s) selected`
          }
        </Typography>
      </Box>

      {/* Action Buttons */}
      {isEditing && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isLoading}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isLoading}
            startIcon={<Save />}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default UserProfile;