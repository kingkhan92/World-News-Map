import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArticlePreview } from '../ArticlePreview';
import { MapPin } from '../../../types/map';

const mockPin: MapPin = {
  id: 1,
  latitude: 40.7128,
  longitude: -74.0060,
  article: {
    id: 1,
    title: 'Test Article Title',
    summary: 'This is a test article summary that should be displayed in the preview.',
    source: 'Test News',
    biasScore: 35,
    url: 'https://example.com/article',
    locationName: 'New York, NY',
    publishedAt: new Date('2024-01-15T10:30:00Z'),
  },
};

describe('ArticlePreview', () => {
  const mockOnReadMore = jest.fn();
  const mockOnOpenOriginal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders article information correctly', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
      />
    );

    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText(/This is a test article summary/)).toBeInTheDocument();
    expect(screen.getByText('Test News')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
  });

  it('displays bias indicator', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
      />
    );

    // Should show bias score
    expect(screen.getByText(/35/)).toBeInTheDocument();
  });

  it('calls onReadMore when Read More button is clicked', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
      />
    );

    fireEvent.click(screen.getByText('Read More'));
    expect(mockOnReadMore).toHaveBeenCalledWith(mockPin);
  });

  it('calls onOpenOriginal when Original button is clicked', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
      />
    );

    fireEvent.click(screen.getByText('Original'));
    expect(mockOnOpenOriginal).toHaveBeenCalledWith('https://example.com/article');
  });

  it('renders in compact mode', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
        compact={true}
      />
    );

    // In compact mode, title should still be visible but truncated
    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
  });

  it('hides actions when showActions is false', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
        showActions={false}
      />
    );

    expect(screen.queryByText('Read More')).not.toBeInTheDocument();
    expect(screen.queryByText('Original')).not.toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const pinWithoutOptionalFields: MapPin = {
      ...mockPin,
      article: {
        ...mockPin.article,
        url: undefined,
        locationName: undefined,
        publishedAt: undefined,
      },
    };

    render(
      <ArticlePreview
        pin={pinWithoutOptionalFields}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
      />
    );

    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.queryByText('New York, NY')).not.toBeInTheDocument();
    expect(screen.queryByText('Original')).not.toBeInTheDocument();
  });

  it('generates consistent source avatar colors', () => {
    render(
      <ArticlePreview
        pin={mockPin}
        onReadMore={mockOnReadMore}
        onOpenOriginal={mockOnOpenOriginal}
      />
    );

    // Should render source initials in avatar
    expect(screen.getByText('TN')).toBeInTheDocument();
  });
});