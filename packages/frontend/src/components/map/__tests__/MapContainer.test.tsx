import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapContainer } from '../MapContainer';

// Mock the map components since they require Leaflet
jest.mock('../MapView', () => ({
  MapView: ({ loading }: { loading: boolean }) => (
    <div data-testid="map-view">
      {loading ? 'Loading map...' : 'Map loaded'}
    </div>
  ),
}));

jest.mock('../ArticleModal', () => ({
  ArticleModal: ({ open }: { open: boolean }) => (
    open ? <div data-testid="article-modal">Article Modal</div> : null
  ),
}));

// Mock the useMapData hook
jest.mock('../../hooks/useMapData', () => ({
  useMapData: () => ({
    pins: [],
    viewState: { center: [0, 0], zoom: 3 },
    isLoading: false,
    error: null,
    updateViewState: jest.fn(),
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MapContainer', () => {
  it('renders map view', () => {
    renderWithQueryClient(<MapContainer />);
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByText('Map loaded')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock loading state
    jest.doMock('../../hooks/useMapData', () => ({
      useMapData: () => ({
        pins: [],
        viewState: { center: [0, 0], zoom: 3 },
        isLoading: true,
        error: null,
        updateViewState: jest.fn(),
      }),
    }));

    renderWithQueryClient(<MapContainer />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('handles error callback', () => {
    const onError = jest.fn();
    renderWithQueryClient(<MapContainer onError={onError} />);
    
    // Component should render without errors
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });
});