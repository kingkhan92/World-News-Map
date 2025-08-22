import { UserService } from '../userService';
import { api } from '../api';

// Mock the api module
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

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

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordInteraction', () => {
    it('records user interaction successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            userId: 1,
            articleId: 123,
            interactionType: 'bookmark',
            timestamp: '2024-01-15T10:30:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await UserService.recordInteraction(123, 'bookmark');

      expect(mockedApi.post).toHaveBeenCalledWith('/user/interaction', {
        articleId: 123,
        interactionType: 'bookmark',
      });
      expect(result).toEqual(mockResponse.data.data);
    });

    it('handles error when recording interaction fails', async () => {
      mockedApi.post.mockRejectedValue(new Error('API Error'));

      await expect(UserService.recordInteraction(123, 'view')).rejects.toThrow('API Error');
    });
  });

  describe('getHistory', () => {
    it('fetches user history successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            history: [
              {
                userId: 1,
                articleId: 123,
                interactionType: 'view',
                timestamp: '2024-01-15T10:30:00Z',
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          },
        },
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await UserService.getHistory(1, 20);

      expect(mockedApi.get).toHaveBeenCalledWith('/user/history?page=1&limit=20');
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getBookmarks', () => {
    it('fetches user bookmarks successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            history: [
              {
                userId: 1,
                articleId: 123,
                interactionType: 'bookmark',
                timestamp: '2024-01-15T10:30:00Z',
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          },
        },
      };

      mockedApi.get.mockResolvedValue(mockResponse);

      const result = await UserService.getBookmarks(1, 20);

      expect(mockedApi.get).toHaveBeenCalledWith('/user/history?page=1&limit=20&type=bookmark');
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('shareArticle', () => {
    it('shares article using native share API', async () => {
      const mockResponse = {
        data: {
          data: {
            userId: 1,
            articleId: 123,
            interactionType: 'share',
            timestamp: '2024-01-15T10:30:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);
      mockShare.mockResolvedValue(undefined);

      const result = await UserService.shareArticle(
        123,
        'Test Title',
        'Test Summary',
        'https://example.com'
      );

      expect(mockedApi.post).toHaveBeenCalledWith('/user/interaction', {
        articleId: 123,
        interactionType: 'share',
      });
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Title',
        text: 'Test Summary',
        url: 'https://example.com',
      });
      expect(result).toBe(true);
    });

    it('falls back to clipboard when native share is not available', async () => {
      const mockResponse = {
        data: {
          data: {
            userId: 1,
            articleId: 123,
            interactionType: 'share',
            timestamp: '2024-01-15T10:30:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);
      
      // Temporarily remove navigator.share
      const originalShare = navigator.share;
      delete (navigator as any).share;
      
      mockWriteText.mockResolvedValue(undefined);

      const result = await UserService.shareArticle(
        123,
        'Test Title',
        'Test Summary',
        'https://example.com'
      );

      expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
      expect(result).toBe(true);

      // Restore navigator.share
      (navigator as any).share = originalShare;
    });

    it('handles share error', async () => {
      const mockResponse = {
        data: {
          data: {
            userId: 1,
            articleId: 123,
            interactionType: 'share',
            timestamp: '2024-01-15T10:30:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);
      mockShare.mockRejectedValue(new Error('Share failed'));

      await expect(
        UserService.shareArticle(123, 'Test Title', 'Test Summary', 'https://example.com')
      ).rejects.toThrow('Share failed');
    });
  });

  describe('toggleBookmark', () => {
    it('toggles bookmark successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            userId: 1,
            articleId: 123,
            interactionType: 'bookmark',
            timestamp: '2024-01-15T10:30:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await UserService.toggleBookmark(123);

      expect(mockedApi.post).toHaveBeenCalledWith('/user/interaction', {
        articleId: 123,
        interactionType: 'bookmark',
      });
      expect(result).toBe(true);
    });

    it('handles bookmark error', async () => {
      mockedApi.post.mockRejectedValue(new Error('Bookmark failed'));

      await expect(UserService.toggleBookmark(123)).rejects.toThrow('Bookmark failed');
    });
  });

  describe('isBookmarked', () => {
    it('returns false as placeholder', async () => {
      const result = await UserService.isBookmarked(123);
      expect(result).toBe(false);
    });
  });
});