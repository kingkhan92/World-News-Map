import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { Client as SocketIOClient } from 'socket.io-client'
import jwt from 'jsonwebtoken'
import { initializeSocketIO, broadcastNewsUpdate, sendUserSpecificUpdate, getConnectedUsersCount } from '../socketService'
import { User } from '../../models/User'

// Mock dependencies
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}))

vi.mock('../../models/User.js', () => ({
  User: {
    findById: vi.fn(),
  }
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  }
}))

describe('SocketService', () => {
  let httpServer: HTTPServer
  let io: SocketIOServer
  let clientSocket: SocketIOClient
  let serverSocket: any
  let mockUser: any

  beforeEach(async () => {
    // Create HTTP server
    httpServer = new HTTPServer()
    
    // Initialize Socket.io
    io = initializeSocketIO(httpServer)
    
    // Mock user
    mockUser = {
      id: 1,
      email: 'test@example.com'
    }
    
    // Mock JWT verification
    vi.mocked(jwt.verify).mockReturnValue({ userId: 1 } as any)
    vi.mocked(User.findById).mockResolvedValue(mockUser)
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any)?.port
        
        // Create client socket
        clientSocket = new SocketIOClient(`http://localhost:${port}`, {
          auth: { token: 'valid-token' },
          transports: ['websocket']
        })
        
        io.on('connection', (socket) => {
          serverSocket = socket
        })
        
        clientSocket.on('connect', resolve)
      })
    })
  })

  afterEach(() => {
    io.close()
    clientSocket.close()
    httpServer.close()
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should authenticate valid token', () => {
      expect(vi.mocked(jwt.verify)).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET)
      expect(vi.mocked(User.findById)).toHaveBeenCalledWith(1)
    })

    it('should join user-specific room', (done) => {
      // Check if socket joined the user room
      setTimeout(() => {
        const rooms = Array.from(serverSocket.rooms)
        expect(rooms).toContain('user:1')
        expect(rooms).toContain('news-updates')
        done()
      }, 100)
    })
  })

  describe('News Broadcasting', () => {
    it('should broadcast news updates to all users', (done) => {
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        content: 'Test content',
        latitude: 40.7128,
        longitude: -74.0060
      }

      clientSocket.on('news-update', (data) => {
        expect(data.type).toBe('new')
        expect(data.article).toEqual(mockArticle)
        expect(data.timestamp).toBeTypeOf('number')
        done()
      })

      // Broadcast news update
      broadcastNewsUpdate(mockArticle, 'new')
    })

    it('should broadcast different update types', (done) => {
      const mockArticle = { id: 1, title: 'Updated Article' }
      let updateCount = 0

      clientSocket.on('news-update', (data) => {
        updateCount++
        
        if (updateCount === 1) {
          expect(data.type).toBe('updated')
        } else if (updateCount === 2) {
          expect(data.type).toBe('deleted')
          done()
        }
      })

      broadcastNewsUpdate(mockArticle, 'updated')
      broadcastNewsUpdate(mockArticle, 'deleted')
    })
  })

  describe('User-Specific Updates', () => {
    it('should send updates to specific user', (done) => {
      const updateData = {
        type: 'preferences',
        data: { theme: 'dark' }
      }

      clientSocket.on('user-update', (data) => {
        expect(data.type).toBe('preferences')
        expect(data.data).toEqual({ theme: 'dark' })
        expect(data.timestamp).toBeTypeOf('number')
        done()
      })

      sendUserSpecificUpdate(1, updateData)
    })

    it('should not send updates to other users', (done) => {
      const updateData = {
        type: 'preferences',
        data: { theme: 'dark' }
      }

      // This should not trigger the event since we're sending to user 2
      clientSocket.on('user-update', () => {
        done(new Error('Should not receive update for different user'))
      })

      sendUserSpecificUpdate(2, updateData)
      
      // Wait a bit and then complete the test
      setTimeout(done, 200)
    })
  })

  describe('Region Subscription', () => {
    it('should handle region subscription', (done) => {
      const bounds = {
        north: 41,
        south: 40,
        east: -73,
        west: -75
      }

      clientSocket.on('region-subscribed', (data) => {
        expect(data.region).toContain('region:')
        done()
      })

      clientSocket.emit('subscribe-region', { bounds })
    })

    it('should handle region unsubscription', (done) => {
      const bounds = {
        north: 41,
        south: 40,
        east: -73,
        west: -75
      }

      clientSocket.on('region-unsubscribed', (data) => {
        expect(data.region).toContain('region:')
        done()
      })

      // First subscribe, then unsubscribe
      clientSocket.emit('subscribe-region', { bounds })
      setTimeout(() => {
        clientSocket.emit('unsubscribe-region', { bounds })
      }, 100)
    })
  })

  describe('Connection Management', () => {
    it('should handle ping/pong', (done) => {
      clientSocket.on('pong', (data) => {
        expect(data.timestamp).toBeTypeOf('number')
        done()
      })

      clientSocket.emit('ping')
    })

    it('should send connection confirmation', (done) => {
      // This should have been sent on connection
      clientSocket.on('connected', (data) => {
        expect(data.message).toContain('Successfully connected')
        expect(data.userId).toBe(1)
        expect(data.timestamp).toBeTypeOf('number')
        done()
      })
    })

    it('should track connected users count', () => {
      const count = getConnectedUsersCount()
      expect(count).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const errorClient = new SocketIOClient(`http://localhost:${(httpServer.address() as any)?.port}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket']
      })

      await new Promise<void>((resolve) => {
        errorClient.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication failed')
          resolve()
        })
      })

      errorClient.close()
    })

    it('should handle missing token', async () => {
      const noTokenClient = new SocketIOClient(`http://localhost:${(httpServer.address() as any)?.port}`, {
        transports: ['websocket']
      })

      await new Promise<void>((resolve) => {
        noTokenClient.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication token required')
          resolve()
        })
      })

      noTokenClient.close()
    })
  })
})