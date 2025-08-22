import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeographicFilter } from '../GeographicFilter';
import { MapBounds } from '../../../types/map';

describe('GeographicFilter', () => {
  const mockOnRegionChange = jest.fn();

  beforeEach(() => {
    mockOnRegionChange.mockClear();
  });

  it('renders without crashing', () => {
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
      />
    );
    
    expect(screen.getByLabelText('Geographic Region')).toBeInTheDocument();
  });

  it('shows "All Regions" as default selection', () => {
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
      />
    );
    
    expect(screen.getByDisplayValue('All Regions')).toBeInTheDocument();
  });

  it('allows selecting predefined regions', async () => {
    const user = userEvent.setup();
    
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
      />
    );
    
    // Open the select dropdown
    await user.click(screen.getByLabelText('Geographic Region'));
    
    // Select North America
    await user.click(screen.getByText('North America'));
    
    await waitFor(() => {
      expect(mockOnRegionChange).toHaveBeenCalledWith({
        north: 71.5,
        south: 7.0,
        east: -52.0,
        west: -168.0,
      });
    });
  });

  it('shows custom bounds input when Custom is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
      />
    );
    
    // Open the select dropdown
    await user.click(screen.getByLabelText('Geographic Region'));
    
    // Select Custom
    await user.click(screen.getByText('Custom Bounds'));
    
    await waitFor(() => {
      expect(screen.getByLabelText('North')).toBeInTheDocument();
      expect(screen.getByLabelText('South')).toBeInTheDocument();
      expect(screen.getByLabelText('East')).toBeInTheDocument();
      expect(screen.getByLabelText('West')).toBeInTheDocument();
    });
  });

  it('allows entering custom bounds', async () => {
    const user = userEvent.setup();
    
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
      />
    );
    
    // Open the select dropdown and select Custom
    await user.click(screen.getByLabelText('Geographic Region'));
    await user.click(screen.getByText('Custom Bounds'));
    
    // Enter custom bounds
    await user.type(screen.getByLabelText('North'), '50');
    await user.type(screen.getByLabelText('South'), '40');
    await user.type(screen.getByLabelText('East'), '10');
    await user.type(screen.getByLabelText('West'), '0');
    
    // Apply bounds
    await user.click(screen.getByText('Apply Bounds'));
    
    await waitFor(() => {
      expect(mockOnRegionChange).toHaveBeenCalledWith({
        north: 50,
        south: 40,
        east: 10,
        west: 0,
      });
    });
  });

  it('displays current selection with coordinates', () => {
    const selectedRegion: MapBounds = {
      north: 50,
      south: 40,
      east: 10,
      west: 0,
    };
    
    render(
      <GeographicFilter
        selectedRegion={selectedRegion}
        onRegionChange={mockOnRegionChange}
      />
    );
    
    expect(screen.getByText('Custom Region')).toBeInTheDocument();
    expect(screen.getByText(/N: 50.0°, S: 40.0°, E: 10.0°, W: 0.0°/)).toBeInTheDocument();
  });

  it('allows clearing the region selection', async () => {
    const user = userEvent.setup();
    const selectedRegion: MapBounds = {
      north: 50,
      south: 40,
      east: 10,
      west: 0,
    };
    
    render(
      <GeographicFilter
        selectedRegion={selectedRegion}
        onRegionChange={mockOnRegionChange}
      />
    );
    
    // Find and click the delete button on the chip
    const chip = screen.getByText('Custom Region');
    const deleteButton = chip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }
    
    await waitFor(() => {
      expect(mockOnRegionChange).toHaveBeenCalledWith(undefined);
    });
  });

  it('recognizes predefined regions', () => {
    const northAmericaBounds: MapBounds = {
      north: 71.5,
      south: 7.0,
      east: -52.0,
      west: -168.0,
    };
    
    render(
      <GeographicFilter
        selectedRegion={northAmericaBounds}
        onRegionChange={mockOnRegionChange}
      />
    );
    
    expect(screen.getByText('North America')).toBeInTheDocument();
  });

  it('disables inputs when disabled prop is true', () => {
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
        disabled={true}
      />
    );
    
    expect(screen.getByLabelText('Geographic Region')).toBeDisabled();
  });

  it('validates custom bounds before applying', async () => {
    const user = userEvent.setup();
    
    render(
      <GeographicFilter
        onRegionChange={mockOnRegionChange}
      />
    );
    
    // Open the select dropdown and select Custom
    await user.click(screen.getByLabelText('Geographic Region'));
    await user.click(screen.getByText('Custom Bounds'));
    
    // Enter invalid bounds (north < south)
    await user.type(screen.getByLabelText('North'), '40');
    await user.type(screen.getByLabelText('South'), '50');
    await user.type(screen.getByLabelText('East'), '10');
    await user.type(screen.getByLabelText('West'), '0');
    
    // Try to apply bounds
    await user.click(screen.getByText('Apply Bounds'));
    
    // Should not call onRegionChange with invalid bounds
    expect(mockOnRegionChange).not.toHaveBeenCalled();
  });
});