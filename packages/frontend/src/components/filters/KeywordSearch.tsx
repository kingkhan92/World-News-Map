import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
  Autocomplete,
  Paper,
} from '@mui/material';
import {
  Search,
  Clear,
  History,
} from '@mui/icons-material';

interface KeywordSearchProps {
  keywords: string;
  onKeywordsChange: (keywords: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showHistory?: boolean;
}

export const KeywordSearch: React.FC<KeywordSearchProps> = ({
  keywords,
  onKeywordsChange,
  disabled = false,
  placeholder = "Search news articles...",
  showHistory = true,
}) => {
  const [inputValue, setInputValue] = useState(keywords);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load search history from localStorage
  useEffect(() => {
    if (showHistory) {
      const saved = localStorage.getItem('newsmap-search-history');
      if (saved) {
        try {
          const history = JSON.parse(saved);
          setSearchHistory(Array.isArray(history) ? history.slice(0, 10) : []);
        } catch (error) {
          console.warn('Failed to load search history:', error);
        }
      }
    }
  }, [showHistory]);

  // Save search to history
  const saveToHistory = useCallback((searchTerm: string) => {
    if (!showHistory || !searchTerm.trim()) return;

    const trimmed = searchTerm.trim();
    const newHistory = [trimmed, ...searchHistory.filter(item => item !== trimmed)].slice(0, 10);
    
    setSearchHistory(newHistory);
    localStorage.setItem('newsmap-search-history', JSON.stringify(newHistory));
  }, [searchHistory, showHistory]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    const trimmed = inputValue.trim();
    onKeywordsChange(trimmed);
    if (trimmed) {
      saveToHistory(trimmed);
    }
    setShowSuggestions(false);
  }, [inputValue, onKeywordsChange, saveToHistory]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    // Auto-search as user types (debounced)
    const timeoutId = setTimeout(() => {
      onKeywordsChange(value.trim());
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [onKeywordsChange]);

  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // Clear search
  const handleClear = useCallback(() => {
    setInputValue('');
    onKeywordsChange('');
    setShowSuggestions(false);
  }, [onKeywordsChange]);

  // Handle history item selection
  const handleHistorySelect = useCallback((historyItem: string) => {
    setInputValue(historyItem);
    onKeywordsChange(historyItem);
    setShowSuggestions(false);
  }, [onKeywordsChange]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('newsmap-search-history');
  }, []);

  // Parse keywords into individual terms for display
  const keywordTerms = keywords.trim() ? keywords.split(/\s+/).filter(Boolean) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Search Input */}
      <TextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => setShowSuggestions(true)}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: inputValue && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                disabled={disabled}
                sx={{ color: 'text.secondary' }}
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Search History Suggestions */}
      {showHistory && showSuggestions && searchHistory.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto',
            mt: 0.5,
          }}
        >
          <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <History fontSize="small" />
                Recent Searches
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'primary.main', cursor: 'pointer' }}
                onClick={clearHistory}
              >
                Clear
              </Typography>
            </Box>
            {searchHistory.map((item, index) => (
              <Box
                key={index}
                sx={{
                  p: 0.5,
                  cursor: 'pointer',
                  borderRadius: 0.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => handleHistorySelect(item)}
              >
                <Typography variant="body2">{item}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Active Search Terms */}
      {keywordTerms.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
            Searching for:
          </Typography>
          {keywordTerms.map((term, index) => (
            <Chip
              key={index}
              label={term}
              size="small"
              variant="outlined"
              color="primary"
              onDelete={() => {
                const newTerms = keywordTerms.filter((_, i) => i !== index);
                const newKeywords = newTerms.join(' ');
                setInputValue(newKeywords);
                onKeywordsChange(newKeywords);
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

// Utility function to highlight search terms in text
export const highlightSearchTerms = (text: string, searchTerms: string): React.ReactNode => {
  if (!searchTerms.trim()) return text;

  const terms = searchTerms.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  // Create a regex that matches any of the search terms (case insensitive)
  const regex = new RegExp(`(${terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    const isMatch = terms.some(term => part.toLowerCase() === term.toLowerCase());
    return isMatch ? (
      <Box
        key={index}
        component="span"
        sx={{
          backgroundColor: 'warning.light',
          color: 'warning.contrastText',
          px: 0.25,
          borderRadius: 0.25,
          fontWeight: 'medium',
        }}
      >
        {part}
      </Box>
    ) : (
      part
    );
  });
};