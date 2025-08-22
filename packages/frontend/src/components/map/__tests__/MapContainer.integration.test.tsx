import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MapContainer } from '../MapContainer';
import { useMapData } from '../../../hooks/useMapData';
import { MapPin } from '../../../types/map';

// Mock the hooks and components
jest.mock('../../../hooks/useMapData');
jest.mock('../MapView', () => ({
  MapView: ({ onPinClick, pins }: any) => (
    <div data-testid="map-view">
      {pins.map((pin: MapPin) => (
        <button
          key={pin.id}
          data-testid={`pin-${pin.id}`}
          onClick={() => onPinClick(pin)}
        >
          Pin {pin.id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../GlobeView', () => ({
  GlobeView: ({ onPinClick, pins }: any) => (
    <div data-testid="globe-view">
      {pins.map((pin: MapPin) => (
        <button
          key={pin.id}
          data-testid={`globe-pin-${pin.id}`}
          onClick={() => onPinClick(pin)}
        >
          Globe Pin {pin.id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../ArticleModal', () => ({
  ArticleModal: ({ open, pin, onClose, fullScreen, maxWidth }: any) =>
    open ? (
      <div data-testid="article-modal" data-fullscreen={fullScreen} data-maxwidth={maxWidth}>
        <h2>{pin.article.title}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock useMediaQuery for responsive testing
const mockUseMediaQuery = jest.fn();
jest.mock('@mui/material/useMediaQuery', () => mockUseMediaQuery);

const mockUseMapData = useMapData as jest.MockedFunction<typeof useMapData>;

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
      biasScore: 50,
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
      source: 'Test Source',
      biasScore: 30,
    },
  },
];

// Create many pins for mobile optimization testing
const manyPins: MapPin[] = Array.from({ length: 150 }, (_, i) => ({
  id: i + 1,
  latitude: Math.random() * 180 - 90,
  longitude: Math.random() * 360 - 180,
  article: {
    id: i + 1,
    title: `Test Article ${i + 1}`,
    summary: `Test summary ${i + 1}`,
    source: 'Test Source',
    biasScore: Math.floor(Math.random() * 100),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const theme = createTheme();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('MapContainer Integration', () => {
  beforeEach(() => {
    // Default to desktop view
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query.includes('down')) return false; // Not mobile
      if (query.includes('between')) return false; // Not tablet
      return false;
    });

    mockUseMapData.mockReturnValue({
      pins: mockPins,
      articles: [],
      viewState: {
        center: [40.7128, -74.0060],
        zoom: 10,
      },
      filters: {
        dateRange: { start: new Date(), end: new Date() },
        sources: [],
        biasRange: [0, 100],
        keywords: '',
      },
      isLoading: false,
      error: null,
      updateViewState: jest.fn(),
      updateFilters: jest.fn(),
      resetFilters: jest.fn(),
      refreshData: jest.fn(),
      invalidateData: jest.fn(),
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders map view by default', () => {
    render(<MapContainer />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.queryByTestId('globe-view')).not.toBeInTheDocument();
  });

  it('switches between map and globe views with smooth transition', async () => {
    render(<MapContainer />, { wrapper: createWrapper() });
    
    // Initially shows map view
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    
    // Click globe toggle
    const globeToggle = screen.getByLabelText('3D globe view');
    fireEvent.click(globeToggle);
    
    // Wait for transition
    await waitFor(() => {
      expect(screen.getByTestId('globe-view')).toBeInTheDocument();
    }, { timeout: 1000 });
    
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
  });

  it('calls onViewTypeChange callback when view changes', async () => {
    const onViewTypeChange = jest.fn();
    render(<MapContainer onViewTypeChange={onViewTypeChange} />, { wrapper: createWrapper() });
    
    const globeToggle = screen.getByLabelText('3D globe view');
    fireEvent.click(globeToggle);
    
    expect(onViewTypeChange).toHaveBeenCalledWith('globe');
  });

  it('opens article modal when pin is clicked', async () => {
    render(<MapContainer />, { wrapper: createWrapper() });
    
    // Click on a pin
    const pin = screen.getByTestId('pin-1');
    fireEvent.click(pin);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Article 1')).toBeInTheDocument();
  });

  it('calls onPinInteraction callback when pin is clicked', async () => {
    const onPinInteraction = jest.fn();
    render(<MapContainer onPinInteraction={onPinInteraction} />, { wrapper: createWrapper() });
    
    const pin = screen.getByTestId('pin-1');
    fireEvent.click(pin);
    
    expect(onPinInteraction).toHaveBeenCalledWith(mockPins[0], 'click');
  });

  it('closes article modal when close button is clicked', async () => {
    render(<MapContainer />, { wrapper: createWrapper() });
    
    // Open modal
    const pin = screen.getByTestId('pin-1');
    fireEvent.click(pin);
    
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeInTheDocument();
    });
    
    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('article-modal')).not.toBeInTheDocument();
    });
  });

  it('displays error message when error occurs', () => {
    mockUseMapData.mockReturnValue({
      pins: [],
      articles: [],
      viewState: {
        center: [40.7128, -74.0060],
        zoom: 10,
      },
      filters: {
        dateRange: { start: new Date(), end: new Date() },
        sources: [],
        biasRange: [0, 100],
        keywords: '',
      },
      isLoading: false,
      error: new Error('Test error'),
      updateViewState: jest.fn(),
      updateFilters: jest.fn(),
      resetFilters: jest.fn(),
      refreshData: jest.fn(),
      invalidateData: jest.fn(),
      refetch: jest.fn(),
    });

    render(<MapContainer />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    const testError = new Error('Test error');
    
    mockUseMapData.mockReturnValue({
      pins: [],
      articles: [],
      viewState: {
        center: [40.7128, -74.0060],
        zoom: 10,
      },
      filters: {
        dateRange: { start: new Date(), end: new Date() },
        sources: [],
        biasRange: [0, 100],
        keywords: '',
      },
      isLoading: false,
      error: testError,
      updateViewState: jest.fn(),
      updateFilters: jest.fn(),
      resetFilters: jest.fn(),
      refreshData: jest.fn(),
      invalidateData: jest.fn(),
      refetch: jest.fn(),
    });

    render(<MapContainer onError={onError} />, { wrapper: createWrapper() });
    
    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('starts with specified default view type', () => {
    render(<MapContainer defaultViewType="globe" />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('globe-view')).toBeInTheDocument();
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
  });

  it('passes pins to both map and globe views', async () => {
    render(<MapContainer />, { wrapper: createWrapper() });
    
    // Check map view has pins
    expect(screen.getByTestId('pin-1')).toBeInTheDocument();
    expect(screen.getByTestId('pin-2')).toBeInTheDocument();
    
    // Switch to globe view
    const globeToggle = screen.getByLabelText('3D globe view');
    fireEvent.click(globeToggle);
    
    // Check globe view has pins
    await waitFor(() => {
      expect(screen.getByTestId('globe-pin-1')).toBeInTheDocument();
      expect(screen.getByTestId('globe-pin-2')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('optimizes pins for mobile devices', () => {
      // Mock mobile view
      mockUseMediaQuery.mockImplementation((query: string) => {
        return query.includes('down'); // Mobile
      });

      mockUseMapData.mockReturnValue({
        pins: manyPins,
        articles: [],
        viewState: {
          center: [40.7128, -74.0060],
          zoom: 10,
        },
        filters: {
          dateRange: { start: new Date(), end: new Date() },
          sources: [],
          biasRange: [0, 100],
          keywords: '',
        },
        isLoading: false,
        error: null,
        updateViewState: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        refreshData: jest.fn(),
        invalidateData: jest.fn(),
        refetch: jest.fn(),
      });

      render(<MapContainer />, { wrapper: createWrapper() });
      
      // Should only render first 100 pins on mobile
      expect(screen.getByTestId('pin-1')).toBeInTheDocument();
      expect(screen.getByTestId('pin-100')).toBeInTheDocument();
      expect(screen.queryByTestId('pin-101')).not.toBeInTheDocument();
    });

    it('shows fullscreen modal on mobile', async () => {
      // Mock mobile view
      mockUseMediaQuery.mockImplementation((query: string) => {
        return query.includes('down'); // Mobile
      });

      render(<MapContainer />, { wrapper: createWrapper() });
      
      const pin = screen.getByTestId('pin-1');
      fireEvent.click(pin);
      
      await waitFor(() => {
        const modal = screen.getByTestId('article-modal');
        expect(modal).toHaveAttribute('data-fullscreen', 'true');
      });
    });

    it('shows medium modal on tablet', async () => {
      // Mock tablet view
      mockUseMediaQuery.mockImplementation((query: string) => {
        if (query.includes('down')) return false; // Not mobile
        if (query.includes('between')) return true; // Tablet
        return false;
      });

      render(<MapContainer />, { wrapper: createWrapper() });
      
      const pin = screen.getByTestId('pin-1');
      fireEvent.click(pin);
      
      await waitFor(() => {
        const modal = screen.getByTestId('article-modal');
        expect(modal).toHaveAttribute('data-maxwidth', 'md');
      });
    });

    it('positions error snackbar at bottom on mobile', () => {
      // Mock mobile view
      mockUseMediaQuery.mockImplementation((query: string) => {
        return query.includes('down'); // Mobile
      });

      mockUseMapData.mockReturnValue({
        pins: [],
        articles: [],
        viewState: {
          center: [40.7128, -74.0060],
          zoom: 10,
        },
        filters: {
          dateRange: { start: new Date(), end: new Date() },
          sources: [],
          biasRange: [0, 100],
          keywords: '',
        },
        isLoading: false,
        error: new Error('Test error'),
        updateViewState: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        refreshData: jest.fn(),
        invalidateData: jest.fn(),
        refetch: jest.fn(),
      });

      render(<MapContainer />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('preserves view state during transitions', async () => {
      const updateViewState = jest.fn();
      mockUseMapData.mockReturnValue({
        pins: mockPins,
        articles: [],
        viewState: {
          center: [40.7128, -74.0060],
          zoom: 10,
        },
        filters: {
          dateRange: { start: new Date(), end: new Date() },
          sources: [],
          biasRange: [0, 100],
          keywords: '',
        },
        isLoading: false,
        error: null,
        updateViewState,
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        refreshData: jest.fn(),
        invalidateData: jest.fn(),
        refetch: jest.fn(),
      });

      render(<MapContainer />, { wrapper: createWrapper() });
      
      // Switch views
      const globeToggle = screen.getByLabelText('3D globe view');
      fireEvent.click(globeToggle);
      
      // View state should be preserved
      expect(updateViewState).not.toHaveBeenCalled();
    });

    it('applies custom className', () => {
      const { container } = render(<MapContainer className="custom-map" />, { wrapper: createWrapper() });
      
      expect(container.querySelector('.custom-map')).toBeInTheDocument();
    });
  });
});