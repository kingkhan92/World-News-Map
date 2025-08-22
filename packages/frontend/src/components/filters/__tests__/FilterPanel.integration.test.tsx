import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterPanel } from '../FilterPanel';
import { FilterState } from '../../../types/map';
import { NewsService } from '../../../services/newsService';

// Mock the NewsService
jest.mock('../../../services/newsService');
const mockNewsService = NewsService as jest.Mocked<typeof NewsService>;

// Mock URL utilities
jest.mock('../../../utils/urlFilters', () => ({
  updateUrlWithFilters: jest.fn(),
  getFiltersFromUrl: jest.fn(),
  clearFiltersFromUrl: jest.fn(),
  generateShareableUrl: jest.fn(() => 'http://localhost:3000/?keywords=test'),
}));

// Mock navigator.share and clipboard
Object.defineProperty(navigator, 'share', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
  },
  writable: true,
});

describe('FilterPanel Integration', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockOnToggle = jest.fn();

  const defaultFilters: FilterState = {
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-02'),
    },
    sources: [],
    biasRange: [0, 100],
    keywords: '',
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    mockOnFiltersChange.mockClear();
    mockOnRefresh.mockClear();
    mockOnToggle.mockClear();
    mockNewsService.getSources.mockResolvedValue(['BBC', 'CNN', 'Reuters']);
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders all filter sections', () => {
    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    expect(screen.getByText('Date & Time')).toBeInTheDocument();
    expect(screen.getByText('Search & Keywords')).toBeInTheDocument();
    expect(screen.getByText('Geographic Region')).toBeInTheDocument();
    expect(screen.getByText('News Sources')).toBeInTheDocument();
    expect(screen.getByText('Bias Analysis')).toBeInTheDocument();
  });

  it('shows active filter indicators', () => {
    const filtersWithActive: FilterState = {
      ...defaultFilters,
      keywords: 'test',
      sources: ['BBC'],
      biasRange: [20, 80],
      region: {
        north: 50,
        south: 40,
        east: 10,
        west: 0,
      },
    };

    renderWithQueryClient(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    // Should show active indicators (•) next to sections with active filters
    expect(screen.getByText('Search & Keywords')).toBeInTheDocument();
    expect(screen.getByText('Geographic Region')).toBeInTheDocument();
    expect(screen.getByText('News Sources')).toBeInTheDocument();
    expect(screen.getByText('Bias Analysis')).toBeInTheDocument();
  });

  it('allows searching for keywords', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    // Expand the search section
    await user.click(screen.getByText('Search & Keywords'));

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search news articles...');
    await user.type(searchInput, 'test search');

    // Should call onFiltersChange with debounced search
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        keywords: 'test search',
      });
    }, { timeout: 1000 });
  });

  it('allows selecting geographic regions', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    // Expand the geographic section
    await user.click(screen.getByText('Geographic Region'));

    // Select a region
    await user.click(screen.getByLabelText('Geographic Region'));
    await user.click(screen.getByText('North America'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      region: {
        north: 71.5,
        south: 7.0,
        east: -52.0,
        west: -168.0,
      },
    });
  });

  it('allows adjusting bias range', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    // Expand the bias section
    await user.click(screen.getByText('Bias Analysis'));

    // Click on a preset
    await user.click(screen.getByText('Center'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      biasRange: [46, 54],
    });
  });

  it('allows selecting news sources', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    // Expand the sources section
    await user.click(screen.getByText('News Sources'));

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('BBC')).toBeInTheDocument();
    });

    // Select a source
    const bbcCheckbox = screen.getByRole('checkbox', { name: /BBC/ });
    await user.click(bbcCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      sources: ['BBC'],
    });
  });

  it('shows clear all filters button when filters are active', () => {
    const filtersWithActive: FilterState = {
      ...defaultFilters,
      keywords: 'test',
    };

    renderWithQueryClient(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    expect(screen.getByTitle('Clear all filters')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    const filtersWithActive: FilterState = {
      ...defaultFilters,
      keywords: 'test',
      sources: ['BBC'],
    };

    renderWithQueryClient(
      <FilterPanel
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    await user.click(screen.getByTitle('Clear all filters'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      dateRange: {
        start: expect.any(Date),
        end: expect.any(Date),
      },
      sources: [],
      biasRange: [0, 100],
      keywords: '',
      region: undefined,
    });
  });

  it('allows sharing filters', async () => {
    const user = userEvent.setup();
    const mockShare = jest.fn();
    (navigator.share as jest.Mock) = mockShare;

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    await user.click(screen.getByTitle('Share filters'));

    expect(mockShare).toHaveBeenCalledWith({
      title: 'News Map Filters',
      url: 'http://localhost:3000/?keywords=test',
    });
  });

  it('falls back to clipboard when share is not available', async () => {
    const user = userEvent.setup();
    const mockWriteText = jest.fn();
    (navigator.clipboard.writeText as jest.Mock) = mockWriteText;
    (navigator.share as any) = undefined;

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isOpen={true}
      />
    );

    await user.click(screen.getByTitle('Share filters'));

    expect(mockWriteText).toHaveBeenCalledWith('http://localhost:3000/?keywords=test');
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onRefresh={mockOnRefresh}
        isOpen={true}
      />
    );

    await user.click(screen.getByTitle('Refresh data'));

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('calls onToggle when close button is clicked', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onToggle={mockOnToggle}
        isOpen={true}
      />
    );

    await user.click(screen.getByTitle('Close filters'));

    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('shows collapsed state when not open', () => {
    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        onToggle={mockOnToggle}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Date & Time')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument(); // Filter toggle button
  });

  it('disables controls when loading', async () => {
    renderWithQueryClient(
      <FilterPanel
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        isLoading={true}
        isOpen={true}
      />
    );

    // Expand search section
    const searchSection = screen.getByText('Search & Keywords');
    await userEvent.setup().click(searchSection);

    const searchInput = screen.getByPlaceholderText('Search news articles...');
    expect(searchInput).toBeDisabled();
  });
});