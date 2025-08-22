import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  TextField,
  Grid,
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Info,
  Refresh,
} from '@mui/icons-material';

// Bias score ranges and their meanings
const BIAS_RANGES = {
  'Highly Left': [0, 20],
  'Left': [21, 40],
  'Center-Left': [41, 45],
  'Center': [46, 54],
  'Center-Right': [55, 59],
  'Right': [60, 79],
  'Highly Right': [80, 100],
} as const;

const BIAS_COLORS = {
  'Highly Left': '#1976d2',
  'Left': '#42a5f5',
  'Center-Left': '#81c784',
  'Center': '#66bb6a',
  'Center-Right': '#ffb74d',
  'Right': '#ff8a65',
  'Highly Right': '#f44336',
};

interface BiasFilterProps {
  biasRange: [number, number];
  onBiasRangeChange: (range: [number, number]) => void;
  disabled?: boolean;
  showPresets?: boolean;
}

export const BiasFilter: React.FC<BiasFilterProps> = ({
  biasRange,
  onBiasRangeChange,
  disabled = false,
  showPresets = true,
}) => {
  const [localRange, setLocalRange] = useState<[number, number]>(biasRange);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local range when prop changes
  useEffect(() => {
    setLocalRange(biasRange);
  }, [biasRange]);

  // Handle slider change
  const handleSliderChange = useCallback((_event: Event, newValue: number | number[]) => {
    const range = newValue as [number, number];
    setLocalRange(range);
  }, []);

  // Handle slider change committed (when user releases)
  const handleSliderChangeCommitted = useCallback((_event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const range = newValue as [number, number];
    onBiasRangeChange(range);
  }, [onBiasRangeChange]);

  // Handle manual input change
  const handleManualChange = useCallback((index: 0 | 1, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      const newRange: [number, number] = [...localRange];
      newRange[index] = numValue;
      
      // Ensure min <= max
      if (index === 0 && numValue > newRange[1]) {
        newRange[1] = numValue;
      } else if (index === 1 && numValue < newRange[0]) {
        newRange[0] = numValue;
      }
      
      setLocalRange(newRange);
      onBiasRangeChange(newRange);
    }
  }, [localRange, onBiasRangeChange]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: keyof typeof BIAS_RANGES) => {
    const range = BIAS_RANGES[preset] as [number, number];
    setLocalRange(range);
    onBiasRangeChange(range);
  }, [onBiasRangeChange]);

  // Reset to full range
  const handleReset = useCallback(() => {
    const fullRange: [number, number] = [0, 100];
    setLocalRange(fullRange);
    onBiasRangeChange(fullRange);
  }, [onBiasRangeChange]);

  // Get current range description
  const getCurrentRangeDescription = useCallback(() => {
    const [min, max] = localRange;
    
    // Check if it matches a preset exactly
    for (const [name, range] of Object.entries(BIAS_RANGES)) {
      if (range[0] === min && range[1] === max) {
        return name;
      }
    }
    
    // Find which categories the range spans
    const categories = [];
    for (const [name, range] of Object.entries(BIAS_RANGES)) {
      if (!(max < range[0] || min > range[1])) {
        categories.push(name);
      }
    }
    
    return categories.length > 0 ? categories.join(', ') : 'Custom Range';
  }, [localRange]);

  // Check if current range is the full range
  const isFullRange = localRange[0] === 0 && localRange[1] === 100;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Info Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Bias Score Range: {localRange[0]} - {localRange[1]}
        </Typography>
        <Tooltip title="Bias scores range from 0 (highly left-leaning) to 100 (highly right-leaning), with 50 being neutral">
          <IconButton size="small">
            <Info fontSize="small" />
          </IconButton>
        </Tooltip>
        {!isFullRange && (
          <Tooltip title="Reset to full range">
            <IconButton size="small" onClick={handleReset} disabled={disabled}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Range Slider */}
      <Box sx={{ px: 1 }}>
        <Slider
          value={localRange}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderChangeCommitted}
          valueLabelDisplay="auto"
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          sx={{
            '& .MuiSlider-track': {
              background: `linear-gradient(to right, ${BIAS_COLORS['Highly Left']}, ${BIAS_COLORS['Center']}, ${BIAS_COLORS['Highly Right']})`,
            },
          }}
        />
        
        {/* Scale Labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Left (0)
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Center (50)
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Right (100)
          </Typography>
        </Box>
      </Box>

      {/* Manual Input */}
      <FormControlLabel
        control={
          <Switch
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
            size="small"
          />
        }
        label="Manual Input"
        sx={{ alignSelf: 'flex-start' }}
      />

      {showAdvanced && (
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <TextField
              label="Min Score"
              type="number"
              size="small"
              fullWidth
              value={localRange[0]}
              onChange={(e) => handleManualChange(0, e.target.value)}
              inputProps={{ min: 0, max: 100, step: 1 }}
              disabled={disabled}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Max Score"
              type="number"
              size="small"
              fullWidth
              value={localRange[1]}
              onChange={(e) => handleManualChange(1, e.target.value)}
              inputProps={{ min: 0, max: 100, step: 1 }}
              disabled={disabled}
            />
          </Grid>
        </Grid>
      )}

      {/* Current Range Description */}
      <Paper variant="outlined" sx={{ p: 1, backgroundColor: 'background.default' }}>
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          Current Selection: {getCurrentRangeDescription()}
        </Typography>
      </Paper>

      {/* Preset Buttons */}
      {showPresets && (
        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Quick Presets:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(BIAS_RANGES).map(([name, range]) => {
              const isSelected = localRange[0] === range[0] && localRange[1] === range[1];
              return (
                <Chip
                  key={name}
                  label={name}
                  size="small"
                  variant={isSelected ? 'filled' : 'outlined'}
                  color={isSelected ? 'primary' : 'default'}
                  onClick={() => handlePresetSelect(name as keyof typeof BIAS_RANGES)}
                  disabled={disabled}
                  sx={{
                    borderColor: BIAS_COLORS[name as keyof typeof BIAS_COLORS],
                    color: isSelected ? undefined : BIAS_COLORS[name as keyof typeof BIAS_COLORS],
                    '&:hover': {
                      backgroundColor: isSelected ? undefined : `${BIAS_COLORS[name as keyof typeof BIAS_COLORS]}20`,
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};