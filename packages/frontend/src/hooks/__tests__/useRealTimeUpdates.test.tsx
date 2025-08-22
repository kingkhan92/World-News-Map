import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRealTimeUpdates } from '../useRealTimeUpdates'
import { socketService } from '../../services/socketService'
import { useAuth } from '../../contexts/AuthContext'

// Mock dependencies
vi.mock('../../services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    subscribeToRegion: vi.fn(),
    unsubscribeFromRegion: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    lastPingTime: null,
    getConnectionStatus: vi.fn(() => ({
      connected: false,
      connecting: false,
      error: null,
      lastPing: null
    }))
  }
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useRealTimeUpdates', () => {
  let mockUser: any
  let mockToken: string
  let mockUnsubscribe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com' }
    mockToken = 'mock-token'
    mockUnsubscribe = vi.fn()
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn()
    })
    
    vi.mocked(socketService.on).mockReturnValue(mockUnsubscribe)
    vi.mocked(socketService.connect).mockResolvedValue(undefined)
    vi.mocked(socketService.reconnect).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should connect when user is authenticated and autoConnect is true', async () => {
      renderHook(() => useRealTimeUpdates({ autoConnect: true }), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalledWith(mockToken)
      })
    })

    it('should not connect when autoConnect is false', () => {
      renderHook(() => useRealTimeUpdates({ autoConnect: false }), {
        wrapper: createWrapper()
      })

      expect(socketService.connect).not.toHaveBeenCalled()
    })

    it('should disconnect when user logs out', () => {
      const { rerender } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      // Simulate user logout
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn()
      })

      rerender()

      expect(socketService.disconnect).toHaveBeenCalled()
    })

    it('should provide connection control methods', () => {
      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      expect(typeof result.current.connect).toBe('function')
      expect(typeof result.current.disconnect).toBe('function')
      expect(typeof result.current.reconnect).toBe('function')
    })

    it('should handle manual reconnection', async () => {
      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.reconnect()
      })

      expect(socketService.reconnect).toHaveBeenCalledWith(mockToken)
    })
  })

  describe('Event Listeners', () => {
    it('should set up event listeners on mount', () => {
      renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      expect(socketService.on).toHaveBeenCalledWith('news-update', expect.any(Function))
      expect(socketService.on).toHaveBeenCalledWith('user-update', expect.any(Function))
      expect(socketService.on).toHaveBeenCalledWith('connection-status', expect.any(Function))
    })

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalledTimes(3) // news, user, connection status
    })

    it('should call custom news update handler', () => {
      const mockNewsHandler = vi.fn()
      const mockNewsData = {
        type: 'new' as const,
        article: { id: 1, title: 'Test Article' },
        timestamp: Date.now()
      }

      renderHook(() => useRealTimeUpdates({
        onNewsUpdate: mockNewsHandler
      }), {
        wrapper: createWrapper()
      })

      // Get the news update handler that was registered
      const newsUpdateHandler = vi.mocked(socketService.on).mock.calls
        .find(call => call[0] === 'news-update')?.[1]

      expect(newsUpdateHandler).toBeDefined()
      
      // Simulate news update
      act(() => {
        newsUpdateHandler?.(mockNewsData)
      })

      expect(mockNewsHandler).toHaveBeenCalledWith(mockNewsData)
    })

    it('should call custom user update handler', () => {
      const mockUserHandler = vi.fn()
      const mockUserData = {
        type: 'preferences',
        data: { theme: 'dark' },
        timestamp: Date.now()
      }

      renderHook(() => useRealTimeUpdates({
        onUserUpdate: mockUserHandler
      }), {
        wrapper: createWrapper()
      })

      // Get the user update handler that was registered
      const userUpdateHandler = vi.mocked(socketService.on).mock.calls
        .find(call => call[0] === 'user-update')?.[1]

      expect(userUpdateHandler).toBeDefined()
      
      // Simulate user update
      act(() => {
        userUpdateHandler?.(mockUserData)
      })

      expect(mockUserHandler).toHaveBeenCalledWith(mockUserData)
    })

    it('should call custom connection status handler', () => {
      const mockStatusHandler = vi.fn()
      const mockStatusData = {
        connected: true,
        connecting: false,
        error: null,
        lastPing: Date.now()
      }

      renderHook(() => useRealTimeUpdates({
        onConnectionStatusChange: mockStatusHandler
      }), {
        wrapper: createWrapper()
      })

      // Get the connection status handler that was registered
      const statusHandler = vi.mocked(socketService.on).mock.calls
        .find(call => call[0] === 'connection-status')?.[1]

      expect(statusHandler).toBeDefined()
      
      // Simulate status change
      act(() => {
        statusHandler?.(mockStatusData)
      })

      expect(mockStatusHandler).toHaveBeenCalledWith(mockStatusData)
    })
  })

  describe('Region Subscription', () => {
    it('should provide region subscription methods', () => {
      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      expect(typeof result.current.subscribeToRegion).toBe('function')
      expect(typeof result.current.unsubscribeFromRegion).toBe('function')
    })

    it('should call socketService for region subscription', () => {
      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      const bounds = { north: 41, south: 40, east: -73, west: -75 }

      act(() => {
        result.current.subscribeToRegion(bounds)
      })

      expect(socketService.subscribeToRegion).toHaveBeenCalledWith(bounds)
    })

    it('should call socketService for region unsubscription', () => {
      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      const bounds = { north: 41, south: 40, east: -73, west: -75 }

      act(() => {
        result.current.unsubscribeFromRegion(bounds)
      })

      expect(socketService.unsubscribeFromRegion).toHaveBeenCalledWith(bounds)
    })
  })

  describe('Connection Status', () => {
    it('should expose connection status properties', () => {
      vi.mocked(socketService).isConnected = true
      vi.mocked(socketService).isConnecting = false
      vi.mocked(socketService).connectionError = null
      vi.mocked(socketService).lastPingTime = Date.now()

      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.connectionError).toBe(null)
      expect(typeof result.current.lastPingTime).toBe('number')
    })

    it('should provide connection status object', () => {
      const mockStatus = {
        connected: true,
        connecting: false,
        error: null,
        lastPing: Date.now()
      }

      vi.mocked(socketService.getConnectionStatus).mockReturnValue(mockStatus)

      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      expect(result.current.connectionStatus).toEqual(mockStatus)
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed')
      vi.mocked(socketService.connect).mockRejectedValue(connectionError)

      // Should not throw error
      renderHook(() => useRealTimeUpdates({ autoConnect: true }), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(socketService.connect).toHaveBeenCalled()
      })
    })

    it('should handle reconnection errors gracefully', async () => {
      const reconnectionError = new Error('Reconnection failed')
      vi.mocked(socketService.reconnect).mockRejectedValue(reconnectionError)

      const { result } = renderHook(() => useRealTimeUpdates(), {
        wrapper: createWrapper()
      })

      // Should not throw error
      await act(async () => {
        await result.current.reconnect()
      })

      expect(socketService.reconnect).toHaveBeenCalled()
    })
  })
})