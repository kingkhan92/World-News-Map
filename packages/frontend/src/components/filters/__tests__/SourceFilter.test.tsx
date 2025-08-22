import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceFilter } from '../SourceFilter';
import { NewsService } from '../../../services/newsService';

// Mock the NewsService
jest.mock('../../../services/newsService');
const mockNewsService = NewsService as jest.Mocked<typeof NewsService>;

describe('SourceFilter', () => {
  const mockOnSourcesChange = jest.fn();
  const mockSources = ['BBC', 'CNN', 'Reuters', 'Associated Press', 'The Guardian'];

  beforeEach(() => {
    mockOnSourcesChange.mockClear();
    mockNewsService.getSources.mockResolvedValue(mockSources);
  });

  it('renders without crashing', () => {
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    expect(screen.getByText('Loading news sources...')).toBeInTheDocument();
  });

  it('loads and displays available sources', async () => {
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Available Sources (5):')).toBeInTheDocument();
    });
    
    expect(screen.getByText('BBC')).toBeInTheDocument();
    expect(screen.getByText('CNN')).toBeInTheDocument();
    expect(screen.getByText('Reuters')).toBeInTheDocument();
  });

  it('shows search input', async () => {
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search news sources...')).toBeInTheDocument();
    });
  });

  it('filters sources based on search term', async () => {
    const user = userEvent.setup();
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('BBC')).toBeInTheDocument();
    });
    
    // Search for "BBC"
    const searchInput = screen.getByPlaceholderText('Search news sources...');
    await user.type(searchInput, 'BBC');
    
    await waitFor(() => {
      expect(screen.getByText('BBC')).toBeInTheDocument();
      expect(screen.queryByText('CNN')).not.toBeInTheDocument();
    });
  });

  it('allows selecting sources', async () => {
    const user = userEvent.setup();
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('BBC')).toBeInTheDocument();
    });
    
    // Click on BBC checkbox
    const bbcCheckbox = screen.getByRole('checkbox', { name: /BBC/ });
    await user.click(bbcCheckbox);
    
    expect(mockOnSourcesChange).toHaveBeenCalledWith(['BBC']);
  });

  it('allows deselecting sources', async () => {
    const user = userEvent.setup();
    
    render(
      <SourceFilter
        selectedSources={['BBC']}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('BBC')).toBeInTheDocument();
    });
    
    // Click on BBC checkbox to deselect
    const bbcCheckbox = screen.getByRole('checkbox', { name: /BBC/ });
    await user.click(bbcCheckbox);
    
    expect(mockOnSourcesChange).toHaveBeenCalledWith([]);
  });

  it('displays selected sources as chips', async () => {
    render(
      <SourceFilter
        selectedSources={['BBC', 'CNN']}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Selected Sources (2):')).toBeInTheDocument();
    });
    
    // Should show chips for selected sources
    const chips = screen.getAllByRole('button');
    const bbcChip = chips.find(chip => chip.textContent?.includes('BBC'));
    const cnnChip = chips.find(chip => chip.textContent?.includes('CNN'));
    
    expect(bbcChip).toBeInTheDocument();
    expect(cnnChip).toBeInTheDocument();
  });

  it('allows removing sources via chips', async () => {
    const user = userEvent.setup();
    
    render(
      <SourceFilter
        selectedSources={['BBC']}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Selected Sources (1):')).toBeInTheDocument();
    });
    
    // Find the BBC chip and click its delete button
    const bbcChip = screen.getByText('BBC');
    const deleteButton = bbcChip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }
    
    expect(mockOnSourcesChange).toHaveBeenCalledWith([]);
  });

  it('shows Select All button', async () => {
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
  });

  it('selects all sources when Select All is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Select All')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Select All'));
    
    expect(mockOnSourcesChange).toHaveBeenCalledWith(mockSources);
  });

  it('shows Clear All button', async () => {
    render(
      <SourceFilter
        selectedSources={['BBC']}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  it('clears all sources when Clear All is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SourceFilter
        selectedSources={['BBC', 'CNN']}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Clear All'));
    
    expect(mockOnSourcesChange).toHaveBeenCalledWith([]);
  });

  it('shows "Show More" button when there are many sources', async () => {
    const manySources = Array.from({ length: 15 }, (_, i) => `Source ${i + 1}`);
    mockNewsService.getSources.mockResolvedValue(manySources);
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Show 7 More')).toBeInTheDocument();
    });
  });

  it('expands to show all sources when Show More is clicked', async () => {
    const user = userEvent.setup();
    const manySources = Array.from({ length: 15 }, (_, i) => `Source ${i + 1}`);
    mockNewsService.getSources.mockResolvedValue(manySources);
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Show 7 More')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Show 7 More'));
    
    await waitFor(() => {
      expect(screen.getByText('Show Less')).toBeInTheDocument();
      expect(screen.getByText('Source 15')).toBeInTheDocument();
    });
  });

  it('shows summary of filter status', async () => {
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('All sources selected (no filter applied)')).toBeInTheDocument();
    });
  });

  it('shows filtered summary when sources are selected', async () => {
    render(
      <SourceFilter
        selectedSources={['BBC', 'CNN']}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Filtering by 2 of 5 sources')).toBeInTheDocument();
    });
  });

  it('handles loading error', async () => {
    mockNewsService.getSources.mockRejectedValue(new Error('Failed to load'));
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load news sources')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    mockNewsService.getSources.mockRejectedValue(new Error('Failed to load'));
    
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('disables controls when disabled prop is true', async () => {
    render(
      <SourceFilter
        selectedSources={[]}
        onSourcesChange={mockOnSourcesChange}
        disabled={true}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search news sources...')).toBeDisabled();
    });
  });
});