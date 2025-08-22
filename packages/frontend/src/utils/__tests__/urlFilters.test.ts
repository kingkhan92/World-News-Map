import {
  filtersToUrlParams,
  urlParamsToFilters,
  updateUrlWithFilters,
  getFiltersFromUrl,
  clearFiltersFromUrl,
  hasFiltersInUrl,
  generateShareableUrl,
} from '../urlFilters';
import { FilterState } from '../../types/map';

// Mock window.location and history
const mockLocation = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
};

const mockHistory = {
  pushState: jest.fn(),
  replaceState: jest.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

describe('urlFilters', () => {
  const defaultFilters: FilterState = {
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-02'),
    },
    sources: [],
    biasRange: [0, 100],
    keywords: '',
  };

  beforeEach(() => {
    mockHistory.pushState.mockClear();
    mockHistory.replaceState.mockClear();
    mockLocation.search = '';
    mockLocation.href = 'http://localhost:3000/';
  });

  describe('filtersToUrlParams', () => {
    it('converts basic filters to URL params', () => {
      const filters: FilterState = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        sources: ['BBC', 'CNN'],
        biasRange: [20, 80],
        keywords: 'test search',
      };

      const params = filtersToUrlParams(filters);

      expect(params.get('dateStart')).toBe('2024-01-01');
      expect(params.get('dateEnd')).toBe('2024-01-02');
      expect(params.get('sources')).toBe('BBC,CNN');
      expect(params.get('biasMin')).toBe('20');
      expect(params.get('biasMax')).toBe('80');
      expect(params.get('keywords')).toBe('test search');
    });

    it('omits default values', () => {
      const filters: FilterState = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        sources: [],
        biasRange: [0, 100],
        keywords: '',
      };

      const params = filtersToUrlParams(filters);

      expect(params.has('sources')).toBe(false);
      expect(params.has('biasMin')).toBe(false);
      expect(params.has('biasMax')).toBe(false);
      expect(params.has('keywords')).toBe(false);
    });

    it('includes region bounds when present', () => {
      const filters: FilterState = {
        ...defaultFilters,
        region: {
          north: 50,
          south: 40,
          east: 10,
          west: 0,
        },
      };

      const params = filtersToUrlParams(filters);

      expect(params.get('regionNorth')).toBe('50');
      expect(params.get('regionSouth')).toBe('40');
      expect(params.get('regionEast')).toBe('10');
      expect(params.get('regionWest')).toBe('0');
    });
  });

  describe('urlParamsToFilters', () => {
    it('converts URL params to filters', () => {
      const params = new URLSearchParams();
      params.set('dateStart', '2024-01-01');
      params.set('dateEnd', '2024-01-02');
      params.set('sources', 'BBC,CNN');
      params.set('biasMin', '20');
      params.set('biasMax', '80');
      params.set('keywords', 'test search');

      const filters = urlParamsToFilters(params, defaultFilters);

      expect(filters.dateRange.start).toEqual(new Date('2024-01-01'));
      expect(filters.dateRange.end).toEqual(new Date('2024-01-02'));
      expect(filters.sources).toEqual(['BBC', 'CNN']);
      expect(filters.biasRange).toEqual([20, 80]);
      expect(filters.keywords).toBe('test search');
    });

    it('uses default values for missing params', () => {
      const params = new URLSearchParams();
      params.set('keywords', 'test');

      const filters = urlParamsToFilters(params, defaultFilters);

      expect(filters.dateRange).toEqual(defaultFilters.dateRange);
      expect(filters.sources).toEqual(defaultFilters.sources);
      expect(filters.biasRange).toEqual(defaultFilters.biasRange);
      expect(filters.keywords).toBe('test');
    });

    it('handles invalid date values', () => {
      const params = new URLSearchParams();
      params.set('dateStart', 'invalid-date');
      params.set('dateEnd', '2024-01-02');

      const filters = urlParamsToFilters(params, defaultFilters);

      expect(filters.dateRange.start).toEqual(defaultFilters.dateRange.start);
      expect(filters.dateRange.end).toEqual(new Date('2024-01-02'));
    });

    it('handles invalid bias range values', () => {
      const params = new URLSearchParams();
      params.set('biasMin', 'invalid');
      params.set('biasMax', '150'); // Out of range

      const filters = urlParamsToFilters(params, defaultFilters);

      expect(filters.biasRange).toEqual(defaultFilters.biasRange);
    });

    it('parses region bounds', () => {
      const params = new URLSearchParams();
      params.set('regionNorth', '50');
      params.set('regionSouth', '40');
      params.set('regionEast', '10');
      params.set('regionWest', '0');

      const filters = urlParamsToFilters(params, defaultFilters);

      expect(filters.region).toEqual({
        north: 50,
        south: 40,
        east: 10,
        west: 0,
      });
    });
  });

  describe('updateUrlWithFilters', () => {
    it('updates URL with filter parameters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        keywords: 'test',
      };

      updateUrlWithFilters(filters);

      expect(mockHistory.pushState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('keywords=test')
      );
    });

    it('replaces URL when replace is true', () => {
      const filters: FilterState = {
        ...defaultFilters,
        keywords: 'test',
      };

      updateUrlWithFilters(filters, true);

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('keywords=test')
      );
    });

    it('clears existing filter parameters', () => {
      mockLocation.search = '?keywords=old&biasMin=10';
      mockLocation.href = 'http://localhost:3000/?keywords=old&biasMin=10';

      const filters: FilterState = {
        ...defaultFilters,
        sources: ['BBC'],
      };

      updateUrlWithFilters(filters);

      const call = mockHistory.pushState.mock.calls[0];
      const url = call[2];
      expect(url).toContain('sources=BBC');
      expect(url).not.toContain('keywords=old');
      expect(url).not.toContain('biasMin=10');
    });
  });

  describe('getFiltersFromUrl', () => {
    it('gets filters from current URL', () => {
      mockLocation.search = '?keywords=test&sources=BBC,CNN';

      const filters = getFiltersFromUrl(defaultFilters);

      expect(filters.keywords).toBe('test');
      expect(filters.sources).toEqual(['BBC', 'CNN']);
    });
  });

  describe('clearFiltersFromUrl', () => {
    it('removes all filter parameters from URL', () => {
      mockLocation.search = '?keywords=test&sources=BBC&other=param';
      mockLocation.href = 'http://localhost:3000/?keywords=test&sources=BBC&other=param';

      clearFiltersFromUrl();

      const call = mockHistory.replaceState.mock.calls[0];
      const url = call[2];
      expect(url).not.toContain('keywords=test');
      expect(url).not.toContain('sources=BBC');
      expect(url).toContain('other=param'); // Non-filter params should remain
    });
  });

  describe('hasFiltersInUrl', () => {
    it('returns true when filter parameters are present', () => {
      mockLocation.search = '?keywords=test';

      expect(hasFiltersInUrl()).toBe(true);
    });

    it('returns false when no filter parameters are present', () => {
      mockLocation.search = '?other=param';

      expect(hasFiltersInUrl()).toBe(false);
    });

    it('returns false when no parameters are present', () => {
      mockLocation.search = '';

      expect(hasFiltersInUrl()).toBe(false);
    });
  });

  describe('generateShareableUrl', () => {
    it('generates a shareable URL with filters', () => {
      const filters: FilterState = {
        ...defaultFilters,
        keywords: 'test',
        sources: ['BBC'],
      };

      const url = generateShareableUrl(filters);

      expect(url).toContain('http://localhost:3000/');
      expect(url).toContain('keywords=test');
      expect(url).toContain('sources=BBC');
    });

    it('generates clean URL without default values', () => {
      const filters: FilterState = {
        ...defaultFilters,
        keywords: 'test',
      };

      const url = generateShareableUrl(filters);

      expect(url).toContain('keywords=test');
      expect(url).not.toContain('biasMin=0');
      expect(url).not.toContain('biasMax=100');
    });
  });
});