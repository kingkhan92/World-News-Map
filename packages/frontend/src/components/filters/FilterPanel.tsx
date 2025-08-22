import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Fade,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  ExpandMore,
  FilterList,
  Close,
  Refresh,
  Share,
  Clear,
} from '@mui/icons-material';
import { DatePicker, DateRange } from './DatePicker';
import { HistoricalNavigation } from './HistoricalNavigation';
import { GeographicFilter } from './GeographicFilter';
import { KeywordSearch } from './KeywordSearch';
import { BiasFilter } from './BiasFilter';
import { SourceFilter } from './SourceFilter';
import { FilterState } from '../../types/map';
import { updateUrlWithFilters, getFiltersFromUrl, clearFiltersFromUrl, generateShareableUrl } from '../../utils/urlFilters';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
  enableUrlPersistence?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  isLoading = false,
  isOpen = true,
  onToggle,
  className,
  enableUrlPersistence = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [showHistoricalNav, setShowHistoricalNav] = useState(false);

  // URL persistence
  useEffect(() => {
    if (enableUrlPersistence) {
      updateUrlWithFilters(filters, true);
    }
  }, [filters, enableUrlPersistence]);

  // Handle single date change
  const handleDateChange = useCallback((date: Date) => {
    onFiltersChange({
      dateRange: {
        start: date,
        end: date,
      },
    });
  }, [onFiltersChange]);

  // Handle date range change
  const handleRangeChange = useCallback((range: DateRange) => {
    onFiltersChange({
      dateRange: range,
    });
  }, [onFiltersChange]);

  // Toggle between single date and range mode
  const handleModeToggle = useCallback(() => {
    const newMode = dateMode === 'single' ? 'range' : 'single';
    setDateMode(newMode);
    
    if (newMode === 'single') {
      // When switching to single mode, use the end date of the range
      handleDateChange(filters.dateRange.end);
    }
  }, [dateMode, filters.dateRange.end, handleDateChange]);

  // Toggle historical navigation
  const handleHistoricalToggle = useCallback(() => {
    setShowHistoricalNav(!showHistoricalNav);
  }, [showHistoricalNav]);

  // Handle geographic region change
  const handleRegionChange = useCallback((region?: any) => {
    onFiltersChange({ region });
  }, [onFiltersChange]);

  // Handle keywords change
  const handleKeywordsChange = useCallback((keywords: string) => {
    onFiltersChange({ keywords });
  }, [onFiltersChange]);

  // Handle bias range change
  const handleBiasRangeChange = useCallback((biasRange: [number, number]) => {
    onFiltersChange({ biasRange });
  }, [onFiltersChange]);

  // Handle sources change
  const handleSourcesChange = useCallback((sources: string[]) => {
    onFiltersChange({ sources });
  }, [onFiltersChange]);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    const defaultFilters: Partial<FilterState> = {
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      sources: [],
      biasRange: [0, 100],
      keywords: '',
      region: undefined,
    };
    onFiltersChange(defaultFilters);
    if (enableUrlPersistence) {
      clearFiltersFromUrl();
    }
  }, [onFiltersChange, enableUrlPersistence]);

  // Share current filters
  const handleShareFilters = useCallback(async () => {
    const shareableUrl = generateShareableUrl(filters);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'News Map Filters',
          url: shareableUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareableUrl);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareableUrl);
    }
  }, [filters]);

  // Check if any non-default filters are applied
  const hasActiveFilters = 
    filters.keywords.trim() !== '' ||
    filters.sources.length > 0 ||
    filters.biasRange[0] !== 0 ||
    filters.biasRange[1] !== 100 ||
    filters.region !== undefined;

  if (!isOpen) {
    return (
      <Box className={className}>
        <IconButton
          onClick={onToggle}
          sx={{
            position: 'fixed',
            top: isMobile ? 16 : 24,
            left: isMobile ? 16 : 24,
            zIndex: 1000,
            backgroundColor: 'background.paper',
            boxShadow: theme.shadows[4],
            '&:hover': {
              backgroundColor: 'background.paper',
              boxShadow: theme.shadows[8],
            },
          }}
        >
          <FilterList />
        </IconButton>
      </Box>
    );
  }

  return (
    <Fade in={isOpen}>
      <Paper
        className={className}
        elevation={4}
        sx={{
          position: 'fixed',
          top: isMobile ? 16 : 24,
          left: isMobile ? 16 : 24,
          width: isMobile ? 'calc(100vw - 32px)' : 360,
          maxWidth: isMobile ? '100%' : 400,
          maxHeight: isMobile ? 'calc(100vh - 32px)' : 'calc(100vh - 48px)',
          zIndex: 1000,
          overflow: 'auto',
          backgroundColor: 'background.paper',
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Filters {hasActiveFilters && <Typography component="span" sx={{ color: 'primary.main' }}>•</Typography>}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {hasActiveFilters && (
              <Tooltip title="Clear all filters">
                <IconButton onClick={handleClearAllFilters} disabled={isLoading} size="small">
                  <Clear />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Share filters">
              <IconButton onClick={handleShareFilters} disabled={isLoading} size="small">
                <Share />
              </IconButton>
            </Tooltip>
            {onRefresh && (
              <Tooltip title="Refresh data">
                <IconButton onClick={onRefresh} disabled={isLoading} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            {onToggle && (
              <Tooltip title="Close filters">
                <IconButton onClick={onToggle} size="small">
                  <Close />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Date Filters */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Date & Time
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Date Mode Toggle */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 80 }}>
                  Mode:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography
                    variant="body2"
                    onClick={handleModeToggle}
                    sx={{
                      cursor: 'pointer',
                      color: dateMode === 'single' ? 'primary.main' : 'text.secondary',
                      textDecoration: dateMode === 'single' ? 'underline' : 'none',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Single Date
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    |
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={handleModeToggle}
                    sx={{
                      cursor: 'pointer',
                      color: dateMode === 'range' ? 'primary.main' : 'text.secondary',
                      textDecoration: dateMode === 'range' ? 'underline' : 'none',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Date Range
                  </Typography>
                </Box>
              </Box>

              {/* Date Picker */}
              <DatePicker
                selectedDate={filters.dateRange.end}
                selectedRange={dateMode === 'range' ? filters.dateRange : undefined}
                onDateChange={handleDateChange}
                onRangeChange={handleRangeChange}
                mode={dateMode}
                maxDate={new Date()}
                disabled={isLoading}
                showQuickSelects={true}
              />

              <Divider />

              {/* Historical Navigation Toggle */}
              <Box>
                <Typography
                  variant="body2"
                  onClick={handleHistoricalToggle}
                  sx={{
                    cursor: 'pointer',
                    color: showHistoricalNav ? 'primary.main' : 'text.secondary',
                    textDecoration: showHistoricalNav ? 'underline' : 'none',
                    '&:hover': { color: 'primary.main' },
                    mb: showHistoricalNav ? 2 : 0,
                  }}
                >
                  {showHistoricalNav ? 'Hide' : 'Show'} Historical Navigation
                </Typography>

                {/* Historical Navigation */}
                <Fade in={showHistoricalNav}>
                  <Box>
                    {showHistoricalNav && (
                      <HistoricalNavigation
                        currentDate={filters.dateRange.end}
                        onDateChange={handleDateChange}
                        isLoading={isLoading}
                        playbackSpeed={2000} // 2 seconds per day
                      />
                    )}
                  </Box>
                </Fade>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Search Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Search & Keywords
              {filters.keywords && <Typography component="span" sx={{ color: 'primary.main', ml: 1 }}>•</Typography>}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <KeywordSearch
              keywords={filters.keywords}
              onKeywordsChange={handleKeywordsChange}
              disabled={isLoading}
            />
          </AccordionDetails>
        </Accordion>

        {/* Geographic Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Geographic Region
              {filters.region && <Typography component="span" sx={{ color: 'primary.main', ml: 1 }}>•</Typography>}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <GeographicFilter
              selectedRegion={filters.region}
              onRegionChange={handleRegionChange}
              disabled={isLoading}
            />
          </AccordionDetails>
        </Accordion>

        {/* Source Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              News Sources
              {filters.sources.length > 0 && <Typography component="span" sx={{ color: 'primary.main', ml: 1 }}>•</Typography>}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <SourceFilter
              selectedSources={filters.sources}
              onSourcesChange={handleSourcesChange}
              disabled={isLoading}
            />
          </AccordionDetails>
        </Accordion>

        {/* Bias Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Bias Analysis
              {(filters.biasRange[0] !== 0 || filters.biasRange[1] !== 100) && <Typography component="span" sx={{ color: 'primary.main', ml: 1 }}>•</Typography>}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BiasFilter
              biasRange={filters.biasRange}
              onBiasRangeChange={handleBiasRangeChange}
              disabled={isLoading}
            />
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Fade>
  );
};