import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapView } from '../MapView';
import { MapPin, MapViewState } from '../../../types/map';

// Mock Leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaflet-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
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
  }),
}));

jest.mock('../PinCluster', () => ({
  PinCluster: ({ pins }: { pins: MapPin[] }) => (
    <div data-testid="pin-cluster">
      {pins.length} pins
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
      title: 'Test Article 1',
      summary: 'Test summary 1',
      source: 'Test Source',
      biasScore: 25,
    },
  },
  {
    id: 2,
    latitude: 51.5074,
    longitude: -0.1278,
    article: {
      id: 2,
      title: 'Test Article 2',
      summary: 'Test summary 2',
      source: 'Test Source 2',
      biasScore: 75,
    },
  },
];

const mockViewState: MapViewState = {
  center: [0, 0],
  zoom: 3,
  bounds: {
    north: 85,
    south: -85,
    east: 180,
    west: -180,
  },
};

describe('MapView', () => {
  const mockOnViewStateChange = jest.fn();
  const mockOnPinClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders map container with correct structure', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    expect(screen.getByTestId('leaflet-map-container')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    expect(screen.getByTestId('pin-cluster')).toBeInTheDocument();
  });

  it('displays correct number of pins', () => {
    render(
      <MapView
        pins={mockPins}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    expect(screen.getByText('2 pins')).toBeInTheDocument();
  });

  it('shows loading overlay when loading', () => {
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
  });

  it('does not show loading overlay when not loading', () => {
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
  });

  it('handles empty pins array', () => {
    render(
      <MapView
        pins={[]}
        viewState={mockViewState}
        onViewStateChange={mockOnViewStateChange}
        onPinClick={mockOnPinClick}
      />
    );

    expect(screen.getByText('0 pins')).toBeInTheDocument();
  });
});