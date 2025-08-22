import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { UserProfile } from '../UserProfile';
import { AuthContext } from '../../../contexts/AuthContext';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  preferences: {
    defaultView: 'map' as const,
    preferredSources: ['bbc', 'reuters'],
    biasThreshold: 50,
    autoRefresh: true,
  },
};

const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  loading: false,
  error: null,
};

describe('UserProfile', () => {
  it('renders user information when logged in', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText(/user profile/i)).toBeInTheDocument();
  });

  it('renders login prompt when not logged in', () => {
    const noUserContext = { ...mockAuthContext, user: null };
    render(
      <AuthContext.Provider value={noUserContext}>
        <UserProfile />
      </AuthContext.Provider>
    );
    
    expect(screen.getByText(/please log in/i)).toBeInTheDocument();
  });

  it('displays user preferences', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );
    
    expect(screen.getByText(/default view.*map/i)).toBeInTheDocument();
    expect(screen.getByText(/bias threshold.*50/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const loadingContext = { ...mockAuthContext, loading: true };
    render(
      <AuthContext.Provider value={loadingContext}>
        <UserProfile />
      </AuthContext.Provider>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});