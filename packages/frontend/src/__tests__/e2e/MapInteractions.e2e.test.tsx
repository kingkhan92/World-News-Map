import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { MapPage } from '../../pages/MapPage';
import React from 'react';

// Mock all external dependencies
vi.mock('../../services/newsService', () => ({
  newsService: {
    getArticles: vi.fn(),
    getArticleById: vi.fn(),
  },
}));

vi.mock('../../services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isConnected: vi.fn(() => true),
  },
}));

vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn(),
    on: vi.fn(),
  })),
  icon: vi.fn(),
  divIcon: vi.fn(),
}));

vi.mock('three', () => ({
  Scene: vi.fn(() => ({})),
  PerspectiveCamera: vi.fn(() => ({})),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas'),
  })),
  SphereGeometry: vi.fn(() => ({})),
  MeshBasicMaterial: vi.fn(() => ({})),
  Mesh: vi.fn(() => ({})),
  TextureLoader: vi.fn(() => ({
    load: vi.fn(),
  })),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  preferences: {
    defaultView: 'map' as const,
    preferredSources: ['bbc'],
    biasThreshold: 50,
    autoRefresh: true,
  },
};

const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  loading: false,
  error: null,
};

const mockArticles = [
  {
    id: 1,
    title: 'Breaking News: Climate Summit',
    summary: 'World leaders gather for climate discussions',
    latitude: 40.7128,
    longitude: -74.0060,
    publishedAt: new Date('2023-01-01'),
    source: 'BBC',
    biasScore: 45,
    url: 'https://example.com/article1',
  },
  {
    id: 2,
    title: 'Economic Update',
    summary: 'Markets show positive trends',
    latitude: 51.5074,
    longitude: -0.1278,
    publishedAt: new Date('2023-01-01'),
    source: 'Reuters',
    biasScore: 55,
    url: 'https://example.com/article2',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Map Interactions E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { newsService } = require('../../services/newsService');
    newsService.getArticles.mockResolvedValue(mockArticles);
  });

  it('loads map with news pins', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Verify news service was called
    const { newsService } = require('../../services/newsService');
    expect(newsService.getArticles).toHaveBeenCalled();
  });

  it('toggles between 2D map and 3D globe views', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Find and click the view toggle button
    const toggleButton = screen.getByRole('button', { name: /toggle.*view/i });
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('globe-view')).toBeInTheDocument();
    });
    
    // Toggle back to map view
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('map-view')).toBeInTheDocument();
    });
  });

  it('opens article modal when pin is clicked', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Simulate clicking on a news pin
    const newsPin = screen.getByTestId('news-pin-1');
    fireEvent.click(newsPin);
    
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeInTheDocument();
      expect(screen.getByText('Breaking News: Climate Summit')).toBeInTheDocument();
    });
  });

  it('filters articles by date', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Open date picker
    const datePickerButton = screen.getByRole('button', { name: /select date/i });
    fireEvent.click(datePickerButton);
    
    // Select a different date
    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '2023-01-02' } });
    
    await waitFor(() => {
      const { newsService } = require('../../services/newsService');
      expect(newsService.getArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(Date),
        })
      );
    });
  });

  it('filters articles by geographic region', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Open geographic filter
    const geoFilterButton = screen.getByRole('button', { name: /geographic filter/i });
    fireEvent.click(geoFilterButton);
    
    // Select a region
    const regionSelect = screen.getByLabelText(/region/i);
    fireEvent.change(regionSelect, { target: { value: 'north-america' } });
    
    await waitFor(() => {
      const { newsService } = require('../../services/newsService');
      expect(newsService.getArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          bounds: expect.any(Object),
        })
      );
    });
  });

  it('searches articles by keyword', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Use keyword search
    const searchInput = screen.getByPlaceholderText(/search news/i);
    fireEvent.change(searchInput, { target: { value: 'climate' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      const { newsService } = require('../../services/newsService');
      expect(newsService.getArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: 'climate',
        })
      );
    });
  });

  it('filters articles by bias score', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Open bias filter
    const biasFilterButton = screen.getByRole('button', { name: /bias filter/i });
    fireEvent.click(biasFilterButton);
    
    // Adjust bias range
    const biasSlider = screen.getByRole('slider', { name: /bias range/i });
    fireEvent.change(biasSlider, { target: { value: '30,70' } });
    
    await waitFor(() => {
      const { newsService } = require('../../services/newsService');
      expect(newsService.getArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          biasRange: { min: 30, max: 70 },
        })
      );
    });
  });

  it('displays article preview on pin hover', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Hover over a news pin
    const newsPin = screen.getByTestId('news-pin-1');
    fireEvent.mouseEnter(newsPin);
    
    await waitFor(() => {
      expect(screen.getByTestId('article-preview')).toBeInTheDocument();
      expect(screen.getByText('Breaking News: Climate Summit')).toBeInTheDocument();
    });
    
    // Mouse leave should hide preview
    fireEvent.mouseLeave(newsPin);
    
    await waitFor(() => {
      expect(screen.queryByTestId('article-preview')).not.toBeInTheDocument();
    });
  });

  it('shows bias indicator for articles', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Click on a news pin to open modal
    const newsPin = screen.getByTestId('news-pin-1');
    fireEvent.click(newsPin);
    
    await waitFor(() => {
      expect(screen.getByTestId('bias-indicator')).toBeInTheDocument();
      expect(screen.getByText(/bias score.*45/i)).toBeInTheDocument();
    });
  });

  it('handles real-time updates', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Simulate real-time update
    const { socketService } = require('../../services/socketService');
    const onCallback = socketService.on.mock.calls.find(call => call[0] === 'news-update')?.[1];
    
    if (onCallback) {
      const newArticle = {
        id: 3,
        title: 'Breaking: New Development',
        latitude: 48.8566,
        longitude: 2.3522,
        publishedAt: new Date(),
        source: 'CNN',
        biasScore: 60,
      };
      
      onCallback(newArticle);
      
      await waitFor(() => {
        expect(screen.getByTestId('news-pin-3')).toBeInTheDocument();
      });
    }
  });

  it('maintains filter state in URL', async () => {
    render(<MapPage />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Apply a keyword filter
    const searchInput = screen.getByPlaceholderText(/search news/i);
    fireEvent.change(searchInput, { target: { value: 'climate' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(window.location.search).toContain('keywords=climate');
    });
  });
});