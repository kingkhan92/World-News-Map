import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LogoutButton } from '../LogoutButton';
import { AuthContext } from '../../../contexts/AuthContext';

const mockLogout = vi.fn();
const mockAuthContext = {
  user: { id: 1, email: 'test@example.com', preferences: {} },
  login: vi.fn(),
  register: vi.fn(),
  logout: mockLogout,
  loading: false,
  error: null,
};

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logout button when user is logged in', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LogoutButton />
      </AuthContext.Provider>
    );
    
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('does not render when user is not logged in', () => {
    const noUserContext = { ...mockAuthContext, user: null };
    render(
      <AuthContext.Provider value={noUserContext}>
        <LogoutButton />
      </AuthContext.Provider>
    );
    
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('calls logout function when clicked', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LogoutButton />
      </AuthContext.Provider>
    );
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during logout', () => {
    const loadingContext = { ...mockAuthContext, loading: true };
    render(
      <AuthContext.Provider value={loadingContext}>
        <LogoutButton />
      </AuthContext.Provider>
    );
    
    expect(screen.getByRole('button', { name: /logout/i })).toBeDisabled();
  });
});