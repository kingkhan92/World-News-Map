import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Button,
  Collapse,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Clear,
  ExpandMore,
  ExpandLess,
  SelectAll,
  ClearAll,
} from '@mui/icons-material';
import { NewsService } from '../../services/newsService';

interface SourceFilterProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
  disabled?: boolean;
}

export const SourceFilter: React.FC<SourceFilterProps> = ({
  selectedSources,
  onSourcesChange,
  disabled = false,
}) => {
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [filteredSources, setFilteredSources] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Number of sources to show initially
  const INITIAL_SHOW_COUNT = 8;

  // Load available sources
  const loadSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sources = await NewsService.getSources();
      setAvailableSources(sources.sort());
      setFilteredSources(sources.sort());
    } catch (err) {
      console.error('Error loading sources:', err);
      setError('Failed to load news sources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load sources on mount
  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Filter sources based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSources(availableSources);
    } else {
      const filtered = availableSources.filter(source =>
        source.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSources(filtered);
    }
  }, [availableSources, searchTerm]);

  // Handle source selection
  const handleSourceToggle = useCallback((source: string) => {
    const isSelected = selectedSources.includes(source);
    
    if (isSelected) {
      onSourcesChange(selectedSources.filter(s => s !== source));
    } else {
      onSourcesChange([...selectedSources, source]);
    }
  }, [selectedSources, onSourcesChange]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Select all filtered sources
  const handleSelectAll = useCallback(() => {
    const newSources = [...new Set([...selectedSources, ...filteredSources])];
    onSourcesChange(newSources);
  }, [selectedSources, filteredSources, onSourcesChange]);

  // Clear all selected sources
  const handleClearAll = useCallback(() => {
    onSourcesChange([]);
  }, [onSourcesChange]);

  // Remove individual source
  const handleRemoveSource = useCallback((source: string) => {
    onSourcesChange(selectedSources.filter(s => s !== source));
  }, [selectedSources, onSourcesChange]);

  // Get sources to display
  const sourcesToShow = showAll ? filteredSources : filteredSources.slice(0, INITIAL_SHOW_COUNT);
  const hasMoreSources = filteredSources.length > INITIAL_SHOW_COUNT;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading news sources...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button size="small" onClick={loadSources}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Search Input */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search news sources..."
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchTerm && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClearSearch}
                disabled={disabled}
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SelectAll />}
          onClick={handleSelectAll}
          disabled={disabled || filteredSources.length === 0}
        >
          Select All
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ClearAll />}
          onClick={handleClearAll}
          disabled={disabled || selectedSources.length === 0}
        >
          Clear All
        </Button>
      </Box>

      {/* Selected Sources Display */}
      {selectedSources.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Selected Sources ({selectedSources.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedSources.map((source) => (
              <Chip
                key={source}
                label={source}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => handleRemoveSource(source)}
                disabled={disabled}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Source List */}
      <Box>
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          Available Sources ({filteredSources.length}):
        </Typography>
        
        {filteredSources.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {searchTerm ? 'No sources match your search.' : 'No sources available.'}
          </Typography>
        ) : (
          <>
            {sourcesToShow.map((source) => (
              <FormControlLabel
                key={source}
                control={
                  <Checkbox
                    checked={selectedSources.includes(source)}
                    onChange={() => handleSourceToggle(source)}
                    size="small"
                    disabled={disabled}
                  />
                }
                label={
                  <Typography variant="body2">
                    {source}
                  </Typography>
                }
                sx={{ 
                  display: 'flex',
                  width: '100%',
                  ml: 0,
                  '& .MuiFormControlLabel-label': {
                    flex: 1,
                  },
                }}
              />
            ))}
            
            {/* Show More/Less Button */}
            {hasMoreSources && (
              <Button
                size="small"
                variant="text"
                startIcon={showAll ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowAll(!showAll)}
                sx={{ mt: 1 }}
              >
                {showAll 
                  ? 'Show Less' 
                  : `Show ${filteredSources.length - INITIAL_SHOW_COUNT} More`
                }
              </Button>
            )}
          </>
        )}
      </Box>

      {/* Summary */}
      <Box sx={{ 
        p: 1, 
        backgroundColor: 'background.default', 
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {selectedSources.length === 0 
            ? 'All sources selected (no filter applied)'
            : `Filtering by ${selectedSources.length} of ${availableSources.length} sources`
          }
        </Typography>
      </Box>
    </Box>
  );
};