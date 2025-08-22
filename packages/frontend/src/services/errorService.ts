import { toast } from 'react-hot-toast';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  errorId: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class ErrorService {
  private static instance: ErrorService;
  private errorReports: Array<any> = [];
  private maxReports = 50;

  private constructor() {
    this.loadStoredReports();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.reportError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { component: 'Global', action: 'Promise Rejection' }
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.reportError(
        event.error || new Error(event.message),
        { component: 'Global', action: 'JavaScript Error' }
      );
    });
  }

  private loadStoredReports() {
    try {
      const stored = localStorage.getItem('errorReports');
      if (stored) {
        this.errorReports = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored error reports:', error);
    }
  }

  private saveReports() {
    try {
      localStorage.setItem('errorReports', JSON.stringify(this.errorReports));
    } catch (error) {
      console.warn('Failed to save error reports:', error);
    }
  }

  public reportError(
    error: Error,
    context: Partial<ErrorContext> = {},
    showToast = true
  ): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorId,
      ...context
    };

    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: fullContext
    };

    // Add to reports
    this.errorReports.push(errorReport);
    
    // Keep only recent reports
    if (this.errorReports.length > this.maxReports) {
      this.errorReports.splice(0, this.errorReports.length - this.maxReports);
    }
    
    this.saveReports();

    // Show user-friendly message
    if (showToast) {
      this.showUserFriendlyError(error, errorId);
    }

    // Log for debugging
    console.error('Error reported:', errorReport);

    return errorId;
  }

  private showUserFriendlyError(error: Error, errorId: string) {
    const friendlyMessage = this.getFriendlyErrorMessage(error);
    
    toast.error(
      `${friendlyMessage}\nError ID: ${errorId}`,
      {
        duration: 6000,
        position: 'top-right',
        style: {
          maxWidth: '400px'
        }
      }
    );
  }

  private getFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('fetch') || message.includes('network')) {
      return 'Connection problem. Please check your internet connection.';
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Please log in again to continue.';
    }
    
    // Permission errors
    if (message.includes('forbidden') || message.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested resource was not found.';
    }
    
    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return 'Server is temporarily unavailable. Please try again later.';
    }
    
    // Timeout errors
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // Generic fallback
    return 'Something went wrong. Please try again.';
  }

  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2
    } = config;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          // Final attempt failed
          this.reportError(lastError, {
            action: 'Retry Failed',
            component: 'RetryService'
          });
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getErrorReports(): Array<any> {
    return [...this.errorReports];
  }

  public clearErrorReports(): void {
    this.errorReports = [];
    this.saveReports();
  }

  public getErrorById(errorId: string): any | null {
    return this.errorReports.find(report => 
      report.context.errorId === errorId
    ) || null;
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

// Utility functions for common error handling patterns
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorService.reportError(error as Error, context);
      throw error;
    }
  };
};

export const withRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  retryConfig?: Partial<RetryConfig>,
  context?: Partial<ErrorContext>
) => {
  return async (...args: T): Promise<R> => {
    return errorService.retryWithBackoff(
      () => fn(...args),
      retryConfig
    );
  };
};