import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserPreferencesProvider, useUserPreferences } from '../UserPreferencesContext';
import { AuthProvider } from '../AuthContext';

// Mock the user service
const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();

jest.mock('../../services/userService', () => ({
  UserService: {
    getPreferences: mockGetPreferences,
    updatePreferences: mockUpdatePreferences
  }
}));

// Mock auth context
const mockAuthContext = {
  user: { id: 1, email: 'test@example.com' },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null
};

jest.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

// Test component that uses the preferences context
const TestComponent: React.FC = () => {
  const { preferences, updatePreferences, loading, error } = useUserPreferences();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="default-view">{preferences.defaultView}</div>
      <div data-testid="bias-threshold">{preferences.biasThreshold}</div>
      <div data-testid="auto-refresh">{preferences.autoRefresh ? 'true' : 'false'}</div>
      <div data-testid="preferred-sources">{preferences.preferredSources.join(',')}</div>
      <button
        onClick={() => updatePreferences({ defaultView: 'globe' })}
        data-testid="update-button"
      >
        Update
      </button>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserPreferencesProvider>
        {children}
      </UserPreferencesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

describe('UserPreferencesContext', () => {
  const mockPreferences = {
    defaultView: 'map' as const,
    preferredSources: ['BBC News', 'CNN'],
    biasThreshold: 50,
    autoRefresh: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('loads user preferences on mount when authenticated', async () => {
    mockGetPreferences.mockResolvedValue(mockPreferences);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    expect(screen.getByTestId('default-view')).toHaveTextContent('map');
    expect(screen.getByTestId('bias-threshold')).toHaveTextContent('50');
    expect(screen.getByTestId('auto-refresh')).toHaveTextContent('true');
    expect(screen.getByTestId('preferred-sources')).toHaveTextContent('BBC News,CNN');
    expect(mockGetPreferences).toHaveBeenCalled();
  });

  it('uses default preferences when not authenticated', async () => {
    // Mock unauthenticated state
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.user = null;

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    expect(screen.getByTestId('default-view')).toHaveTextContent('map');
    expect(screen.getByTestId('bias-threshold')).toHaveTextContent('50');
    expect(screen.getByTestId('auto-refresh')).toHaveTextContent('true');
    expect(screen.getByTestId('preferred-sources')).toHaveTextContent('');
    expect(mockGetPreferences).not.toHaveBeenCalled();

    // Reset for other tests
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.user = { id: 1, email: 'test@example.com' };
  });

  it('handles loading error gracefully', async () => {
    mockGetPreferences.mockRejectedValue(new Error('Failed to load'));

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load preferences');
    });

    // Should still show default preferences
    expect(screen.getByTestId('default-view')).toHaveTextContent('map');
    expect(screen.getByTestId('bias-threshold')).toHaveTextContent('50');
  });

  it('updates preferences successfully', async () => {
    const updatedPreferences = { ...mockPreferences, defaultView: 'globe' as const };
    
    mockGetPreferences.mockResolvedValue(mockPreferences);
    mockUpdatePreferences.mockResolvedValue(updatedPreferences);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Update preferences
    act(() => {
      screen.getByTestId('update-button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('default-view')).toHaveTextContent('globe');
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ defaultView: 'globe' });
  });

  it('handles update error', async () => {
    mockGetPreferences.mockResolvedValue(mockPreferences);
    mockUpdatePreferences.mockRejectedValue(new Error('Update failed'));

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Try to update preferences
    await act(async () => {
      screen.getByTestId('update-button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to update preferences');
    });
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useUserPreferences must be used within a UserPreferencesProvider');

    consoleSpy.mockRestore();
  });
});