import { Router, Request, Response } from 'express'
import { getDatabaseStatus } from '../database/init.js'
import { redisClient } from '../utils/redis.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'
import { monitoringService } from '../services/monitoringService.js'

const router = Router()

// Basic health check
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now()
  
  try {
    // Check database connection
    const dbStatus = await getDatabaseStatus()
    const dbResponseTime = Date.now() - startTime
    
    // Check Redis connection
    const redisStartTime = Date.now()
    const redisStatus = redisClient.isReady() ? 'connected' : 'disconnected'
    const redisResponseTime = Date.now() - redisStartTime
    
    // System information
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
    
    const healthData = {
      status: 'OK',
      message: 'Backend server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`
        },
        redis: {
          status: redisStatus,
          responseTime: `${redisResponseTime}ms`
        }
      },
      system: systemInfo
    }
    
    // Log health check
    logger.info('Health check performed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      services: healthData.services
    })
    
    res.json(healthData)
  } catch (error) {
    logger.error('Health check failed:', error)
    
    res.status(503).json({
      status: 'ERROR',
      message: 'Service unavailable',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

// Detailed status endpoint
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now()
  
  try {
    // Database detailed check
    const dbStatus = await getDatabaseStatus()
    const dbResponseTime = Date.now() - startTime
    
    // Redis detailed check
    const redisStartTime = Date.now()
    let redisInfo = null
    let redisStatus = 'disconnected'
    
    if (redisClient.isReady()) {
      try {
        redisInfo = await redisClient.info()
        redisStatus = 'connected'
      } catch (error) {
        redisStatus = 'error'
      }
    }
    const redisResponseTime = Date.now() - redisStartTime
    
    // Environment variables (safe ones only)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      LOG_LEVEL: process.env.LOG_LEVEL,
      DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]',
      REDIS_URL: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT SET]',
      JWT_SECRET: process.env.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]'
    }
    
    // System metrics
    const systemMetrics = {
      uptime: {
        process: process.uptime(),
        system: require('os').uptime()
      },
      memory: {
        process: process.memoryUsage(),
        system: {
          total: require('os').totalmem(),
          free: require('os').freemem()
        }
      },
      cpu: {
        usage: process.cpuUsage(),
        count: require('os').cpus().length,
        load: require('os').loadavg()
      },
      network: require('os').networkInterfaces()
    }
    
    const statusData = {
      status: 'OK',
      message: 'Detailed system status',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`
        },
        redis: {
          status: redisStatus,
          responseTime: `${redisResponseTime}ms`,
          info: redisInfo ? 'Available' : 'Not available'
        }
      },
      environment_variables: envInfo,
      system_metrics: systemMetrics,
      endpoints: {
        health: 'GET /api/health',
        status: 'GET /api/health/status',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          logout: 'POST /api/auth/logout',
          profile: 'GET /api/auth/profile'
        },
        news: {
          articles: 'GET /api/news/articles',
          article: 'GET /api/news/article/:id',
          refresh: 'POST /api/news/refresh',
          sources: 'GET /api/news/sources'
        },
        user: {
          preferences: 'GET /api/user/preferences',
          updatePreferences: 'PUT /api/user/preferences',
          history: 'GET /api/user/history',
          interaction: 'POST /api/user/interaction'
        }
      }
    }
    
    logger.info('Status check performed', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    res.json(statusData)
  } catch (error) {
    logger.error('Status check failed:', error)
    
    res.status(503).json({
      status: 'ERROR',
      message: 'Service unavailable',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}))

// Metrics endpoint for monitoring
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  try {
    const metricsHistory = monitoringService.getMetricsHistory()
    const systemStatus = monitoringService.getSystemStatus()
    const healthStatus = await monitoringService.performHealthChecks()
    
    res.json({
      current: systemStatus.metrics,
      history: metricsHistory,
      services: healthStatus.services,
      overall_status: healthStatus.overall,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Metrics endpoint failed:', error)
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    })
  }
}))

export default router