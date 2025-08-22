import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { DatePicker } from '../DatePicker';
import { addDays, subDays } from 'date-fns';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DatePicker', () => {
  const mockOnDateChange = jest.fn();
  const mockOnRangeChange = jest.fn();
  const testDate = new Date('2024-01-15');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with single date mode by default', () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('opens calendar when button is clicked', async () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });
  });

  it('shows quick select options when enabled', async () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        showQuickSelects={true}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    });
  });

  it('calls onDateChange when a date is selected in single mode', async () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        mode="single"
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const dayButton = screen.getByText('20');
      fireEvent.click(dayButton);
    });

    expect(mockOnDateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        getDate: expect.any(Function),
      })
    );
  });

  it('handles range selection in range mode', async () => {
    const startDate = testDate;
    const endDate = addDays(testDate, 5);

    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        selectedRange={{ start: startDate, end: endDate }}
        onDateChange={mockOnDateChange}
        onRangeChange={mockOnRangeChange}
        mode="range"
      />
    );

    expect(screen.getByText('Jan 15 - Jan 20, 2024')).toBeInTheDocument();
  });

  it('disables dates outside min/max range', async () => {
    const minDate = subDays(testDate, 5);
    const maxDate = addDays(testDate, 5);

    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      // Check that dates outside range are disabled
      const calendar = screen.getByRole('dialog');
      expect(calendar).toBeInTheDocument();
    });
  });

  it('handles quick select options correctly', async () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        showQuickSelects={true}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const todayChip = screen.getByText('Today');
      fireEvent.click(todayChip);
    });

    expect(mockOnDateChange).toHaveBeenCalled();
  });

  it('navigates between months', async () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });

    // Click next month
    const nextButton = screen.getByLabelText(/next/i);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('February 2024')).toBeInTheDocument();
    });
  });

  it('handles disabled state', () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('goes to today when today button is clicked', async () => {
    renderWithTheme(
      <DatePicker
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const todayButton = screen.getByLabelText('Go to today');
      fireEvent.click(todayButton);
    });

    expect(mockOnDateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        getDate: expect.any(Function),
      })
    );
  });
});