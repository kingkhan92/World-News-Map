import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { DatePicker } from '../DatePicker';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DatePicker Simple Test', () => {
  it('renders without crashing', () => {
    const mockOnDateChange = jest.fn();
    const testDate = new Date('2024-01-15');

    expect(() => {
      renderWithTheme(
        <DatePicker
          selectedDate={testDate}
          onDateChange={mockOnDateChange}
        />
      );
    }).not.toThrow();
  });
});