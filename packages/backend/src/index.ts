import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { initializeDatabase } from './database/init.js'
import { ensureRedisConnection } from './utils/redis.js'
import { logger, requestLogger } from './utils/logger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { generalRateLimit, sanitizeInput, sqlInjectionValidation, pathTraversalValidation } from './middleware/validation.js'
import { securityHeaders, requestSizeLimit, suspiciousActivityDetection, ipFiltering, securityLogger } from './middleware/security.js'
import { initializeNewsScheduler, shutdownNewsScheduler } from './services/newsScheduler.js'
import { initializeSocketIO } from './services/socketService.js'
import { monitoringService } from './services/monitoringService.js'
import apiRoutes from './routes/index.js'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1)

// Security middleware (applied first)
app.use(ipFiltering)
app.use(securityHeaders)
app.use(requestSizeLimit)
app.use(suspiciousActivityDetection)
app.use(securityLogger)

// Helmet security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// Rate limiting
app.use(generalRateLimit)

// Input validation and sanitization
app.use(sqlInjectionValidation)
app.use(pathTraversalValidation)
app.use(sanitizeInput)

// API routes
app.use('/api', apiRoutes)

// Root endpoint with API documentation
app.get('/', (req, res) => {
  logger.info('Root endpoint accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.json({ 
    message: 'Interactive World News Map API',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health - Basic health check',
      status: 'GET /api/health/status - Detailed system status',
      auth: {
        register: 'POST /api/auth/register - User registration',
        login: 'POST /api/auth/login - User login',
        logout: 'POST /api/auth/logout - User logout',
        profile: 'GET /api/auth/profile - Get user profile'
      },
      news: {
        articles: 'GET /api/news/articles - Get articles with filtering',
        article: 'GET /api/news/article/:id - Get specific article',
        refresh: 'POST /api/news/refresh - Trigger news refresh',
        sources: 'GET /api/news/sources - Get available news sources',
        statistics: 'GET /api/news/statistics - Get news database statistics',
        scheduler: {
          status: 'GET /api/news/scheduler/status - Get scheduler status',
          run: 'POST /api/news/scheduler/run - Manually run news aggregation',
          cleanup: 'POST /api/news/scheduler/cleanup - Manually run cleanup'
        }
      },
      user: {
        preferences: 'GET /api/user/preferences - Get user preferences',
        updatePreferences: 'PUT /api/user/preferences - Update user preferences',
        history: 'GET /api/user/history - Get user interaction history',
        interaction: 'POST /api/user/interaction - Record user interaction'
      }
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  shutdownNewsScheduler()
  
  try {
    const { BiasAnalysisService } = await import('./services/biasAnalysisService.js')
    await BiasAnalysisService.cleanup()
    logger.info('Bias analysis service cleaned up')
  } catch (error) {
    logger.warn('Bias analysis service cleanup failed:', error)
  }
  
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  shutdownNewsScheduler()
  
  try {
    const { BiasAnalysisService } = await import('./services/biasAnalysisService.js')
    await BiasAnalysisService.cleanup()
    logger.info('Bias analysis service cleaned up')
  } catch (error) {
    logger.warn('Bias analysis service cleanup failed:', error)
  }
  
  process.exit(0)
})

// Initialize database and start server
const startServer = async () => {
  try {
    logger.info('Starting server initialization...')
    
    logger.info('Initializing database...')
    await initializeDatabase()
    logger.info('Database initialized successfully')
    
    logger.info('Connecting to Redis...')
    try {
      await ensureRedisConnection()
      logger.info('Redis connected successfully')
    } catch (error) {
      logger.warn('Redis connection failed, continuing without Redis:', error)
    }
    
    logger.info('Initializing Socket.io...')
    try {
      initializeSocketIO(server)
      logger.info('Socket.io initialized successfully')
    } catch (error) {
      logger.warn('Socket.io initialization failed:', error)
    }
    
    logger.info('Initializing news scheduler...')
    try {
      initializeNewsScheduler()
      logger.info('News scheduler initialized successfully')
    } catch (error) {
      logger.warn('News scheduler initialization failed:', error)
    }
    
    logger.info('Starting monitoring service...')
    try {
      monitoringService.startMonitoring()
      logger.info('Monitoring service started successfully')
    } catch (error) {
      logger.warn('Monitoring service initialization failed:', error)
    }
    
    logger.info('Initializing bias analysis service...')
    try {
      const { BiasAnalysisService } = await import('./services/biasAnalysisService.js')
      await BiasAnalysisService.initialize()
      logger.info('Bias analysis service initialized successfully')
    } catch (error) {
      logger.warn('Bias analysis service initialization failed:', error)
    }
    
    server.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info('Available endpoints:')
      logger.info('  GET  / - API documentation')
      logger.info('  GET  /api/health - Health check')
      logger.info('  GET  /api/health/status - Detailed status')
      logger.info('  POST /api/auth/register - User registration')
      logger.info('  POST /api/auth/login - User login')
      logger.info('  POST /api/auth/logout - User logout')
      logger.info('  GET  /api/auth/profile - User profile')
      logger.info('  GET  /api/news/articles - Get articles')
      logger.info('  GET  /api/news/article/:id - Get article details')
      logger.info('  POST /api/news/refresh - Refresh news')
      logger.info('  GET  /api/news/sources - Get news sources')
      logger.info('  GET  /api/user/preferences - Get user preferences')
      logger.info('  PUT  /api/user/preferences - Update user preferences')
      logger.info('  GET  /api/user/history - Get user history')
      logger.info('  POST /api/user/interaction - Record interaction')
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()