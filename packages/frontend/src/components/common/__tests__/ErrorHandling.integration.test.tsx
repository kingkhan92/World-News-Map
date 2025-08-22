import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import ErrorBoundary from '../ErrorBoundary';
import ComponentErrorBoundary from '../ComponentErrorBoundary';
import { errorService } from '../../../services/errorService';
import { apiClient } from '../../../services/apiClient';

// Mock components that throw errors
const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error from component');
  }
  return <div>Component rendered successfully</div>;
};

const AsyncThrowingComponent: React.FC = () => {
  React.useEffect(() => {
    // Simulate async error
    setTimeout(() => {
      throw new Error('Async error');
    }, 100);
  }, []);
  
  return <div>Async component</div>;
};

// Test wrapper with theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('Error Handling Integration', () => {
  beforeEach(() => {
    // Clear error reports before each test
    errorService.clearErrorReports();
    
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ErrorBoundary', () => {
    it('should catch and display component errors', () => {
      render(
        <TestWrapper>
          <ErrorBoundary level="component">
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should show page-level error UI for page errors', () => {
      render(
        <TestWrapper>
          <ErrorBoundary level="page">
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText(/An error occurred while loading this page/)).toBeInTheDocument();
    });

    it('should show critical error UI for critical errors', () => {
      render(
        <TestWrapper>
          <ErrorBoundary level="critical">
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText(/A critical error occurred/)).toBeInTheDocument();
    });

    it('should allow retry functionality', async () => {
      let shouldThrow = true;
      
      const RetryableComponent = () => {
        if (shouldThrow) {
          throw new Error('Retryable error');
        }
        return <div>Success after retry</div>;
      };

      render(
        <TestWrapper>
          <ErrorBoundary level="component">
            <RetryableComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();

      // Simulate fixing the error
      shouldThrow = false;
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });
    });

    it('should report errors to error service', () => {
      const onError = jest.fn();
      
      render(
        <TestWrapper>
          <ErrorBoundary level="component" onError={onError}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  describe('ComponentErrorBoundary', () => {
    it('should show minimal error UI for component errors', () => {
      render(
        <TestWrapper>
          <ComponentErrorBoundary componentName="TestComponent">
            <ThrowingComponent />
          </ComponentErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('TestComponent failed to load')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  describe('Error Service', () => {
    it('should report and store errors', () => {
      const error = new Error('Test error');
      const errorId = errorService.reportError(error, {
        component: 'TestComponent',
        action: 'test action'
      }, false); // Don't show toast in test

      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      
      const reports = errorService.getErrorReports();
      expect(reports).toHaveLength(1);
      expect(reports[0].error.message).toBe('Test error');
      expect(reports[0].context.component).toBe('TestComponent');
    });

    it('should retry operations with backoff', async () => {
      let attempts = 0;
      const failingOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Operation failed');
        }
        return 'success';
      });

      const result = await errorService.retryWithBackoff(failingOperation, {
        maxRetries: 3,
        baseDelay: 10 // Short delay for testing
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const alwaysFailingOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        errorService.retryWithBackoff(alwaysFailingOperation, {
          maxRetries: 2,
          baseDelay: 10
        })
      ).rejects.toThrow('Always fails');

      expect(alwaysFailingOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('API Client Error Handling', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = jest.fn();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        apiClient.get('/test-endpoint', { showErrorToast: false })
      ).rejects.toThrow();

      const reports = errorService.getErrorReports();
      expect(reports).toHaveLength(1);
      expect(reports[0].context.component).toBe('ApiClient');
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          error: {
            id: 'test-error-id',
            code: 'NOT_FOUND',
            message: 'Resource not found',
            retryable: false
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        apiClient.get('/test-endpoint', { showErrorToast: false })
      ).rejects.toThrow('Resource not found');
    });

    it('should retry retryable errors', async () => {
      let attempts = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Server error',
                retryable: true
              }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' })
        });
      });

      const result = await apiClient.get('/test-endpoint', {
        retries: 3,
        retryDelay: 10,
        showErrorToast: false
      });

      expect(result.data).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  describe('Global Error Handling', () => {
    it('should handle unhandled promise rejections', async () => {
      const originalHandler = window.onunhandledrejection;
      
      // Trigger unhandled rejection
      const promise = Promise.reject(new Error('Unhandled rejection'));
      
      // Wait for the error to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const reports = errorService.getErrorReports();
      expect(reports.length).toBeGreaterThan(0);
      
      // Restore original handler
      window.onunhandledrejection = originalHandler;
      
      // Consume the promise to prevent actual unhandled rejection
      promise.catch(() => {});
    });
  });
});