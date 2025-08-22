import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../../../theme';
import { SettingsPanel } from '../SettingsPanel';
import { UserPreferencesProvider } from '../../../contexts/UserPreferencesContext';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the user service
jest.mock('../../../services/userService', () => ({
  UserService: {
    getPreferences: jest.fn().mockResolvedValue({
      defaultView: 'map',
      preferredSources: ['BBC News'],
      biasThreshold: 50,
      autoRefresh: true
    }),
    updatePreferences: jest.fn().mockResolvedValue({
      defaultView: 'globe',
      preferredSources: ['BBC News', 'CNN'],
      biasThreshold: 75,
      autoRefresh: false
    })
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserPreferencesProvider>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

describe('SettingsPanel', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings panel when open', async () => {
    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    expect(screen.getByText('Default Map View')).toBeInTheDocument();
    expect(screen.getByText('Bias Threshold:')).toBeInTheDocument();
    expect(screen.getByText('Auto-refresh news data')).toBeInTheDocument();
    expect(screen.getByText('Preferred News Sources')).toBeInTheDocument();
  });

  it('allows changing default view preference', async () => {
    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    const globeRadio = screen.getByLabelText('3D Globe');
    fireEvent.click(globeRadio);

    expect(globeRadio).toBeChecked();
  });

  it('allows adjusting bias threshold', async () => {
    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('allows toggling auto-refresh', async () => {
    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    const autoRefreshSwitch = screen.getByRole('checkbox');
    fireEvent.click(autoRefreshSwitch);

    expect(autoRefreshSwitch).not.toBeChecked();
  });

  it('allows adding preferred news sources', async () => {
    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    const sourceInput = screen.getByPlaceholderText('Add custom source');
    const addButton = screen.getByText('Add');

    fireEvent.change(sourceInput, { target: { value: 'Reuters' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Reuters')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('saves preferences when save is clicked', async () => {
    const { UserService } = require('../../../services/userService');

    render(
      <TestWrapper>
        <SettingsPanel open={true} onClose={mockOnClose} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(UserService.updatePreferences).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});