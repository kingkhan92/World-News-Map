import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VirtualScrollList, useVirtualScroll } from '../VirtualScrollList';

// Mock data
const mockItems = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  name: `Item ${index + 1}`,
  description: `Description for item ${index + 1}`,
}));

const MockItemComponent: React.FC<{ item: any; index: number }> = ({ item, index }) => (
  <div data-testid={`item-${index}`}>
    <h3>{item.name}</h3>
    <p>{item.description}</p>
  </div>
);

describe('VirtualScrollList', () => {
  const defaultProps = {
    items: mockItems,
    itemHeight: 80,
    containerHeight: 400,
    renderItem: (item: any, index: number) => (
      <MockItemComponent key={item.id} item={item} index={index} />
    ),
  };

  beforeEach(() => {
    // Mock scrollHeight and clientHeight
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: 8000, // 100 items * 80px height
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 400,
    });
  });

  it('renders virtual scroll list with visible items only', () => {
    render(<VirtualScrollList {...defaultProps} />);

    // Should render only visible items (approximately 5-6 items for 400px container with 80px items)
    const visibleItems = screen.getAllByTestId(/item-/);
    expect(visibleItems.length).toBeLessThan(mockItems.length);
    expect(visibleItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no items provided', () => {
    render(
      <VirtualScrollList
        {...defaultProps}
        items={[]}
        emptyComponent={<div data-testid="empty-state">No items</div>}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders loading component when loading', () => {
    render(
      <VirtualScrollList
        {...defaultProps}
        isLoading={true}
        loadingComponent={<div data-testid="loading">Loading...</div>}
      />
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('calls onLoadMore when scrolled near bottom', async () => {
    const onLoadMore = vi.fn();
    
    render(
      <VirtualScrollList
        {...defaultProps}
        onLoadMore={onLoadMore}
        hasNextPage={true}
      />
    );

    const scrollContainer = screen.getByRole('list').parentElement;
    
    // Simulate scroll to 80% of content
    fireEvent.scroll(scrollContainer!, {
      target: { scrollTop: 6400 }, // 80% of 8000px
    });

    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  it('does not call onLoadMore when hasNextPage is false', async () => {
    const onLoadMore = vi.fn();
    
    render(
      <VirtualScrollList
        {...defaultProps}
        onLoadMore={onLoadMore}
        hasNextPage={false}
      />
    );

    const scrollContainer = screen.getByRole('list').parentElement;
    
    fireEvent.scroll(scrollContainer!, {
      target: { scrollTop: 6400 },
    });

    await waitFor(() => {
      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });

  it('updates visible items when scrolled', async () => {
    render(<VirtualScrollList {...defaultProps} />);

    const scrollContainer = screen.getByRole('list').parentElement;
    
    // Initial state - should show items starting from 0
    expect(screen.getByTestId('item-0')).toBeInTheDocument();

    // Scroll down
    fireEvent.scroll(scrollContainer!, {
      target: { scrollTop: 800 }, // Scroll down 10 items
    });

    await waitFor(() => {
      // Should now show items starting from around index 10
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('item-10')).toBeInTheDocument();
    });
  });

  it('applies correct total height based on item count', () => {
    render(<VirtualScrollList {...defaultProps} />);

    const virtualContainer = screen.getByRole('list').parentElement?.firstChild as HTMLElement;
    expect(virtualContainer).toHaveStyle({ height: '8000px' }); // 100 items * 80px
  });

  it('applies correct offset for visible items', async () => {
    render(<VirtualScrollList {...defaultProps} />);

    const scrollContainer = screen.getByRole('list').parentElement;
    
    // Scroll to middle
    fireEvent.scroll(scrollContainer!, {
      target: { scrollTop: 4000 },
    });

    await waitFor(() => {
      const itemsContainer = screen.getByRole('list').parentElement?.querySelector('[style*="position: absolute"]') as HTMLElement;
      expect(itemsContainer).toHaveStyle({ top: expect.stringMatching(/\d+px/) });
    });
  });

  it('handles overscan correctly', () => {
    render(<VirtualScrollList {...defaultProps} overscan={10} />);

    // With higher overscan, should render more items
    const visibleItems = screen.getAllByTestId(/item-/);
    expect(visibleItems.length).toBeGreaterThan(5); // More than basic visible count
  });

  it('applies custom className', () => {
    render(<VirtualScrollList {...defaultProps} className="custom-class" />);

    const container = screen.getByRole('list').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});

describe('useVirtualScroll', () => {
  const TestComponent: React.FC<{ items: any[]; itemHeight: number; containerHeight: number }> = ({
    items,
    itemHeight,
    containerHeight,
  }) => {
    const { scrollTop, visibleRange, totalHeight, offsetY, scrollToItem } = useVirtualScroll(
      items,
      itemHeight,
      containerHeight
    );

    return (
      <div>
        <div data-testid="scroll-top">{scrollTop}</div>
        <div data-testid="visible-start">{visibleRange.start}</div>
        <div data-testid="visible-end">{visibleRange.end}</div>
        <div data-testid="total-height">{totalHeight}</div>
        <div data-testid="offset-y">{offsetY}</div>
        <button onClick={() => scrollToItem(50)} data-testid="scroll-to-item">
          Scroll to item 50
        </button>
      </div>
    );
  };

  it('calculates visible range correctly', () => {
    render(<TestComponent items={mockItems} itemHeight={80} containerHeight={400} />);

    expect(screen.getByTestId('visible-start')).toHaveTextContent('0');
    expect(screen.getByTestId('visible-end')).toHaveTextContent('9'); // 5 visible + 5 overscan - 1
    expect(screen.getByTestId('total-height')).toHaveTextContent('8000');
    expect(screen.getByTestId('offset-y')).toHaveTextContent('0');
  });

  it('updates scroll position when scrollToItem is called', () => {
    render(<TestComponent items={mockItems} itemHeight={80} containerHeight={400} />);

    fireEvent.click(screen.getByTestId('scroll-to-item'));

    expect(screen.getByTestId('scroll-top')).toHaveTextContent('4000'); // 50 * 80px
  });

  it('handles empty items array', () => {
    render(<TestComponent items={[]} itemHeight={80} containerHeight={400} />);

    expect(screen.getByTestId('visible-start')).toHaveTextContent('0');
    expect(screen.getByTestId('visible-end')).toHaveTextContent('-1');
    expect(screen.getByTestId('total-height')).toHaveTextContent('0');
  });

  it('calculates visible range for different scroll positions', () => {
    const TestScrollComponent: React.FC = () => {
      const { visibleRange, setScrollTop } = useVirtualScroll(mockItems, 80, 400);

      React.useEffect(() => {
        setScrollTop(1600); // Scroll to position that shows items 20-25
      }, [setScrollTop]);

      return (
        <div>
          <div data-testid="visible-start">{visibleRange.start}</div>
          <div data-testid="visible-end">{visibleRange.end}</div>
        </div>
      );
    };

    render(<TestScrollComponent />);

    expect(screen.getByTestId('visible-start')).toHaveTextContent('15'); // 20 - 5 overscan
    expect(screen.getByTestId('visible-end')).toHaveTextContent('29'); // 25 + 5 overscan - 1
  });
});