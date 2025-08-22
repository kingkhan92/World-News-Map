import { FilterState, MapBounds } from '../types/map';

// URL parameter keys
const URL_PARAMS = {
  DATE_START: 'dateStart',
  DATE_END: 'dateEnd',
  SOURCES: 'sources',
  BIAS_MIN: 'biasMin',
  BIAS_MAX: 'biasMax',
  KEYWORDS: 'keywords',
  REGION_NORTH: 'regionNorth',
  REGION_SOUTH: 'regionSouth',
  REGION_EAST: 'regionEast',
  REGION_WEST: 'regionWest',
} as const;

/**
 * Convert FilterState to URL search parameters
 */
export const filtersToUrlParams = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();

  // Date range
  if (filters.dateRange.start) {
    params.set(URL_PARAMS.DATE_START, filters.dateRange.start.toISOString().split('T')[0]);
  }
  if (filters.dateRange.end) {
    params.set(URL_PARAMS.DATE_END, filters.dateRange.end.toISOString().split('T')[0]);
  }

  // Sources
  if (filters.sources.length > 0) {
    params.set(URL_PARAMS.SOURCES, filters.sources.join(','));
  }

  // Bias range
  if (filters.biasRange[0] !== 0 || filters.biasRange[1] !== 100) {
    params.set(URL_PARAMS.BIAS_MIN, filters.biasRange[0].toString());
    params.set(URL_PARAMS.BIAS_MAX, filters.biasRange[1].toString());
  }

  // Keywords
  if (filters.keywords.trim()) {
    params.set(URL_PARAMS.KEYWORDS, filters.keywords.trim());
  }

  // Region
  if (filters.region) {
    params.set(URL_PARAMS.REGION_NORTH, filters.region.north.toString());
    params.set(URL_PARAMS.REGION_SOUTH, filters.region.south.toString());
    params.set(URL_PARAMS.REGION_EAST, filters.region.east.toString());
    params.set(URL_PARAMS.REGION_WEST, filters.region.west.toString());
  }

  return params;
};

/**
 * Convert URL search parameters to FilterState
 */
export const urlParamsToFilters = (params: URLSearchParams, defaultFilters: FilterState): FilterState => {
  const filters: FilterState = { ...defaultFilters };

  // Date range
  const dateStart = params.get(URL_PARAMS.DATE_START);
  const dateEnd = params.get(URL_PARAMS.DATE_END);
  
  if (dateStart) {
    const startDate = new Date(dateStart);
    if (!isNaN(startDate.getTime())) {
      filters.dateRange.start = startDate;
    }
  }
  
  if (dateEnd) {
    const endDate = new Date(dateEnd);
    if (!isNaN(endDate.getTime())) {
      filters.dateRange.end = endDate;
    }
  }

  // Sources
  const sourcesParam = params.get(URL_PARAMS.SOURCES);
  if (sourcesParam) {
    filters.sources = sourcesParam.split(',').filter(Boolean);
  }

  // Bias range
  const biasMin = params.get(URL_PARAMS.BIAS_MIN);
  const biasMax = params.get(URL_PARAMS.BIAS_MAX);
  
  if (biasMin !== null && biasMax !== null) {
    const min = parseInt(biasMin, 10);
    const max = parseInt(biasMax, 10);
    
    if (!isNaN(min) && !isNaN(max) && min >= 0 && max <= 100 && min <= max) {
      filters.biasRange = [min, max];
    }
  }

  // Keywords
  const keywords = params.get(URL_PARAMS.KEYWORDS);
  if (keywords) {
    filters.keywords = keywords;
  }

  // Region
  const regionNorth = params.get(URL_PARAMS.REGION_NORTH);
  const regionSouth = params.get(URL_PARAMS.REGION_SOUTH);
  const regionEast = params.get(URL_PARAMS.REGION_EAST);
  const regionWest = params.get(URL_PARAMS.REGION_WEST);

  if (regionNorth && regionSouth && regionEast && regionWest) {
    const north = parseFloat(regionNorth);
    const south = parseFloat(regionSouth);
    const east = parseFloat(regionEast);
    const west = parseFloat(regionWest);

    if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
      filters.region = { north, south, east, west };
    }
  }

  return filters;
};

/**
 * Update the browser URL with current filter state
 */
export const updateUrlWithFilters = (filters: FilterState, replace: boolean = false): void => {
  const params = filtersToUrlParams(filters);
  const url = new URL(window.location.href);
  
  // Clear existing filter parameters
  Object.values(URL_PARAMS).forEach(param => {
    url.searchParams.delete(param);
  });

  // Add new parameters
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Update the URL
  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
};

/**
 * Get filters from current URL
 */
export const getFiltersFromUrl = (defaultFilters: FilterState): FilterState => {
  const params = new URLSearchParams(window.location.search);
  return urlParamsToFilters(params, defaultFilters);
};

/**
 * Clear all filter parameters from URL
 */
export const clearFiltersFromUrl = (): void => {
  const url = new URL(window.location.href);
  
  Object.values(URL_PARAMS).forEach(param => {
    url.searchParams.delete(param);
  });

  window.history.replaceState({}, '', url.toString());
};

/**
 * Check if current URL has any filter parameters
 */
export const hasFiltersInUrl = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return Object.values(URL_PARAMS).some(param => params.has(param));
};

/**
 * Generate a shareable URL with current filters
 */
export const generateShareableUrl = (filters: FilterState): string => {
  const url = new URL(window.location.origin + window.location.pathname);
  const params = filtersToUrlParams(filters);
  
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
};