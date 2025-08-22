import { 
  createNewsIcon, 
  createClusterIcon, 
  getBoundsFromPins, 
  isValidCoordinate,
  DEFAULT_MAP_CONFIG 
} from '../leafletIcons';

// Mock Leaflet
jest.mock('leaflet', () => ({
  DivIcon: jest.fn().mockImplementation((options) => ({
    options,
    _getIconUrl: jest.fn(),
  })),
  latLngBounds: jest.fn().mockImplementation((latLngs) => ({
    latLngs,
    isValid: () => latLngs.length > 0,
  })),
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
}));

describe('leafletIcons utilities', () => {
  describe('createNewsIcon', () => {
    it('creates icon with correct bias color for low bias', () => {
      const icon = createNewsIcon(25);
      expect(icon.options.html).toContain('#4caf50'); // Green
      expect(icon.options.html).toContain('📰');
    });

    it('creates icon with correct bias color for medium bias', () => {
      const icon = createNewsIcon(45);
      expect(icon.options.html).toContain('#ff9800'); // Orange
    });

    it('creates icon with correct bias color for high bias', () => {
      const icon = createNewsIcon(75);
      expect(icon.options.html).toContain('#f44336'); // Red
    });

    it('creates larger icon when selected', () => {
      const normalIcon = createNewsIcon(50, false);
      const selectedIcon = createNewsIcon(50, true);
      
      expect(selectedIcon.options.html).toContain('32px'); // Larger size
      expect(normalIcon.options.html).toContain('24px'); // Normal size
    });

    it('applies correct CSS classes', () => {
      const normalIcon = createNewsIcon(50, false);
      const selectedIcon = createNewsIcon(50, true);
      
      expect(normalIcon.options.className).toBe('custom-news-pin ');
      expect(selectedIcon.options.className).toBe('custom-news-pin selected');
    });
  });

  describe('createClusterIcon', () => {
    const mockCluster = {
      getChildCount: () => 5,
      getAllChildMarkers: () => [
        { options: { biasScore: 20 } },
        { options: { biasScore: 40 } },
        { options: { biasScore: 60 } },
      ],
    };

    it('creates cluster icon with correct child count', () => {
      const icon = createClusterIcon(mockCluster);
      expect(icon.options.html).toContain('5');
      expect(icon.options.html).toContain('news');
    });

    it('calculates average bias score correctly', () => {
      const icon = createClusterIcon(mockCluster);
      // Average of 20, 40, 60 is 40, which should be orange
      expect(icon.options.html).toContain('#ff9800');
    });

    it('handles different cluster sizes', () => {
      const smallCluster = { ...mockCluster, getChildCount: () => 5 };
      const mediumCluster = { ...mockCluster, getChildCount: () => 15 };
      const largeCluster = { ...mockCluster, getChildCount: () => 150 };

      const smallIcon = createClusterIcon(smallCluster);
      const mediumIcon = createClusterIcon(mediumCluster);
      const largeIcon = createClusterIcon(largeCluster);

      expect(smallIcon.options.className).toContain('marker-cluster-small');
      expect(mediumIcon.options.className).toContain('marker-cluster-medium');
      expect(largeIcon.options.className).toContain('marker-cluster-large');
    });

    it('handles markers without bias scores', () => {
      const clusterWithoutBias = {
        getChildCount: () => 3,
        getAllChildMarkers: () => [
          { options: {} },
          { options: {} },
          { options: {} },
        ],
      };

      const icon = createClusterIcon(clusterWithoutBias);
      // Should default to 50 for each marker, resulting in orange color
      expect(icon.options.html).toContain('#ff9800');
    });
  });

  describe('getBoundsFromPins', () => {
    it('returns null for empty pins array', () => {
      const bounds = getBoundsFromPins([]);
      expect(bounds).toBeNull();
    });

    it('creates bounds from pin coordinates', () => {
      const pins = [
        { latitude: 40.7128, longitude: -74.0060 },
        { latitude: 51.5074, longitude: -0.1278 },
        { latitude: 35.6762, longitude: 139.6503 },
      ];

      const bounds = getBoundsFromPins(pins);
      expect(bounds).toBeDefined();
      expect(bounds?.latLngs).toEqual([
        [40.7128, -74.0060],
        [51.5074, -0.1278],
        [35.6762, 139.6503],
      ]);
    });

    it('handles single pin', () => {
      const pins = [{ latitude: 40.7128, longitude: -74.0060 }];
      const bounds = getBoundsFromPins(pins);
      expect(bounds).toBeDefined();
      expect(bounds?.latLngs).toEqual([[40.7128, -74.0060]]);
    });
  });

  describe('isValidCoordinate', () => {
    it('validates correct coordinates', () => {
      expect(isValidCoordinate(40.7128, -74.0060)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    it('rejects invalid latitudes', () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(-91, 0)).toBe(false);
      expect(isValidCoordinate(NaN, 0)).toBe(false);
    });

    it('rejects invalid longitudes', () => {
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate(0, -181)).toBe(false);
      expect(isValidCoordinate(0, NaN)).toBe(false);
    });

    it('rejects non-numeric values', () => {
      expect(isValidCoordinate('40.7128' as any, -74.0060)).toBe(false);
      expect(isValidCoordinate(40.7128, '-74.0060' as any)).toBe(false);
      expect(isValidCoordinate(null as any, null as any)).toBe(false);
      expect(isValidCoordinate(undefined as any, undefined as any)).toBe(false);
    });
  });

  describe('DEFAULT_MAP_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_MAP_CONFIG.center).toEqual([20, 0]);
      expect(DEFAULT_MAP_CONFIG.zoom).toBe(3);
      expect(DEFAULT_MAP_CONFIG.minZoom).toBe(2);
      expect(DEFAULT_MAP_CONFIG.maxZoom).toBe(18);
      expect(DEFAULT_MAP_CONFIG.maxBounds).toEqual([[-90, -180], [90, 180]]);
      expect(DEFAULT_MAP_CONFIG.maxBoundsViscosity).toBe(1.0);
      expect(DEFAULT_MAP_CONFIG.worldCopyJump).toBe(true);
      expect(DEFAULT_MAP_CONFIG.zoomControl).toBe(true);
      expect(DEFAULT_MAP_CONFIG.scrollWheelZoom).toBe(true);
      expect(DEFAULT_MAP_CONFIG.doubleClickZoom).toBe(true);
      expect(DEFAULT_MAP_CONFIG.dragging).toBe(true);
    });
  });
});