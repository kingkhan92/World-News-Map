import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { HistoricalNavigation } from '../HistoricalNavigation';
import { addDays, subDays } from 'date-fns';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock timers for testing auto-play functionality
jest.useFakeTimers();

describe('HistoricalNavigation', () => {
  const mockOnDateChange = jest.fn();
  const mockOnPlaybackChange = jest.fn();
  const testDate = new Date('2024-01-15');
  const minDate = subDays(testDate, 10);
  const maxDate = addDays(testDate, 10);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders current date and navigation controls', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    expect(screen.getByText('Monday, January 15, 2024')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
    expect(screen.getByLabelText('Next day')).toBeInTheDocument();
    expect(screen.getByLabelText('Start playback')).toBeInTheDocument();
  });

  it('shows timeline slider with correct position', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '10'); // Middle of 21-day range
  });

  it('navigates to previous day when previous button is clicked', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    fireEvent.click(screen.getByLabelText('Previous day'));

    expect(mockOnDateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        getTime: expect.any(Function),
      })
    );
  });

  it('navigates to next day when next button is clicked', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    fireEvent.click(screen.getByLabelText('Next day'));

    expect(mockOnDateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        getTime: expect.any(Function),
      })
    );
  });

  it('navigates by week when fast forward/rewind buttons are clicked', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    fireEvent.click(screen.getByLabelText('Previous week'));
    expect(mockOnDateChange).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Next week'));
    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it('handles slider changes', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '5' } });

    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it('starts and stops playback', async () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        onPlaybackChange={mockOnPlaybackChange}
        minDate={minDate}
        maxDate={maxDate}
        playbackSpeed={100}
      />
    );

    const playButton = screen.getByLabelText('Start playback');
    fireEvent.click(playButton);

    expect(mockOnPlaybackChange).toHaveBeenCalledWith(true);
    expect(screen.getByLabelText('Pause playback')).toBeInTheDocument();

    // Advance timer to trigger auto-play
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockOnDateChange).toHaveBeenCalled();

    // Stop playback
    const pauseButton = screen.getByLabelText('Pause playback');
    fireEvent.click(pauseButton);

    expect(mockOnPlaybackChange).toHaveBeenCalledWith(false);
  });

  it('disables navigation at boundaries', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={minDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    const prevButton = screen.getByLabelText('Previous day');
    const prevWeekButton = screen.getByLabelText('Previous week');

    expect(prevButton).toBeDisabled();
    expect(prevWeekButton).toBeDisabled();
  });

  it('stops playback when reaching the end', async () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={maxDate}
        onDateChange={mockOnDateChange}
        onPlaybackChange={mockOnPlaybackChange}
        minDate={minDate}
        maxDate={maxDate}
        autoPlay={true}
        playbackSpeed={100}
      />
    );

    // Should not start playing if already at the end
    const playButton = screen.getByLabelText('Start playback');
    expect(playButton).toBeDisabled();
  });

  it('shows loading state', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
        isLoading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // All controls should be disabled during loading
    expect(screen.getByLabelText('Previous day')).toBeDisabled();
    expect(screen.getByLabelText('Next day')).toBeDisabled();
    expect(screen.getByLabelText('Start playback')).toBeDisabled();
  });

  it('displays correct day count information', () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    expect(screen.getByText('Day 11 of 21')).toBeInTheDocument();
  });

  it('shows playback status when playing', async () => {
    renderWithTheme(
      <HistoricalNavigation
        currentDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
        autoPlay={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Playing historical timeline...')).toBeInTheDocument();
    });
  });
});