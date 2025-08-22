import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RegisterForm } from '../RegisterForm';
import { AuthContext } from '../../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const mockRegister = vi.fn();
const mockAuthContext = {
  user: null,
  login: vi.fn(),
  register: mockRegister,
  logout: vi.fn(),
  loading: false,
  error: null,
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form fields', () => {
    renderWithProviders(<RegisterForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    renderWithProviders(<RegisterForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /register/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    renderWithProviders(<RegisterForm />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /register/i });
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('calls register function with valid data', async () => {
    mockRegister.mockResolvedValue({ success: true });
    renderWithProviders(<RegisterForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /register/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays loading state during registration', async () => {
    const loadingContext = { ...mockAuthContext, loading: true };
    render(
      <BrowserRouter>
        <AuthContext.Provider value={loadingContext}>
          <RegisterForm />
        </AuthContext.Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
  });

  it('displays error message on registration failure', () => {
    const errorContext = { ...mockAuthContext, error: 'Registration failed' };
    render(
      <BrowserRouter>
        <AuthContext.Provider value={errorContext}>
          <RegisterForm />
        </AuthContext.Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
  });
});