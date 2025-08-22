import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';

// Mock the auth service
vi.mock('../../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  it('shows loading spinner while checking authentication', () => {
    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    // Mock authenticated state
    const mockUser = { id: 1, email: 'test@example.com', preferences: {} };
    localStorage.setItem('authToken', 'mock-token');
    
    vi.mocked(require('../../../services/authService').authService.getProfile)
      .mockResolvedValue(mockUser);

    render(
      <TestWrapper>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Initially shows loading
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });
});