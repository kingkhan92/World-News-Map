import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Button,
  TextField,
  Grid,
  Divider,
} from '@mui/material';
import { MapBounds } from '../../types/map';

// Predefined regions with their bounds
const PREDEFINED_REGIONS = {
  'North America': {
    north: 71.5,
    south: 7.0,
    east: -52.0,
    west: -168.0,
  },
  'South America': {
    north: 13.0,
    south: -56.0,
    east: -34.0,
    west: -82.0,
  },
  'Europe': {
    north: 71.0,
    south: 35.0,
    east: 40.0,
    west: -25.0,
  },
  'Africa': {
    north: 37.0,
    south: -35.0,
    east: 52.0,
    west: -18.0,
  },
  'Asia': {
    north: 81.0,
    south: -11.0,
    east: 180.0,
    west: 26.0,
  },
  'Oceania': {
    north: -10.0,
    south: -47.0,
    east: 180.0,
    west: 110.0,
  },
  'Middle East': {
    north: 42.0,
    south: 12.0,
    east: 63.0,
    west: 26.0,
  },
};

interface GeographicFilterProps {
  selectedRegion?: MapBounds;
  onRegionChange: (region?: MapBounds) => void;
  disabled?: boolean;
}

export const GeographicFilter: React.FC<GeographicFilterProps> = ({
  selectedRegion,
  onRegionChange,
  disabled = false,
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [customBounds, setCustomBounds] = useState<Partial<MapBounds>>({
    north: undefined,
    south: undefined,
    east: undefined,
    west: undefined,
  });

  // Find which predefined region matches the current selection
  const getSelectedRegionName = useCallback(() => {
    if (!selectedRegion) return '';
    
    for (const [name, bounds] of Object.entries(PREDEFINED_REGIONS)) {
      if (
        Math.abs(bounds.north - selectedRegion.north) < 0.1 &&
        Math.abs(bounds.south - selectedRegion.south) < 0.1 &&
        Math.abs(bounds.east - selectedRegion.east) < 0.1 &&
        Math.abs(bounds.west - selectedRegion.west) < 0.1
      ) {
        return name;
      }
    }
    return 'Custom';
  }, [selectedRegion]);

  const handlePredefinedRegionChange = useCallback((event: SelectChangeEvent<string>) => {
    const regionName = event.target.value;
    
    if (regionName === '') {
      onRegionChange(undefined);
      setCustomMode(false);
    } else if (regionName === 'Custom') {
      setCustomMode(true);
      if (selectedRegion) {
        setCustomBounds(selectedRegion);
      }
    } else {
      const bounds = PREDEFINED_REGIONS[regionName as keyof typeof PREDEFINED_REGIONS];
      onRegionChange(bounds);
      setCustomMode(false);
    }
  }, [onRegionChange, selectedRegion]);

  const handleCustomBoundsChange = useCallback((field: keyof MapBounds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setCustomBounds(prev => ({
        ...prev,
        [field]: numValue,
      }));
    }
  }, []);

  const applyCustomBounds = useCallback(() => {
    const { north, south, east, west } = customBounds;
    if (north !== undefined && south !== undefined && east !== undefined && west !== undefined) {
      // Validate bounds
      if (north > south && east > west) {
        onRegionChange({ north, south, east, west });
      }
    }
  }, [customBounds, onRegionChange]);

  const clearRegion = useCallback(() => {
    onRegionChange(undefined);
    setCustomMode(false);
    setCustomBounds({
      north: undefined,
      south: undefined,
      east: undefined,
      west: undefined,
    });
  }, [onRegionChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Predefined Regions */}
      <FormControl fullWidth size="small">
        <InputLabel>Geographic Region</InputLabel>
        <Select
          value={getSelectedRegionName()}
          onChange={handlePredefinedRegionChange}
          input={<OutlinedInput label="Geographic Region" />}
          disabled={disabled}
        >
          <MenuItem value="">
            <em>All Regions</em>
          </MenuItem>
          {Object.keys(PREDEFINED_REGIONS).map((region) => (
            <MenuItem key={region} value={region}>
              {region}
            </MenuItem>
          ))}
          <MenuItem value="Custom">Custom Bounds</MenuItem>
        </Select>
      </FormControl>

      {/* Custom Bounds Input */}
      {customMode && (
        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Custom Geographic Bounds
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <TextField
                label="North"
                type="number"
                size="small"
                fullWidth
                value={customBounds.north || ''}
                onChange={(e) => handleCustomBoundsChange('north', e.target.value)}
                inputProps={{ step: 0.1, min: -90, max: 90 }}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="South"
                type="number"
                size="small"
                fullWidth
                value={customBounds.south || ''}
                onChange={(e) => handleCustomBoundsChange('south', e.target.value)}
                inputProps={{ step: 0.1, min: -90, max: 90 }}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="East"
                type="number"
                size="small"
                fullWidth
                value={customBounds.east || ''}
                onChange={(e) => handleCustomBoundsChange('east', e.target.value)}
                inputProps={{ step: 0.1, min: -180, max: 180 }}
                disabled={disabled}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="West"
                type="number"
                size="small"
                fullWidth
                value={customBounds.west || ''}
                onChange={(e) => handleCustomBoundsChange('west', e.target.value)}
                inputProps={{ step: 0.1, min: -180, max: 180 }}
                disabled={disabled}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={applyCustomBounds}
              disabled={disabled}
            >
              Apply Bounds
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={() => setCustomMode(false)}
              disabled={disabled}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {/* Current Selection Display */}
      {selectedRegion && (
        <Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={getSelectedRegionName() || 'Custom Region'}
              onDelete={clearRegion}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            N: {selectedRegion.north.toFixed(1)}°, S: {selectedRegion.south.toFixed(1)}°, 
            E: {selectedRegion.east.toFixed(1)}°, W: {selectedRegion.west.toFixed(1)}°
          </Typography>
        </Box>
      )}
    </Box>
  );
};