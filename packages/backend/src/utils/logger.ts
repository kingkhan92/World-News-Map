import winston from 'winston'

const logLevel = process.env.LOG_LEVEL || 'info'
const nodeEnv = process.env.NODE_ENV || 'development'

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    return log
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'news-map-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: nodeEnv === 'development' ? consoleFormat : logFormat
    })
  ]
})

// Add file transports in production
if (nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }))

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }))

  // Security events log
  logger.add(new winston.transports.File({
    filename: 'logs/security.log',
    level: 'warn',
    maxsize: 5242880, // 5MB
    maxFiles: 20,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta
        })
      })
    )
  }))

  // Performance monitoring log
  logger.add(new winston.transports.File({
    filename: 'logs/performance.log',
    level: 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, duration, ...meta }) => {
        // Only log performance-related entries
        if (duration || message.includes('performance') || message.includes('slow')) {
          return JSON.stringify({
            timestamp,
            level,
            message,
            duration,
            ...meta
          })
        }
        return false
      })
    )
  }))
}

// Enhanced request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  // Add request ID to request object for tracing
  req.requestId = requestId
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      contentLength: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString()
    }

    // Log slow requests as warnings
    if (duration > 5000) {
      logger.warn('Slow HTTP Request', { ...logData, performance: 'slow' })
    } else if (res.statusCode >= 500) {
      logger.error('HTTP Server Error', logData)
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Client Error', logData)
    } else {
      logger.info('HTTP Request', logData)
    }
  })

  next()
}

// System monitoring logger
export const systemLogger = {
  logMemoryUsage: () => {
    const memUsage = process.memoryUsage()
    logger.info('Memory Usage', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString()
    })
  },

  logSystemHealth: () => {
    const uptime = process.uptime()
    const cpuUsage = process.cpuUsage()
    
    logger.info('System Health', {
      uptime: `${Math.round(uptime)}s`,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString()
    })
  }
}

// Start system monitoring in production
if (nodeEnv === 'production') {
  // Log system stats every 5 minutes
  setInterval(() => {
    systemLogger.logMemoryUsage()
    systemLogger.logSystemHealth()
  }, 5 * 60 * 1000)
}