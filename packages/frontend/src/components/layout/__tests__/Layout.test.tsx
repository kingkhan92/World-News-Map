import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Layout } from '../Layout';
import { AuthContext } from '../../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  preferences: {
    defaultView: 'map' as const,
    preferredSources: ['bbc'],
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Layout', () => {
  it('renders navigation and main content area', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays user email in navigation when logged in', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows login link when not logged in', () => {
    const noUserContext = { ...mockAuthContext, user: null };
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthContext.Provider value={noUserContext}>
            <Layout>
              <div>Content</div>
            </Layout>
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderWithProviders(
      <Layout>
        <div data-testid="child-content">Child Component</div>
      </Layout>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('includes navigation links', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    expect(screen.getByText(/news map/i)).toBeInTheDocument();
  });
});