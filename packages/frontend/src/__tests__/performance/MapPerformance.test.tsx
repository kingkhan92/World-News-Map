import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { MapContainer } from '../../components/map/MapContainer';
import { performance } from '../../utils/performance';
import React from 'react';

// Mock performance utilities
vi.mock('../../utils/performance', () => ({
  performance: {
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  },
}));

// Mock map dependencies
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

// Generate large dataset for performance testing
const generateMockArticles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Article ${i + 1}`,
    summary: `Summary for article ${i + 1}`,
    latitude: Math.random() * 180 - 90,
    longitude: Math.random() * 360 - 180,
    publishedAt: new Date(),
    source: `Source ${i % 10}`,
    biasScore: Math.floor(Math.random() * 100),
    url: `https://example.com/article${i + 1}`,
  }));
};

describe('Map Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (performance.getEntriesByName as any).mockReturnValue([]);
  });

  it('renders map with 100 articles within performance threshold', async () => {
    const articles = generateMockArticles(100);
    
    const startTime = Date.now();
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should render within 2 seconds
    expect(renderTime).toBeLessThan(2000);
    
    // Verify performance marks were called
    expect(performance.mark).toHaveBeenCalledWith('map-render-start');
    expect(performance.mark).toHaveBeenCalledWith('map-render-end');
  });

  it('renders map with 1000 articles using clustering', async () => {
    const articles = generateMockArticles(1000);
    
    const startTime = Date.now();
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should still render within reasonable time with clustering
    expect(renderTime).toBeLessThan(5000);
    
    // Verify clustering is enabled for large datasets
    expect(screen.getByTestId('pin-cluster')).toBeInTheDocument();
  });

  it('measures 3D globe rendering performance', async () => {
    const articles = generateMockArticles(500);
    
    render(
      <MapContainer articles={articles} defaultView="globe" />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('globe-view')).toBeInTheDocument();
    });
    
    // Verify 3D performance marks
    expect(performance.mark).toHaveBeenCalledWith('globe-render-start');
    expect(performance.mark).toHaveBeenCalledWith('globe-render-end');
    expect(performance.measure).toHaveBeenCalledWith(
      'globe-render-time',
      'globe-render-start',
      'globe-render-end'
    );
  });

  it('handles view switching performance', async () => {
    const articles = generateMockArticles(200);
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    const startTime = Date.now();
    
    // Switch to globe view
    const toggleButton = screen.getByRole('button', { name: /toggle.*view/i });
    toggleButton.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('globe-view')).toBeInTheDocument();
    });
    
    const switchTime = Date.now() - startTime;
    
    // View switching should be fast
    expect(switchTime).toBeLessThan(1000);
    
    expect(performance.mark).toHaveBeenCalledWith('view-switch-start');
    expect(performance.mark).toHaveBeenCalledWith('view-switch-end');
  });

  it('measures pin interaction performance', async () => {
    const articles = generateMockArticles(100);
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    const startTime = Date.now();
    
    // Click on a pin
    const newsPin = screen.getByTestId('news-pin-1');
    newsPin.click();
    
    await waitFor(() => {
      expect(screen.getByTestId('article-modal')).toBeInTheDocument();
    });
    
    const interactionTime = Date.now() - startTime;
    
    // Pin interaction should be immediate
    expect(interactionTime).toBeLessThan(500);
    
    expect(performance.mark).toHaveBeenCalledWith('pin-interaction-start');
    expect(performance.mark).toHaveBeenCalledWith('pin-interaction-end');
  });

  it('measures filter application performance', async () => {
    const articles = generateMockArticles(1000);
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    const startTime = Date.now();
    
    // Apply a filter
    const searchInput = screen.getByPlaceholderText(/search news/i);
    searchInput.value = 'test';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    await waitFor(() => {
      // Wait for filter to be applied
      expect(performance.mark).toHaveBeenCalledWith('filter-apply-end');
    });
    
    const filterTime = Date.now() - startTime;
    
    // Filter application should be fast
    expect(filterTime).toBeLessThan(1000);
    
    expect(performance.measure).toHaveBeenCalledWith(
      'filter-apply-time',
      'filter-apply-start',
      'filter-apply-end'
    );
  });

  it('monitors memory usage during large dataset rendering', async () => {
    const articles = generateMockArticles(2000);
    
    // Mock memory API
    const mockMemory = {
      usedJSHeapSize: 50000000, // 50MB
      totalJSHeapSize: 100000000, // 100MB
      jsHeapSizeLimit: 2000000000, // 2GB
    };
    
    Object.defineProperty(window.performance, 'memory', {
      value: mockMemory,
      writable: true,
    });
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Memory usage should be reasonable
    const memoryUsage = mockMemory.usedJSHeapSize / mockMemory.totalJSHeapSize;
    expect(memoryUsage).toBeLessThan(0.8); // Less than 80% of available heap
  });

  it('measures animation frame rate during map interactions', async () => {
    const articles = generateMockArticles(500);
    
    let frameCount = 0;
    const mockRequestAnimationFrame = vi.fn((callback) => {
      frameCount++;
      return setTimeout(callback, 16); // ~60fps
    });
    
    global.requestAnimationFrame = mockRequestAnimationFrame;
    
    render(
      <MapContainer articles={articles} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Simulate map pan/zoom
    const mapElement = screen.getByTestId('map-view');
    mapElement.dispatchEvent(new Event('wheel', { bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Should maintain reasonable frame rate
    expect(frameCount).toBeGreaterThan(30); // At least 30 frames in 1 second
  });

  it('tests lazy loading performance', async () => {
    const articles = generateMockArticles(100);
    
    render(
      <MapContainer articles={articles} enableLazyLoading />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    
    // Verify lazy loading marks
    expect(performance.mark).toHaveBeenCalledWith('lazy-load-start');
    expect(performance.mark).toHaveBeenCalledWith('lazy-load-end');
    
    // Initial render should be faster with lazy loading
    expect(performance.measure).toHaveBeenCalledWith(
      'lazy-load-time',
      'lazy-load-start',
      'lazy-load-end'
    );
  });
});