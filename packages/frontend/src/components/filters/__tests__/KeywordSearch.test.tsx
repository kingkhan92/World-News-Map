import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeywordSearch, highlightSearchTerms } from '../KeywordSearch';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('KeywordSearch', () => {
  const mockOnKeywordsChange = jest.fn();

  beforeEach(() => {
    mockOnKeywordsChange.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  it('renders without crashing', () => {
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    expect(screen.getByPlaceholderText('Search news articles...')).toBeInTheDocument();
  });

  it('displays current keywords in input', () => {
    render(
      <KeywordSearch
        keywords="test search"
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
  });

  it('calls onKeywordsChange when typing', async () => {
    const user = userEvent.setup();
    
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    const input = screen.getByPlaceholderText('Search news articles...');
    await user.type(input, 'test');
    
    // Should debounce the calls
    await waitFor(() => {
      expect(mockOnKeywordsChange).toHaveBeenCalledWith('test');
    }, { timeout: 1000 });
  });

  it('calls onKeywordsChange when Enter is pressed', async () => {
    const user = userEvent.setup();
    
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    const input = screen.getByPlaceholderText('Search news articles...');
    await user.type(input, 'test{enter}');
    
    expect(mockOnKeywordsChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when there is text', () => {
    render(
      <KeywordSearch
        keywords="test"
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <KeywordSearch
        keywords="test"
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /clear/i }));
    
    expect(mockOnKeywordsChange).toHaveBeenCalledWith('');
  });

  it('displays keyword chips for active search terms', () => {
    render(
      <KeywordSearch
        keywords="test search terms"
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    expect(screen.getByText('Searching for:')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('terms')).toBeInTheDocument();
  });

  it('allows removing individual keyword chips', async () => {
    const user = userEvent.setup();
    
    render(
      <KeywordSearch
        keywords="test search terms"
        onKeywordsChange={mockOnKeywordsChange}
      />
    );
    
    // Find the chip for "test" and click its delete button
    const testChip = screen.getByText('test');
    const deleteButton = testChip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }
    
    expect(mockOnKeywordsChange).toHaveBeenCalledWith('search terms');
  });

  it('loads search history from localStorage', () => {
    const mockHistory = ['previous search', 'another search'];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory));
    
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
        showHistory={true}
      />
    );
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('newsmap-search-history');
  });

  it('saves search to history when search is performed', async () => {
    const user = userEvent.setup();
    localStorageMock.getItem.mockReturnValue('[]');
    
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
        showHistory={true}
      />
    );
    
    const input = screen.getByPlaceholderText('Search news articles...');
    await user.type(input, 'new search{enter}');
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'newsmap-search-history',
      JSON.stringify(['new search'])
    );
  });

  it('disables input when disabled prop is true', () => {
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
        disabled={true}
      />
    );
    
    expect(screen.getByPlaceholderText('Search news articles...')).toBeDisabled();
  });

  it('uses custom placeholder when provided', () => {
    render(
      <KeywordSearch
        keywords=""
        onKeywordsChange={mockOnKeywordsChange}
        placeholder="Custom placeholder"
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });
});

describe('highlightSearchTerms', () => {
  it('returns original text when no search terms', () => {
    const result = highlightSearchTerms('test text', '');
    expect(result).toBe('test text');
  });

  it('highlights single search term', () => {
    const result = highlightSearchTerms('test text', 'test');
    // Should return React elements with highlighted text
    expect(result).not.toBe('test text');
  });

  it('highlights multiple search terms', () => {
    const result = highlightSearchTerms('test text with multiple terms', 'test multiple');
    // Should return React elements with highlighted text
    expect(result).not.toBe('test text with multiple terms');
  });

  it('handles case insensitive matching', () => {
    const result = highlightSearchTerms('Test Text', 'test');
    // Should highlight regardless of case
    expect(result).not.toBe('Test Text');
  });

  it('handles special regex characters', () => {
    const result = highlightSearchTerms('test (text) with [brackets]', '(text)');
    // Should not throw error and should work with special characters
    expect(result).not.toBe('test (text) with [brackets]');
  });
});