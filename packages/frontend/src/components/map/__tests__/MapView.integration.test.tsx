import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MapView } from '../MapView';
import { MapPin, MapViewState } from '../../../types/map';

// Mock Leaflet and related components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="leaflet-map-container" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" data-props={JSON.stringify(props)} />,
  useMap: () => ({
    setView: jest.fn(),
    getCenter: () => ({ lat: 0, lng: 0 }),
    getZoom: () => 3,
    getBounds: () => ({
      getNorth: () => 85,
      getSouth: () => -85,
      getEast: () => 180,
      getWest: () => -180,
    }),
    on: jest.fn(),
    off: jest.fn(),
    fitBounds: jest.fn(),
  }),
}));

jest.mock('../PinCluster', () => ({
  PinCluster: ({ pins, onPinClick }: { pins: MapPin[]; onPinClick: (pin: MapPin) => void }) => (
    <div data-testid="pin-cluster">
      {pins.map(pin => (
        <button
          key={pin.id}
          data-testid={`pin-${pin.id}`}
          onClick={() => onPinClick(pin)}
        >
          {pin.article.title}
        </button>
      ))}
    </div>
  ),
}));

const mockPins: MapPin[] = [
  {
    id: 1,
    latitude: 40.7128,
    longitude: -74.0060,
    article: {
      id: 1,
      title: 'New York Breaking News',
      summary: 'Important news from New York City',
      source: 'NY Times',
      biasScore: 25,
    },
  },
  {
    id: 2,
    latitude: 51.5074,
    longitude: -0.1278,
    article: {
      id: 2,
      title: 'London Weather Update',
      summary: 'Weather conditions in London',
      source: 'BBC',
      biasScore: 45,
    },
  },
  {
    id: 3,
    latitude: 35.6762,
    longitude: 139.6503,
    article: {
      id: 3,
      title: 'Tokyo Economic Report',
      summary: 'Economic developments in Tokyo',
      source: 'NHK',
      biasScore: 15,
    },
  },
];

const mockViewState: MapViewState = {
  center: [20, 0],
  zoom: 3,
  bounds: {
    north: 85,
    south: -85,
    east: 180,
    west: -180,
  },
};

describe('MapView Integration', () => {
  const mockOnViewStateChange = jest.fn();
  const mockOnPinClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders complete map with all components', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    // Check main map container
    expect(screen.getByTestId('leaflet-map-container')).toBeInTheDocument();
    
    // Check tile layer
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    
    // Check pin cluster
    expect(screen.getByTestId('pin-cluster')).toBeInTheDocument();
    
    // Check individual pins
    expect(screen.getByTestId('pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('pin-2')).toBeInTheDocument();
    expect(screen.getByTestId('pin-3')).toBeInTheDocument();
  });

  it('passes correct props to MapContainer', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    const mapContainer = screen.getByTestId('leaflet-map-container');
    const props = JSON.parse(mapContainer.getAttribute('data-props') || '{}');
    
    expect(props.center).toEqual([20, 0]);
    expect(props.zoom).toBe(3);
    expect(props.zoomControl).toBe(true);
    expect(props.scrollWheelZoom).toBe(true);
    expect(props.doubleClickZoom).toBe(true);
    expect(props.dragging).toBe(true);
    expect(props.worldCopyJump).toBe(true);
  });

  it('passes correct props to TileLayer', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    const tileLayer = screen.getByTestId('tile-layer');
    const props = JSON.parse(tileLayer.getAttribute('data-props') || '{}');
    
    expect(props.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(props.maxZoom).toBe(18);
    expect(props.minZoom).toBe(2);
    expect(props.attribution).toContain('OpenStreetMap');
  });

  it('handles pin clicks correctly', async () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    // Click on first pin
    fireEvent.click(screen.getByTestId('pin-1'));
    
    await waitFor(() => {
      expect(mockOnPinClick).toHaveBeenCalledWith(mockPins[0]);
    });

    // Click on second pin
    fireEvent.click(screen.getByTestId('pin-2'));
    
    await waitFor(() => {
      expect(mockOnPinClick).toHaveBeenCalledWith(mockPins[1]);
    });

    expect(mockOnPinClick).toHaveBeenCalledTimes(2);
  });

  it('displays loading state correctly', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
        loading={true}
      />
    );

    expect(screen.getByText('Loading map data...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('hides loading state when not loading', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
        loading={false}
      />
    );

    expect(screen.queryByText('Loading map data...')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('handles empty pins array gracefully', () => {
    render(
      <MapView
        pins={[]}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    expect(screen.getByTestId('leaflet-map-container')).toBeInTheDocument();
    expect(screen.getByTestId('pin-cluster')).toBeInTheDocument();
    expect(screen.queryByTestId(/pin-\d+/)).not.toBeInTheDocument();
  });

  it('handles view state changes', () => {
    const { rerender } = render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    const newViewState: MapViewState = {
      center: [40.7128, -74.0060],
      zoom: 10,
      bounds: {
        north: 45,
        south: 35,
        east: -70,
        west: -80,
      },
    };

    rerender(
      <MapView
        pins={mockPins}
        viewState={newViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    const mapContainer = screen.getByTestId('leaflet-map-container');
    const props = JSON.parse(mapContainer.getAttribute('data-props') || '{}');
    
    expect(props.center).toEqual([40.7128, -74.0060]);
    expect(props.zoom).toBe(10);
  });

  it('applies correct CSS classes and styling', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    const container = screen.getByTestId('leaflet-map-container').parentElement;
    expect(container).toHaveStyle({
      height: '100%',
      width: '100%',
      position: 'relative',
    });
  });
});