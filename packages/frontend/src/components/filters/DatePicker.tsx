import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Popover,
  Grid,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  CalendarToday,
  ChevronLeft,
  ChevronRight,
  Today,
  DateRange,
} from '@mui/icons-material';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, isAfter } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

interface DatePickerProps {
  selectedDate: Date;
  selectedRange?: DateRange;
  onDateChange: (date: Date) => void;
  onRangeChange?: (range: DateRange) => void;
  mode?: 'single' | 'range';
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  showQuickSelects?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  selectedRange,
  onDateChange,
  onRangeChange,
  mode = 'single',
  minDate,
  maxDate = new Date(),
  disabled = false,
  showQuickSelects = true,
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [rangeStart, setRangeStart] = useState<Date | null>(selectedRange?.start || null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(selectedRange?.end || null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  const isOpen = Boolean(anchorEl);

  // Quick select options
  const quickSelects = [
    { label: 'Today', getValue: () => new Date() },
    { label: 'Yesterday', getValue: () => subDays(new Date(), 1) },
    { label: 'Last 7 days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
    { label: 'Last 30 days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
    { label: 'This month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  ];

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
      setCurrentMonth(selectedDate);
    }
  }, [disabled, selectedDate]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setIsSelectingRange(false);
    setRangeStart(null);
    setRangeEnd(null);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    if (mode === 'single') {
      onDateChange(date);
      handleClose();
    } else if (mode === 'range' && onRangeChange) {
      if (!isSelectingRange || !rangeStart) {
        // Start new range selection
        setRangeStart(date);
        setRangeEnd(null);
        setIsSelectingRange(true);
      } else {
        // Complete range selection
        const start = isBefore(date, rangeStart) ? date : rangeStart;
        const end = isBefore(date, rangeStart) ? rangeStart : date;
        
        setRangeEnd(end);
        onRangeChange({ start, end });
        
        // Close after a brief delay to show selection
        setTimeout(() => {
          handleClose();
        }, 200);
      }
    }
  }, [mode, onDateChange, onRangeChange, isSelectingRange, rangeStart, handleClose]);

  const handleQuickSelect = useCallback((quickSelect: typeof quickSelects[0]) => {
    const value = quickSelect.getValue();
    
    if (value instanceof Date) {
      onDateChange(value);
    } else if (onRangeChange) {
      onRangeChange(value);
    }
    
    handleClose();
  }, [onDateChange, onRangeChange, handleClose]);

  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subDays(startOfMonth(prev), 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addDays(endOfMonth(prev), 1));
  }, []);

  const handleToday = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today);
    onDateChange(today);
    handleClose();
  }, [onDateChange, handleClose]);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Check if date is in selected range
  const isInRange = useCallback((date: Date) => {
    if (mode === 'single') return false;
    
    const start = rangeStart || selectedRange?.start;
    const end = rangeEnd || selectedRange?.end;
    
    if (!start || !end) return false;
    
    return !isBefore(date, start) && !isAfter(date, end);
  }, [mode, rangeStart, rangeEnd, selectedRange]);

  // Check if date is range boundary
  const isRangeBoundary = useCallback((date: Date) => {
    if (mode === 'single') return false;
    
    const start = rangeStart || selectedRange?.start;
    const end = rangeEnd || selectedRange?.end;
    
    return (start && isSameDay(date, start)) || (end && isSameDay(date, end));
  }, [mode, rangeStart, rangeEnd, selectedRange]);

  // Check if date is disabled
  const isDateDisabled = useCallback((date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  }, [minDate, maxDate]);

  const formatDisplayDate = () => {
    if (mode === 'range' && selectedRange) {
      return `${format(selectedRange.start, 'MMM d')} - ${format(selectedRange.end, 'MMM d, yyyy')}`;
    }
    return format(selectedDate, 'MMM d, yyyy');
  };

  return (
    <Box className={className}>
      <Button
        variant="outlined"
        startIcon={mode === 'range' ? <DateRange /> : <CalendarToday />}
        onClick={handleOpen}
        disabled={disabled}
        sx={{
          minWidth: isMobile ? 140 : 180,
          justifyContent: 'flex-start',
          textTransform: 'none',
          color: 'text.primary',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        {formatDisplayDate()}
      </Button>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            p: 2,
            minWidth: isMobile ? 280 : 320,
            maxWidth: isMobile ? '90vw' : 400,
          },
        }}
      >
        <Box>
          {/* Quick Select Options */}
          {showQuickSelects && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Quick Select
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {quickSelects.map((option) => (
                  <Chip
                    key={option.label}
                    label={option.label}
                    size="small"
                    variant="outlined"
                    onClick={() => handleQuickSelect(option)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Calendar Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={handlePreviousMonth} size="small">
              <ChevronLeft />
            </IconButton>
            
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Go to today">
                <IconButton onClick={handleToday} size="small">
                  <Today />
                </IconButton>
              </Tooltip>
              <IconButton onClick={handleNextMonth} size="small">
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>

          {/* Calendar Grid */}
          <Grid container spacing={0} sx={{ mb: 1 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <Grid item xs key={day} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={0}>
            {calendarDays.map((date) => {
              const isSelected = mode === 'single' ? isSameDay(date, selectedDate) : isRangeBoundary(date);
              const isInSelectedRange = isInRange(date);
              const isDisabled = isDateDisabled(date);
              const isTodayDate = isToday(date);

              return (
                <Grid item xs key={date.toISOString()} sx={{ textAlign: 'center' }}>
                  <Button
                    onClick={() => handleDateClick(date)}
                    disabled={isDisabled}
                    sx={{
                      minWidth: 32,
                      height: 32,
                      p: 0,
                      borderRadius: 1,
                      fontSize: '0.875rem',
                      color: isSelected ? 'primary.contrastText' : 
                             isTodayDate ? 'primary.main' : 'text.primary',
                      backgroundColor: isSelected ? 'primary.main' : 
                                     isInSelectedRange ? 'primary.light' : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelected ? 'primary.dark' : 
                                       isInSelectedRange ? 'primary.main' : 'action.hover',
                        color: isSelected || isInSelectedRange ? 'primary.contrastText' : 'text.primary',
                      },
                      '&:disabled': {
                        color: 'text.disabled',
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    {format(date, 'd')}
                  </Button>
                </Grid>
              );
            })}
          </Grid>

          {/* Range Selection Info */}
          {mode === 'range' && isSelectingRange && rangeStart && (
            <Fade in>
              <Box sx={{ mt: 2, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Select end date for range starting {format(rangeStart, 'MMM d, yyyy')}
                </Typography>
              </Box>
            </Fade>
          )}
        </Box>
      </Popover>
    </Box>
  );
};