import { useState, useCallback, useRef } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface UseLoadingStateReturn {
  loading: LoadingState;
  isLoading: (key?: string) => boolean;
  isAnyLoading: () => boolean;
  setLoading: (key: string, loading: boolean) => void;
  withLoading: <T>(key: string, promise: Promise<T>) => Promise<T>;
  clearLoading: () => void;
}

export const useLoadingState = (initialState: LoadingState = {}): UseLoadingStateReturn => {
  const [loading, setLoadingState] = useState<LoadingState>(initialState);
  const loadingRef = useRef<LoadingState>(initialState);

  // Update ref when state changes
  loadingRef.current = loading;

  const isLoading = useCallback((key = 'default'): boolean => {
    return loading[key] || false;
  }, [loading]);

  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loading).some(Boolean);
  }, [loading]);

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const withLoading = useCallback(async <T>(
    key: string,
    promise: Promise<T>
  ): Promise<T> => {
    setLoading(key, true);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  const clearLoading = useCallback(() => {
    setLoadingState({});
  }, []);

  return {
    loading,
    isLoading,
    isAnyLoading,
    setLoading,
    withLoading,
    clearLoading
  };
};

// Hook for simple single loading state
export const useSimpleLoading = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);

  const withLoading = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    setLoading,
    withLoading
  };
};

// Hook for managing async operations with loading and error states
export const useAsyncOperation = <T = any>() => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setData(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
};

// Hook for managing multiple async operations
export const useAsyncOperations = () => {
  const [operations, setOperations] = useState<{
    [key: string]: {
      loading: boolean;
      error: Error | null;
      data: any;
    };
  }>({});

  const execute = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setOperations(prev => ({
      ...prev,
      [key]: { loading: true, error: null, data: null }
    }));

    try {
      const result = await operation();
      setOperations(prev => ({
        ...prev,
        [key]: { loading: false, error: null, data: result }
      }));
      return result;
    } catch (err) {
      const error = err as Error;
      setOperations(prev => ({
        ...prev,
        [key]: { loading: false, error, data: null }
      }));
      throw error;
    }
  }, []);

  const getOperation = useCallback((key: string) => {
    return operations[key] || { loading: false, error: null, data: null };
  }, [operations]);

  const isLoading = useCallback((key: string) => {
    return operations[key]?.loading || false;
  }, [operations]);

  const isAnyLoading = useCallback(() => {
    return Object.values(operations).some(op => op.loading);
  }, [operations]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setOperations(prev => {
        const { [key]: removed, ...rest } = prev;
        return rest;
      });
    } else {
      setOperations({});
    }
  }, []);

  return {
    operations,
    execute,
    getOperation,
    isLoading,
    isAnyLoading,
    reset
  };
};