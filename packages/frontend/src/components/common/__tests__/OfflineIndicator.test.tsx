import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { OfflineIndicator } from '../OfflineIndicator';

// Mock the offline support hook
vi.mock('../../../hooks/useOfflineSupport', () => ({
  useOfflineSupport: vi.fn(),
}));

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows offline indicator when offline', () => {
    const { useOfflineSupport } = require('../../../hooks/useOfflineSupport');
    useOfflineSupport.mockReturnValue({
      isOnline: false,
      hasOfflineData: true,
      syncPending: false,
      retry: vi.fn(),
    });
    
    render(<OfflineIndicator />);
    
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText(/using cached data/i)).toBeInTheDocument();
  });

  it('shows sync pending indicator', () => {
    const { useOfflineSupport } = require('../../../hooks/useOfflineSupport');
    useOfflineSupport.mockReturnValue({
      isOnline: true,
      hasOfflineData: true,
      syncPending: true,
      retry: vi.fn(),
    });
    
    render(<OfflineIndicator />);
    
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });

  it('does not render when online and no sync pending', () => {
    const { useOfflineSupport } = require('../../../hooks/useOfflineSupport');
    useOfflineSupport.mockReturnValue({
      isOnline: true,
      hasOfflineData: false,
      syncPending: false,
      retry: vi.fn(),
    });
    
    render(<OfflineIndicator />);
    
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('calls retry function when retry button is clicked', () => {
    const mockRetry = vi.fn();
    const { useOfflineSupport } = require('../../../hooks/useOfflineSupport');
    useOfflineSupport.mockReturnValue({
      isOnline: false,
      hasOfflineData: true,
      syncPending: false,
      retry: mockRetry,
    });
    
    render(<OfflineIndicator />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});