import { useState, useCallback } from 'react';
import { UserService } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

export interface UseUserInteractionsReturn {
  recordView: (articleId: number) => Promise<void>;
  toggleBookmark: (articleId: number) => Promise<{ isBookmarked: boolean; message: string }>;
  shareArticle: (articleId: number, title: string, summary: string, url: string) => Promise<boolean>;
  checkBookmarkStatus: (articleId: number) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useUserInteractions = (): UseUserInteractionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const recordView = useCallback(async (articleId: number) => {
    if (!isAuthenticated) return;
    
    try {
      setError(null);
      await UserService.recordInteraction(articleId, 'view');
    } catch (err) {
      console.error('Failed to record view:', err);
      setError('Failed to record view');
    }
  }, [isAuthenticated]);

  const toggleBookmark = useCallback(async (articleId: number) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }
    
    try {
      setLoading(true);
      setError(null);
      const result = await UserService.toggleBookmark(articleId);
      return result;
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      setError('Failed to toggle bookmark');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const shareArticle = useCallback(async (
    articleId: number, 
    title: string, 
    summary: string, 
    url: string
  ) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }
    
    try {
      setLoading(true);
      setError(null);
      const result = await UserService.shareArticle(articleId, title, summary, url);
      return result;
    } catch (err) {
      console.error('Failed to share article:', err);
      setError('Failed to share article');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const checkBookmarkStatus = useCallback(async (articleId: number) => {
    if (!isAuthenticated) return false;
    
    try {
      setError(null);
      return await UserService.isBookmarked(articleId);
    } catch (err) {
      console.error('Failed to check bookmark status:', err);
      setError('Failed to check bookmark status');
      return false;
    }
  }, [isAuthenticated]);

  return {
    recordView,
    toggleBookmark,
    shareArticle,
    checkBookmarkStatus,
    loading,
    error
  };
};