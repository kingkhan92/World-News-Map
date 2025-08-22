import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Typography,
  Chip,
  TextField,
  Switch,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { UserPreferences } from '@shared/types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const availableNewsSources = [
  'BBC News',
  'CNN',
  'Reuters',
  'Associated Press',
  'The Guardian',
  'NPR',
  'Al Jazeera',
  'Deutsche Welle',
  'France 24',
  'RT',
  'Fox News',
  'MSNBC',
  'The New York Times',
  'The Washington Post',
  'Wall Street Journal'
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const { preferences, updatePreferences, loading, error } = useUserPreferences();
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(preferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newSource, setNewSource] = useState('');

  // Update local preferences when context preferences change
  React.useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      await updatePreferences(localPreferences);
      onClose();
    } catch (err) {
      setSaveError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalPreferences(preferences);
    setSaveError(null);
    onClose();
  };

  const handleDefaultViewChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPreferences({
      ...localPreferences,
      defaultView: event.target.value as 'map' | 'globe'
    });
  };

  const handleBiasThresholdChange = (_: Event, value: number | number[]) => {
    setLocalPreferences({
      ...localPreferences,
      biasThreshold: value as number
    });
  };

  const handleAutoRefreshChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPreferences({
      ...localPreferences,
      autoRefresh: event.target.checked
    });
  };

  const handleAddSource = () => {
    if (newSource.trim() && !localPreferences.preferredSources.includes(newSource.trim())) {
      setLocalPreferences({
        ...localPreferences,
        preferredSources: [...localPreferences.preferredSources, newSource.trim()]
      });
      setNewSource('');
    }
  };

  const handleRemoveSource = (sourceToRemove: string) => {
    setLocalPreferences({
      ...localPreferences,
      preferredSources: localPreferences.preferredSources.filter(source => source !== sourceToRemove)
    });
  };

  const handleQuickAddSource = (source: string) => {
    if (!localPreferences.preferredSources.includes(source)) {
      setLocalPreferences({
        ...localPreferences,
        preferredSources: [...localPreferences.preferredSources, source]
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>User Preferences</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          {/* Default View Setting */}
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Default Map View</FormLabel>
            <RadioGroup
              value={localPreferences.defaultView}
              onChange={handleDefaultViewChange}
              row
            >
              <FormControlLabel value="map" control={<Radio />} label="2D Map" />
              <FormControlLabel value="globe" control={<Radio />} label="3D Globe" />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* Bias Threshold Setting */}
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Bias Threshold: {localPreferences.biasThreshold}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Articles with bias scores above this threshold will be highlighted
            </Typography>
            <Slider
              value={localPreferences.biasThreshold}
              onChange={handleBiasThresholdChange}
              min={0}
              max={100}
              step={5}
              marks={[
                { value: 0, label: '0' },
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 75, label: '75' },
                { value: 100, label: '100' }
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Auto Refresh Setting */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={localPreferences.autoRefresh}
                  onChange={handleAutoRefreshChange}
                />
              }
              label="Auto-refresh news data"
            />
            <Typography variant="body2" color="text.secondary">
              Automatically fetch new articles when available
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Preferred Sources Setting */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Preferred News Sources
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select your preferred news sources to prioritize in the feed
            </Typography>

            {/* Current preferred sources */}
            <Box sx={{ mb: 2 }}>
              {localPreferences.preferredSources.map((source) => (
                <Chip
                  key={source}
                  label={source}
                  onDelete={() => handleRemoveSource(source)}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
              {localPreferences.preferredSources.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No preferred sources selected
                </Typography>
              )}
            </Box>

            {/* Add custom source */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Add custom source"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSource();
                  }
                }}
              />
              <Button onClick={handleAddSource} variant="outlined" size="small">
                Add
              </Button>
            </Box>

            {/* Quick add popular sources */}
            <Typography variant="body2" sx={{ mb: 1 }}>
              Quick add popular sources:
            </Typography>
            <Box>
              {availableNewsSources
                .filter(source => !localPreferences.preferredSources.includes(source))
                .slice(0, 8)
                .map((source) => (
                  <Chip
                    key={source}
                    label={source}
                    onClick={() => handleQuickAddSource(source)}
                    variant="outlined"
                    sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                  />
                ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};