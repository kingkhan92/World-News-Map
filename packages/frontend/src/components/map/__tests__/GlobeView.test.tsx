import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { GlobeView } from '../GlobeView';
import { MapPin, MapViewState } from '../../../types/map';

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    background: null,
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { z: 10 },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false, type: null },
  })),
  SphereGeometry: vi.fn(),
  ConeGeometry: vi.fn(),
  RingGeometry: vi.fn(),
  PlaneGeometry: vi.fn(),
  MeshPhongMaterial: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  Mesh: vi.fn(() => ({
    position: { copy: vi.fn() },
    lookAt: vi.fn(),
    rotateX: vi.fn(),
    userData: {},
    children: [],
    rotation: { y: 0 },
    scale: { set: vi.fn() },
  })),
  Group: vi.fn(() => ({
    add: vi.fn(),
    position: { copy: vi.fn() },
    lookAt: vi.fn(),
    userData: {},
    children: [],
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
  })),
  Vector3: vi.fn(() => ({
    copy: vi.fn(),
    normalize: vi.fn(() => ({ copy: vi.fn(), add: vi.fn() })),
    clone: vi.fn(() => ({ normalize: vi.fn(), add: vi.fn() })),
  })),
  Vector2: vi.fn(),
  Raycaster: vi.fn(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => []),
  })),
  Quaternion: vi.fn(() => ({
    setFromEuler: vi.fn(),
    multiplyQuaternions: vi.fn(),
  })),
  Euler: vi.fn(),
  Color: vi.fn(),
  BufferAttribute: vi.fn(),
  CanvasTexture: vi.fn(),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
  BackSide: 'BackSide',
  DoubleSide: 'DoubleSide',
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('GlobeView', () => {
  const mockPins: MapPin[] = [
    {
      id: 1,
      latitude: 40.7128,
      longitude: -74.0060,
      article: {
        id: 1,
        title: 'Test Article',
        summary: 'Test summary',
        source: 'Test Source',
        biasScore: 30,
      },
    },
  ];

  const mockViewState: MapViewState = {
    center: [0, 0],
    zoom: 2,
  };

  const mockProps = {
    pins: mockPins,
    viewState: mockViewState,
    onViewStateChange: vi.fn(),
    onPinClick: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<GlobeView {...mockProps} />);
    
    // Should render the container div
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
  });

  it('shows loading indicator when loading is true', () => {
    render(<GlobeView {...mockProps} loading={true} />);
    
    const loadingIndicator = screen.getByRole('progressbar');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('does not show loading indicator when loading is false', () => {
    render(<GlobeView {...mockProps} loading={false} />);
    
    const loadingIndicator = screen.queryByRole('progressbar');
    expect(loadingIndicator).not.toBeInTheDocument();
  });

  it('applies correct cursor style', () => {
    render(<GlobeView {...mockProps} />);
    
    const container = screen.getByRole('generic');
    const globeContainer = container.firstChild as HTMLElement;
    
    expect(globeContainer).toHaveStyle({ cursor: 'grab' });
  });

  it('handles empty pins array', () => {
    const propsWithNoPins = {
      ...mockProps,
      pins: [],
    };

    expect(() => {
      render(<GlobeView {...propsWithNoPins} />);
    }).not.toThrow();
  });

  it('updates when pins change', () => {
    const { rerender } = render(<GlobeView {...mockProps} />);

    const newPins: MapPin[] = [
      ...mockPins,
      {
        id: 2,
        latitude: 51.5074,
        longitude: -0.1278,
        article: {
          id: 2,
          title: 'Another Article',
          summary: 'Another summary',
          source: 'Another Source',
          biasScore: 70,
        },
      },
    ];

    expect(() => {
      rerender(<GlobeView {...mockProps} pins={newPins} />);
    }).not.toThrow();
  });
});