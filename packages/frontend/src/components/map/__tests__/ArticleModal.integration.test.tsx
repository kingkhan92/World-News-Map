import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArticleModal } from '../ArticleModal';
import { MapPin } from '../../../types/map';
import { NewsService } from '../../../services/newsService';
import { UserService } from '../../../services/userService';

// Mock the services
jest.mock('../../../services/newsService');
jest.mock('../../../services/userService');

const mockedNewsService = NewsService as jest.Mocked<typeof NewsService>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

// Mock navigator.share and navigator.clipboard
const mockShare = jest.fn();
const mockWriteText = jest.fn();

Object.defineProperty(navigator, 'share', {
  writable: true,
  value: mockShare,
});

Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: mockWriteText,
  },
});

const mockPin: MapPin = {
  id: 1,
  latitude: 40.7128,
  longitude: -74.0060,
  article: {
    id: 1,
    title: 'Test Article Title',
    summary: 'This is a test article summary.',
    source: 'Test News',
    biasScore: 35,
    url: 'https://example.com/article',
    locationName: 'New York, NY',
    publishedAt: new Date('2024-01-15T10:30:00Z'),
  },
};

const mockFullArticle = {
  id: 1,
  title: 'Test Article Title',
  content: 'This is the full content of the test article with more detailed information.',
  summary: 'This is a test article summary.',
  url: 'https://example.com/article',
  source: 'Test News',
  publishedAt: new Date('2024-01-15T10:30:00Z'),
  latitude: 40.7128,
  longitude: -74.0060,
  locationName: 'New York, NY',
  biasScore: 35,
  biasAnalysis: {
    politicalLean: 'center' as const,
    factualAccuracy: 85,
    emotionalTone: 60,
    confidence: 90,
  },
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ArticleModal Integration', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedNewsService.getArticle.mockResolvedValue(mockFullArticle);
    mockedUserService.shareArticle.mockResolvedValue(true);
    mockedUserService.toggleBookmark.mockResolvedValue(true);
  });

  it('renders and loads article details', async () => {
    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    // Should show loading initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for article to load
    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    expect(mockedNewsService.getArticle).toHaveBeenCalledWith(1);
    expect(screen.getByText('This is the full content of the test article')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
  });

  it('handles sharing functionality', async () => {
    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockedUserService.shareArticle).toHaveBeenCalledWith(
        1,
        'Test Article Title',
        'This is a test article summary.',
        'https://example.com/article'
      );
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Article link copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('handles bookmarking functionality', async () => {
    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    const bookmarkButton = screen.getByText('Bookmark');
    fireEvent.click(bookmarkButton);

    await waitFor(() => {
      expect(mockedUserService.toggleBookmark).toHaveBeenCalledWith(1);
    });

    // Button text should change
    expect(screen.getByText('Bookmarked')).toBeInTheDocument();
  });

  it('opens original article in new tab', async () => {
    const mockWindowOpen = jest.fn();
    window.open = mockWindowOpen;

    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    const readOriginalButton = screen.getByText('Read Original');
    fireEvent.click(readOriginalButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com/article',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('displays bias analysis information', async () => {
    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    // Should show bias analysis section
    expect(screen.getByText('Bias Analysis')).toBeInTheDocument();
    expect(screen.getByText(/Centrist perspective with 85% factual accuracy/)).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockedNewsService.getArticle.mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load article details. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles share errors gracefully', async () => {
    mockedUserService.shareArticle.mockRejectedValue(new Error('Share failed'));

    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to share article. Please try again.')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    renderWithQueryClient(
      <ArticleModal
        pin={mockPin}
        open={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});