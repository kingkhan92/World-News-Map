import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BiasFilter } from '../BiasFilter';

describe('BiasFilter', () => {
  const mockOnBiasRangeChange = jest.fn();

  beforeEach(() => {
    mockOnBiasRangeChange.mockClear();
  });

  it('renders without crashing', () => {
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    expect(screen.getByText('Bias Score Range: 0 - 100')).toBeInTheDocument();
  });

  it('displays current bias range', () => {
    render(
      <BiasFilter
        biasRange={[20, 80]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    expect(screen.getByText('Bias Score Range: 20 - 80')).toBeInTheDocument();
  });

  it('shows reset button when not full range', () => {
    render(
      <BiasFilter
        biasRange={[20, 80]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    expect(screen.getByTitle('Reset to full range')).toBeInTheDocument();
  });

  it('hides reset button when full range', () => {
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    expect(screen.queryByTitle('Reset to full range')).not.toBeInTheDocument();
  });

  it('calls onBiasRangeChange when slider is moved', async () => {
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    const slider = screen.getByRole('slider');
    
    // Simulate slider change
    fireEvent.change(slider, { target: { value: [10, 90] } });
    
    expect(mockOnBiasRangeChange).toHaveBeenCalledWith([10, 90]);
  });

  it('shows manual input when advanced mode is enabled', async () => {
    const user = userEvent.setup();
    
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    // Enable manual input
    await user.click(screen.getByLabelText('Manual Input'));
    
    await waitFor(() => {
      expect(screen.getByLabelText('Min Score')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Score')).toBeInTheDocument();
    });
  });

  it('allows manual input of bias range', async () => {
    const user = userEvent.setup();
    
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    // Enable manual input
    await user.click(screen.getByLabelText('Manual Input'));
    
    // Change min value
    const minInput = screen.getByLabelText('Min Score');
    await user.clear(minInput);
    await user.type(minInput, '20');
    
    expect(mockOnBiasRangeChange).toHaveBeenCalledWith([20, 100]);
  });

  it('validates manual input range', async () => {
    const user = userEvent.setup();
    
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    // Enable manual input
    await user.click(screen.getByLabelText('Manual Input'));
    
    // Try to set min higher than max
    const minInput = screen.getByLabelText('Min Score');
    await user.clear(minInput);
    await user.type(minInput, '80');
    
    // Should adjust max to match min
    expect(mockOnBiasRangeChange).toHaveBeenCalledWith([80, 100]);
  });

  it('displays preset buttons', () => {
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
        showPresets={true}
      />
    );
    
    expect(screen.getByText('Quick Presets:')).toBeInTheDocument();
    expect(screen.getByText('Highly Left')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Center')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Highly Right')).toBeInTheDocument();
  });

  it('allows selecting preset ranges', async () => {
    const user = userEvent.setup();
    
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
        showPresets={true}
      />
    );
    
    // Click on "Center" preset
    await user.click(screen.getByText('Center'));
    
    expect(mockOnBiasRangeChange).toHaveBeenCalledWith([46, 54]);
  });

  it('highlights selected preset', () => {
    render(
      <BiasFilter
        biasRange={[46, 54]} // Center range
        onBiasRangeChange={mockOnBiasRangeChange}
        showPresets={true}
      />
    );
    
    const centerChip = screen.getByText('Center');
    expect(centerChip).toHaveClass('MuiChip-filled');
  });

  it('shows current range description', () => {
    render(
      <BiasFilter
        biasRange={[46, 54]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    expect(screen.getByText('Current Selection: Center')).toBeInTheDocument();
  });

  it('shows custom range description for non-preset ranges', () => {
    render(
      <BiasFilter
        biasRange={[25, 75]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    expect(screen.getByText(/Current Selection:.*Left.*Center.*Right/)).toBeInTheDocument();
  });

  it('resets to full range when reset button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <BiasFilter
        biasRange={[20, 80]}
        onBiasRangeChange={mockOnBiasRangeChange}
      />
    );
    
    await user.click(screen.getByTitle('Reset to full range'));
    
    expect(mockOnBiasRangeChange).toHaveBeenCalledWith([0, 100]);
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
        disabled={true}
      />
    );
    
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('hides presets when showPresets is false', () => {
    render(
      <BiasFilter
        biasRange={[0, 100]}
        onBiasRangeChange={mockOnBiasRangeChange}
        showPresets={false}
      />
    );
    
    expect(screen.queryByText('Quick Presets:')).not.toBeInTheDocument();
  });
});