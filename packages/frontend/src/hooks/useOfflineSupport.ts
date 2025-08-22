import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface OfflineData {
  articles: any[];
  userPreferences: any;
  lastSync: string;
}

interface UseOfflineSupportReturn {
  isOnline: boolean;
  isOfflineMode: boolean;
  hasOfflineData: boolean;
  offlineData: OfflineData | null;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  syncWhenOnline: () => Promise<void>;
  clearOfflineData: () => void;
}

const OFFLINE_STORAGE_KEY = 'newsmap_offline_data';
const OFFLINE_MODE_KEY = 'newsmap_offline_mode';

export const useOfflineSupport = (): UseOfflineSupportReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  });
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);

  // Load offline data on mount
  useEffect(() => {
    loadOfflineData();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Syncing data...', {
        duration: 3000,
      });
      
      // Auto-sync when coming back online
      if (isOfflineMode) {
        syncWhenOnline();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      if (offlineData) {
        toast.error('Connection lost. Using cached data.', {
          duration: 5000,
        });
      } else {
        toast.error('Connection lost. Limited functionality available.', {
          duration: 5000,
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOfflineMode, offlineData]);

  const loadOfflineData = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setOfflineData(data);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, []);

  const saveOfflineData = useCallback((data: OfflineData) => {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(data));
      setOfflineData(data);
    } catch (error) {
      console.error('Failed to save offline data:', error);
      toast.error('Failed to cache data for offline use');
    }
  }, []);

  const enableOfflineMode = useCallback(() => {
    setIsOfflineMode(true);
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
    toast.success('Offline mode enabled. Data will be cached for offline use.');
  }, []);

  const disableOfflineMode = useCallback(() => {
    setIsOfflineMode(false);
    localStorage.setItem(OFFLINE_MODE_KEY, 'false');
    toast.success('Offline mode disabled.');
  }, []);

  const syncWhenOnline = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    try {
      toast.loading('Syncing data...', { id: 'sync' });
      
      // This would typically sync with your API
      // For now, we'll just update the last sync time
      if (offlineData) {
        const updatedData = {
          ...offlineData,
          lastSync: new Date().toISOString()
        };
        saveOfflineData(updatedData);
      }
      
      toast.success('Data synced successfully', { id: 'sync' });
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync data', { id: 'sync' });
    }
  }, [isOnline, offlineData, saveOfflineData]);

  const clearOfflineData = useCallback(() => {
    try {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      setOfflineData(null);
      toast.success('Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast.error('Failed to clear offline data');
    }
  }, []);

  return {
    isOnline,
    isOfflineMode,
    hasOfflineData: !!offlineData,
    offlineData,
    enableOfflineMode,
    disableOfflineMode,
    syncWhenOnline,
    clearOfflineData
  };
};

// Utility function to cache data for offline use
export const cacheDataForOffline = (
  articles: any[],
  userPreferences: any = {}
): void => {
  try {
    const offlineData: OfflineData = {
      articles: articles.slice(0, 100), // Limit to prevent storage issues
      userPreferences,
      lastSync: new Date().toISOString()
    };
    
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offlineData));
  } catch (error) {
    console.error('Failed to cache data for offline use:', error);
  }
};

// Utility function to get cached data when offline
export const getCachedData = (): OfflineData | null => {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get cached data:', error);
    return null;
  }
};