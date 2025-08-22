import { api } from './api';
import { ApiResponse } from '../types/api';
import { UserPreferences } from '@shared/types';

export interface UserInteraction {
  id: number;
  userId: number;
  articleId: number;
  interactionType: 'view' | 'bookmark' | 'share';
  timestamp: string;
  article_title?: string;
  article_url?: string;
}

export interface UserHistory {
  history: UserInteraction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserService {
  /**
   * Record a user interaction with an article
   */
  static async recordInteraction(
    articleId: number, 
    interactionType: 'view' | 'bookmark' | 'share'
  ): Promise<{ interaction: UserInteraction; message: string }> {
    try {
      const response = await api.post<ApiResponse<{ interaction: UserInteraction; message: string }>>('/user/interaction', {
        articleId,
        interactionType,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error recording user interaction:', error);
      throw error;
    }
  }

  /**
   * Get user interaction history
   */
  static async getHistory(page: number = 1, limit: number = 20): Promise<UserHistory> {
    try {
      const response = await api.get<ApiResponse<UserHistory>>(
        `/user/history?page=${page}&limit=${limit}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user history:', error);
      throw error;
    }
  }

  /**
   * Get user bookmarks (filtered history)
   */
  static async getBookmarks(page: number = 1, limit: number = 20): Promise<UserHistory> {
    try {
      const response = await api.get<ApiResponse<UserHistory>>(
        `/user/history?page=${page}&limit=${limit}&type=bookmark`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user bookmarks:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get<ApiResponse<{ preferences: UserPreferences }>>('/user/preferences');
      return response.data.data.preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Return default preferences on error
      return {
        defaultView: 'map',
        preferredSources: [],
        biasThreshold: 50,
        autoRefresh: true
      };
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await api.put<ApiResponse<{ preferences: UserPreferences }>>('/user/preferences', preferences);
      return response.data.data.preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Check if an article is bookmarked
   */
  static async isBookmarked(articleId: number): Promise<boolean> {
    try {
      const response = await api.get<ApiResponse<{ isBookmarked: boolean }>>(`/user/bookmarks/${articleId}`);
      return response.data.data.isBookmarked;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Share article functionality
   */
  static async shareArticle(
    articleId: number,
    title: string,
    summary: string,
    url: string
  ): Promise<boolean> {
    try {
      // Record the share interaction
      await this.recordInteraction(articleId, 'share');

      // Use native sharing if available
      if (navigator.share) {
        await navigator.share({
          title,
          text: summary,
          url,
        });
        return true;
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      throw error;
    }
  }

  /**
   * Bookmark/unbookmark an article
   */
  static async toggleBookmark(articleId: number): Promise<{ isBookmarked: boolean; message: string }> {
    try {
      // Record the bookmark interaction (backend handles toggle logic)
      const result = await this.recordInteraction(articleId, 'bookmark');
      
      // Determine if it was bookmarked or unbookmarked based on the response
      const isBookmarked = !result.message.includes('removed');
      
      return {
        isBookmarked,
        message: result.message
      };
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      throw error;
    }
  }
}

export default UserService;