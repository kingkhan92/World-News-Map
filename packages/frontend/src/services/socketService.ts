import { io, Socket } from 'socket.io-client'
import { Article } from '../types/Article'

interface NewsUpdateData {
  type: 'new' | 'updated' | 'deleted'
  article: Article
  timestamp: number
}

interface UserUpdateData {
  type: string
  data: any
  timestamp: number
}

interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  error: string | null
  lastPing: number | null
}

class SocketService {
  private socket: Socket | null = null
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
    error: null,
    lastPing: null
  }
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  constructor() {
    this.initializeEventListeners()
  }

  private initializeEventListeners() {
    // Initialize listener sets for different event types
    this.listeners.set('news-update', new Set())
    this.listeners.set('user-update', new Set())
    this.listeners.set('connection-status', new Set())
    this.listeners.set('region-subscribed', new Set())
    this.listeners.set('region-unsubscribed', new Set())
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      this.connectionStatus.connecting = true
      this.connectionStatus.error = null
      this.notifyConnectionStatusListeners()

      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      })

      // Connection successful
      this.socket.on('connect', () => {
        console.log('Socket.io connected successfully')
        this.connectionStatus.connected = true
        this.connectionStatus.connecting = false
        this.connectionStatus.error = null
        this.reconnectAttempts = 0
        this.startPingInterval()
        this.notifyConnectionStatusListeners()
        resolve()
      })

      // Connection confirmation from server
      this.socket.on('connected', (data) => {
        console.log('Server connection confirmed:', data)
      })

      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error)
        this.connectionStatus.connected = false
        this.connectionStatus.connecting = false
        this.connectionStatus.error = error.message
        this.notifyConnectionStatusListeners()
        
        if (this.reconnectAttempts === 0) {
          reject(new Error(`Failed to connect: ${error.message}`))
        }
      })

      // Disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason)
        this.connectionStatus.connected = false
        this.connectionStatus.connecting = false
        this.stopPingInterval()
        this.notifyConnectionStatusListeners()

        // Attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          this.connectionStatus.error = 'Disconnected by server'
        } else {
          // Client-side disconnect or network issue, will auto-reconnect
          this.connectionStatus.error = `Connection lost: ${reason}`
        }
      })

      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket.io reconnection attempt ${attemptNumber}`)
        this.reconnectAttempts = attemptNumber
        this.connectionStatus.connecting = true
        this.connectionStatus.error = `Reconnecting... (attempt ${attemptNumber})`
        this.notifyConnectionStatusListeners()
      })

      // Successful reconnection
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`Socket.io reconnected after ${attemptNumber} attempts`)
        this.connectionStatus.connected = true
        this.connectionStatus.connecting = false
        this.connectionStatus.error = null
        this.reconnectAttempts = 0
        this.startPingInterval()
        this.notifyConnectionStatusListeners()
      })

      // Failed to reconnect
      this.socket.on('reconnect_failed', () => {
        console.error('Socket.io failed to reconnect')
        this.connectionStatus.connected = false
        this.connectionStatus.connecting = false
        this.connectionStatus.error = 'Failed to reconnect after maximum attempts'
        this.notifyConnectionStatusListeners()
      })

      // News updates
      this.socket.on('news-update', (data: NewsUpdateData) => {
        console.log('Received news update:', data)
        this.notifyListeners('news-update', data)
      })

      // User-specific updates
      this.socket.on('user-update', (data: UserUpdateData) => {
        console.log('Received user update:', data)
        this.notifyListeners('user-update', data)
      })

      // Region subscription confirmations
      this.socket.on('region-subscribed', (data) => {
        console.log('Region subscribed:', data)
        this.notifyListeners('region-subscribed', data)
      })

      this.socket.on('region-unsubscribed', (data) => {
        console.log('Region unsubscribed:', data)
        this.notifyListeners('region-unsubscribed', data)
      })

      // Pong response for ping
      this.socket.on('pong', (data) => {
        this.connectionStatus.lastPing = data.timestamp
        this.notifyConnectionStatusListeners()
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.stopPingInterval()
      this.socket.disconnect()
      this.socket = null
    }
    
    this.connectionStatus.connected = false
    this.connectionStatus.connecting = false
    this.connectionStatus.error = null
    this.connectionStatus.lastPing = null
    this.notifyConnectionStatusListeners()
  }

  subscribeToRegion(bounds: { north: number, south: number, east: number, west: number }) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-region', { bounds })
    }
  }

  unsubscribeFromRegion(bounds: { north: number, south: number, east: number, west: number }) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-region', { bounds })
    }
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      this.listeners.get(event)?.delete(callback)
    } else {
      this.listeners.get(event)?.clear()
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in ${event} listener:`, error)
        }
      })
    }
  }

  private notifyConnectionStatusListeners() {
    this.notifyListeners('connection-status', this.connectionStatus)
  }

  private startPingInterval() {
    this.stopPingInterval()
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  // Getters
  get isConnected(): boolean {
    return this.connectionStatus.connected
  }

  get isConnecting(): boolean {
    return this.connectionStatus.connecting
  }

  get connectionError(): string | null {
    return this.connectionStatus.error
  }

  get lastPingTime(): number | null {
    return this.connectionStatus.lastPing
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  // Manual reconnection
  reconnect(token: string): Promise<void> {
    this.disconnect()
    return this.connect(token)
  }
}

// Export singleton instance
export const socketService = new SocketService()
export default socketService