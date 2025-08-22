import React from 'react';
import { render, screen } from '@testing-library/react';
import { PinCluster } from '../PinCluster';
import { MapPin } from '../../../types/map';

// Mock react-leaflet-cluster
jest.mock('react-leaflet-cluster', () => {
  return function MarkerClusterGroup({ children }: { children: React.ReactNode }) {
    return <div data-testid="marker-cluster-group">{children}</div>;
  };
});

jest.mock('../NewsPin', () => ({
  NewsPin: ({ pin, onClick }: { pin: MapPin; onClick: (pin: MapPin) => void }) => (
    <div 
      data-testid={`news-pin-${pin.id}`}
      onClick={() => onClick(pin)}
    >
      Pin: {pin.article.title}
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
      title: 'New York News',
      summary: 'News from New York',
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
      title: 'London News',
      summary: 'News from London',
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
      title: 'Tokyo News',
      summary: 'News from Tokyo',
      source: 'NHK',
      biasScore: 15,
    },
  },
];

describe('PinCluster', () => {
  const mockOnPinClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders marker cluster group', () => {
    render(<PinCluster pins={mockPins} onPinClick={mockOnPinClick} />);

    expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument();
  });

  it('renders all news pins', () => {
    render(<PinCluster pins={mockPins} onPinClick={mockOnPinClick} />);

    expect(screen.getByTestId('news-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('news-pin-2')).toBeInTheDocument();
    expect(screen.getByTestId('news-pin-3')).toBeInTheDocument();
  });

  it('displays correct pin content', () => {
    render(<PinCluster pins={mockPins} onPinClick={mockOnPinClick} />);

    expect(screen.getByText('Pin: New York News')).toBeInTheDocument();
    expect(screen.getByText('Pin: London News')).toBeInTheDocument();
    expect(screen.getByText('Pin: Tokyo News')).toBeInTheDocument();
  });

  it('handles empty pins array', () => {
    render(<PinCluster pins={[]} onPinClick={mockOnPinClick} />);

    expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument();
    expect(screen.queryByTestId(/news-pin-/)).not.toBeInTheDocument();
  });

  it('passes onPinClick to NewsPin components', () => {
    render(<PinCluster pins={mockPins} onPinClick={mockOnPinClick} />);

    // The NewsPin mock should receive the onClick prop
    expect(screen.getByTestId('news-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('news-pin-2')).toBeInTheDocument();
    expect(screen.getByTestId('news-pin-3')).toBeInTheDocument();
  });

  it('handles single pin', () => {
    const singlePin = [mockPins[0]];
    render(<PinCluster pins={singlePin} onPinClick={mockOnPinClick} />);

    expect(screen.getByTestId('news-pin-1')).toBeInTheDocument();
    expect(screen.queryByTestId('news-pin-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('news-pin-3')).not.toBeInTheDocument();
  });

  it('generates unique keys for pins', () => {
    render(<PinCluster pins={mockPins} onPinClick={mockOnPinClick} />);

    // Each pin should have a unique testid based on its id
    expect(screen.getByTestId('news-pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('news-pin-2')).toBeInTheDocument();
    expect(screen.getByTestId('news-pin-3')).toBeInTheDocument();
  });
});