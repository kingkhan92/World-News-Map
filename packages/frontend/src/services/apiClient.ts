import { errorService } from './errorService';
import { getCachedData } from '../hooks/useOfflineSupport';
import { toast } from 'react-hot-toast';

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  retryable: boolean;
  errorId?: string;
  context?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    id: string;
    code: string;
    message: string;
    statusCode: number;
    retryable: boolean;
    timestamp: string;
  };
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  useCache?: boolean;
  showErrorToast?: boolean;
  requireAuth?: boolean;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout = 10000;
  private defaultRetries = 3;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000,
      useCache = false,
      showErrorToast = true,
      requireAuth = false
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    
    // Add authentication header if required
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (requireAuth) {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeout)
    };

    let lastError: ApiError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          const errorData: ApiResponse = await response.json().catch(() => ({}));
          
          const apiError: ApiError = new Error(
            errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
          ) as ApiError;
          
          apiError.statusCode = response.status;
          apiError.code = errorData.error?.code || `HTTP_${response.status}`;
          apiError.retryable = errorData.error?.retryable || this.isRetryableStatus(response.status);
          apiError.errorId = errorData.error?.id;
          apiError.context = { url, method: options.method || 'GET', attempt };

          throw apiError;
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = this.normalizeError(error as Error, { url, method: options.method || 'GET', attempt });

        // Don't retry on certain errors
        if (!this.shouldRetry(lastError, attempt, retries)) {
          break;
        }

        // Wait before retrying
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // Handle offline fallback
    if (!navigator.onLine && useCache) {
      const cachedData = this.getCachedResponse<T>(endpoint);
      if (cachedData) {
        toast.success('Using cached data (offline)', { duration: 3000 });
        return cachedData;
      }
    }

    // Report error and show toast
    if (showErrorToast) {
      errorService.reportError(lastError!, {
        component: 'ApiClient',
        action: `${options.method || 'GET'} ${endpoint}`
      });
    }

    throw lastError!;
  }

  private normalizeError(error: Error, context: any): ApiError {
    if ((error as ApiError).statusCode) {
      return error as ApiError;
    }

    const apiError = error as ApiError;
    
    // Handle different error types
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      apiError.statusCode = 408;
      apiError.code = 'TIMEOUT';
      apiError.retryable = true;
    } else if (error.message.includes('fetch')) {
      apiError.statusCode = 0;
      apiError.code = 'NETWORK_ERROR';
      apiError.retryable = true;
    } else {
      apiError.statusCode = 500;
      apiError.code = 'UNKNOWN_ERROR';
      apiError.retryable = false;
    }

    apiError.context = context;
    return apiError;
  }

  private isRetryableStatus(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  private shouldRetry(error: ApiError, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;
    if (!error.retryable) return false;
    
    // Don't retry authentication errors
    if (error.statusCode === 401 || error.statusCode === 403) return false;
    
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCachedResponse<T>(endpoint: string): T | null {
    try {
      const cachedData = getCachedData();
      if (!cachedData) return null;

      // Simple cache lookup based on endpoint
      if (endpoint.includes('/articles')) {
        return cachedData.articles as T;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get cached response:', error);
      return null;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET' }, config);
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      },
      config
    );
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      },
      config
    );
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' }, config);
  }

  // Utility methods
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility function for handling API calls with loading states
export const withLoadingState = async <T>(
  apiCall: () => Promise<T>,
  loadingMessage = 'Loading...'
): Promise<T> => {
  const toastId = toast.loading(loadingMessage);
  
  try {
    const result = await apiCall();
    toast.success('Success!', { id: toastId });
    return result;
  } catch (error) {
    toast.error('Operation failed', { id: toastId });
    throw error;
  }
};

// Utility function for optimistic updates
export const withOptimisticUpdate = async <T>(
  optimisticUpdate: () => void,
  apiCall: () => Promise<T>,
  rollback: () => void
): Promise<T> => {
  // Apply optimistic update
  optimisticUpdate();
  
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    // Rollback on error
    rollback();
    throw error;
  }
};