import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ConnectionStatus } from '../ConnectionStatus';

// Mock the socket service
vi.mock('../../../services/socketService', () => ({
  socketService: {
    isConnected: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows connected status when online', () => {
    const { socketService } = require('../../../services/socketService');
    socketService.isConnected.mockReturnValue(true);
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('connected');
  });

  it('shows disconnected status when offline', () => {
    const { socketService } = require('../../../services/socketService');
    socketService.isConnected.mockReturnValue(false);
    
    render(<ConnectionStatus />);
    
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('disconnected');
  });

  it('shows reconnecting status', () => {
    render(<ConnectionStatus isReconnecting />);
    
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('reconnecting');
  });

  it('can be hidden when showWhenConnected is false', () => {
    const { socketService } = require('../../../services/socketService');
    socketService.isConnected.mockReturnValue(true);
    
    render(<ConnectionStatus showWhenConnected={false} />);
    
    expect(screen.queryByTestId('connection-indicator')).not.toBeInTheDocument();
  });
});