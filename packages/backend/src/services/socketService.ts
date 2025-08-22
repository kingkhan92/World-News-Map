import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'
import { User } from '../models/User.js'

interface AuthenticatedSocket extends Socket {
  userId?: number
  user?: User
}

interface SocketData {
  userId: number
  user: User
}

let io: SocketIOServer | null = null

export const initializeSocketIO = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        logger.warn('Socket connection attempted without token', {
          socketId: socket.id,
          ip: socket.handshake.address
        })
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
      const user = await User.findById(decoded.userId)
      
      if (!user) {
        logger.warn('Socket connection attempted with invalid user', {
          socketId: socket.id,
          userId: decoded.userId,
          ip: socket.handshake.address
        })
        return next(new Error('Invalid user'))
      }

      socket.userId = user.id
      socket.user = user
      
      logger.info('Socket authenticated successfully', {
        socketId: socket.id,
        userId: user.id,
        email: user.email,
        ip: socket.handshake.address
      })
      
      next()
    } catch (error) {
      logger.warn('Socket authentication failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: socket.handshake.address
      })
      next(new Error('Authentication failed'))
    }
  })

  // Connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('User connected via Socket.io', {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.user?.email,
      ip: socket.handshake.address
    })

    // Join user-specific room for targeted updates
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
      logger.debug('User joined personal room', {
        socketId: socket.id,
        userId: socket.userId,
        room: `user:${socket.userId}`
      })
    }

    // Join global news updates room
    socket.join('news-updates')
    logger.debug('User joined news updates room', {
      socketId: socket.id,
      userId: socket.userId
    })

    // Handle client ping for connection status
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })

    // Handle subscription to specific geographic regions
    socket.on('subscribe-region', (data: { bounds: { north: number, south: number, east: number, west: number } }) => {
      const regionRoom = `region:${data.bounds.north},${data.bounds.south},${data.bounds.east},${data.bounds.west}`
      socket.join(regionRoom)
      
      logger.debug('User subscribed to region', {
        socketId: socket.id,
        userId: socket.userId,
        region: regionRoom,
        bounds: data.bounds
      })
      
      socket.emit('region-subscribed', { region: regionRoom })
    })

    // Handle unsubscription from geographic regions
    socket.on('unsubscribe-region', (data: { bounds: { north: number, south: number, east: number, west: number } }) => {
      const regionRoom = `region:${data.bounds.north},${data.bounds.south},${data.bounds.east},${data.bounds.west}`
      socket.leave(regionRoom)
      
      logger.debug('User unsubscribed from region', {
        socketId: socket.id,
        userId: socket.userId,
        region: regionRoom
      })
      
      socket.emit('region-unsubscribed', { region: regionRoom })
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('User disconnected from Socket.io', {
        socketId: socket.id,
        userId: socket.userId,
        email: socket.user?.email,
        reason,
        ip: socket.handshake.address
      })
    })

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error('Socket.io error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
        stack: error.stack
      })
    })

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to real-time updates',
      userId: socket.userId,
      timestamp: Date.now()
    })
  })

  logger.info('Socket.io server initialized successfully')
  return io
}

export const getSocketIO = (): SocketIOServer | null => {
  return io
}

export const broadcastNewsUpdate = (article: any, updateType: 'new' | 'updated' | 'deleted' = 'new') => {
  if (!io) {
    logger.warn('Attempted to broadcast news update but Socket.io not initialized')
    return
  }

  const updateData = {
    type: updateType,
    article,
    timestamp: Date.now()
  }

  // Broadcast to all users in news-updates room
  io.to('news-updates').emit('news-update', updateData)

  // If article has location, broadcast to relevant geographic regions
  if (article.latitude && article.longitude) {
    // Create region rooms based on article location (simplified approach)
    const regionRooms = generateRegionRooms(article.latitude, article.longitude)
    
    regionRooms.forEach(room => {
      io.to(room).emit('news-update', updateData)
    })
  }

  logger.info('News update broadcasted', {
    articleId: article.id,
    title: article.title,
    updateType,
    location: article.latitude && article.longitude ? 
      `${article.latitude},${article.longitude}` : 'no location',
    timestamp: updateData.timestamp
  })
}

export const sendUserSpecificUpdate = (userId: number, data: any) => {
  if (!io) {
    logger.warn('Attempted to send user-specific update but Socket.io not initialized')
    return
  }

  io.to(`user:${userId}`).emit('user-update', {
    ...data,
    timestamp: Date.now()
  })

  logger.debug('User-specific update sent', {
    userId,
    dataType: data.type || 'unknown',
    timestamp: Date.now()
  })
}

// Helper function to generate region room names based on coordinates
const generateRegionRooms = (lat: number, lng: number): string[] => {
  const rooms: string[] = []
  
  // Generate rooms for different zoom levels/regions
  // This is a simplified approach - in production you might want more sophisticated region management
  const gridSize = 10 // degrees
  const latGrid = Math.floor(lat / gridSize) * gridSize
  const lngGrid = Math.floor(lng / gridSize) * gridSize
  
  rooms.push(`region:${latGrid + gridSize},${latGrid},${lngGrid + gridSize},${lngGrid}`)
  
  return rooms
}

export const getConnectedUsersCount = (): number => {
  if (!io) return 0
  return io.engine.clientsCount
}

export const getUserConnectionStatus = (userId: number): boolean => {
  if (!io) return false
  
  const room = io.sockets.adapter.rooms.get(`user:${userId}`)
  return room ? room.size > 0 : false
}