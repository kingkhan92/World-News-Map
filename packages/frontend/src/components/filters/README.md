# Filtering and Search System

This directory contains the comprehensive filtering and search functionality for the Interactive World News Map application. The system provides multiple ways to filter and search news articles with URL persistence and real-time updates.

## Components Overview

### FilterPanel
The main container component that orchestrates all filtering functionality.

**Features:**
- Collapsible accordion-style interface
- Active filter indicators
- URL persistence
- Share functionality
- Clear all filters
- Responsive design

**Props:**
- `filters: FilterState` - Current filter state
- `onFiltersChange: (filters: Partial<FilterState>) => void` - Filter change handler
- `onRefresh?: () => void` - Data refresh handler
- `isLoading?: boolean` - Loading state
- `isOpen?: boolean` - Panel visibility
- `onToggle?: () => void` - Panel toggle handler
- `enableUrlPersistence?: boolean` - Enable URL synchronization

### KeywordSearch
Full-text search component with search history and highlighting.

**Features:**
- Real-time search with debouncing
- Search history with localStorage persistence
- Keyword chips for active terms
- Search term highlighting in results
- Auto-complete suggestions

**Props:**
- `keywords: string` - Current search keywords
- `onKeywordsChange: (keywords: string) => void` - Search change handler
- `disabled?: boolean` - Disable input
- `placeholder?: string` - Input placeholder
- `showHistory?: boolean` - Enable search history

### GeographicFilter
Region-based filtering with predefined regions and custom bounds.

**Features:**
- Predefined world regions (North America, Europe, Asia, etc.)
- Custom geographic bounds input
- Visual coordinate display
- Region validation

**Props:**
- `selectedRegion?: MapBounds` - Current selected region
- `onRegionChange: (region?: MapBounds) => void` - Region change handler
- `disabled?: boolean` - Disable controls

### BiasFilter
Bias score filtering with range sliders and presets.

**Features:**
- Visual range slider with bias color coding
- Preset bias categories (Left, Center, Right, etc.)
- Manual input mode
- Range validation
- Visual bias indicators

**Props:**
- `biasRange: [number, number]` - Current bias range
- `onBiasRangeChange: (range: [number, number]) => void` - Range change handler
- `disabled?: boolean` - Disable controls
- `showPresets?: boolean` - Show preset buttons

### SourceFilter
News source filtering with search and bulk operations.

**Features:**
- Dynamic source loading from API
- Source search and filtering
- Bulk select/deselect operations
- Selected source chips
- Expandable source list

**Props:**
- `selectedSources: string[]` - Currently selected sources
- `onSourcesChange: (sources: string[]) => void` - Source change handler
- `disabled?: boolean` - Disable controls

## Utility Functions

### urlFilters.ts
URL persistence utilities for filter state management.

**Functions:**
- `filtersToUrlParams(filters)` - Convert filters to URL parameters
- `urlParamsToFilters(params, defaults)` - Parse URL parameters to filters
- `updateUrlWithFilters(filters, replace?)` - Update browser URL
- `getFiltersFromUrl(defaults)` - Get filters from current URL
- `clearFiltersFromUrl()` - Remove all filter parameters
- `generateShareableUrl(filters)` - Create shareable URL

### highlightSearchTerms
Text highlighting utility for search results.

**Usage:**
```tsx
import { highlightSearchTerms } from './KeywordSearch';

const highlightedText = highlightSearchTerms(
  "This is some text to highlight",
  "highlight text"
);
```

## Filter State Management

### FilterState Interface
```typescript
interface FilterState {
  dateRange: {
    start: Date;
    end: Date;
  };
  sources: string[];
  biasRange: [number, number];
  keywords: string;
  region?: MapBounds;
}
```

### Integration with useMapData Hook
The filtering system integrates with the `useMapData` hook for data fetching:

```typescript
const {
  pins,
  filters,
  updateFilters,
  // ...
} = useMapData({
  enableUrlPersistence: true,
});
```

## URL Persistence

The system automatically synchronizes filter state with the browser URL, enabling:
- Bookmarkable filtered views
- Shareable filter configurations
- Browser back/forward navigation
- Deep linking to specific filter states

### URL Parameters
- `dateStart`, `dateEnd` - Date range (YYYY-MM-DD format)
- `sources` - Comma-separated source list
- `biasMin`, `biasMax` - Bias score range
- `keywords` - Search keywords
- `regionNorth`, `regionSouth`, `regionEast`, `regionWest` - Geographic bounds

## Search Highlighting

Search terms are automatically highlighted in:
- Article titles
- Article summaries
- Article content (in modal view)

The highlighting is case-insensitive and supports multiple search terms.

## Performance Considerations

### Debouncing
- Keyword search is debounced (500ms) to prevent excessive API calls
- Filter changes are batched to minimize re-renders

### Caching
- News sources are cached after first load
- Search history is persisted in localStorage
- Filter state is memoized to prevent unnecessary updates

### Lazy Loading
- Source list supports pagination for large source counts
- Components are loaded on-demand when filter sections are expanded

## Testing

Comprehensive test suites are provided for all components:
- Unit tests for individual components
- Integration tests for component interactions
- URL persistence testing
- Search highlighting validation

### Running Tests
```bash
npm test -- --run packages/frontend/src/components/filters/
```

## Usage Examples

### Basic Filter Panel
```tsx
import { FilterPanel } from './components/filters';

<FilterPanel
  filters={filters}
  onFiltersChange={updateFilters}
  onRefresh={refreshData}
  isLoading={isLoading}
  isOpen={showFilters}
  onToggle={() => setShowFilters(!showFilters)}
/>
```

### Standalone Components
```tsx
import { KeywordSearch, BiasFilter } from './components/filters';

// Keyword search only
<KeywordSearch
  keywords={filters.keywords}
  onKeywordsChange={(keywords) => updateFilters({ keywords })}
/>

// Bias filter only
<BiasFilter
  biasRange={filters.biasRange}
  onBiasRangeChange={(biasRange) => updateFilters({ biasRange })}
/>
```

### With URL Persistence
```tsx
import { useMapData } from './hooks/useMapData';

const MyComponent = () => {
  const { filters, updateFilters } = useMapData({
    enableUrlPersistence: true,
  });

  return (
    <FilterPanel
      filters={filters}
      onFiltersChange={updateFilters}
      enableUrlPersistence={true}
    />
  );
};
```

## Accessibility

All filter components follow accessibility best practices:
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Focus management

## Browser Support

The filtering system supports:
- Modern browsers with ES2020+ support
- URL API for persistence
- localStorage for search history
- Navigator.share API (with clipboard fallback)

## Future Enhancements

Potential improvements for future versions:
- Saved filter presets
- Advanced search operators
- Filter combination logic (AND/OR)
- Real-time filter suggestions
- Filter analytics and usage tracking