import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Remove server information
  res.removeHeader('X-Powered-By')
  
  next()
}

// Request size validation
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0')
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (contentLength > maxSize) {
    logger.warn('Request size limit exceeded:', {
      ip: req.ip,
      url: req.url,
      contentLength,
      maxSize,
      timestamp: new Date().toISOString()
    })
    
    return res.status(413).json({
      error: {
        code: 'PayloadTooLarge',
        message: 'Request payload too large',
        statusCode: 413,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  next()
}

// Suspicious activity detection
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || ''
  const ip = req.ip
  const url = req.url
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter|exec|script)\b/i,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload|onerror|onclick/gi,
    /\.\.\//g,
    /\/etc\/passwd/gi,
    /\/proc\/self\/environ/gi
  ]
  
  const requestString = `${url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      logger.error('Suspicious activity detected:', {
        ip,
        url,
        method: req.method,
        userAgent,
        pattern: pattern.toString(),
        requestData: {
          query: req.query,
          body: req.body
        },
        timestamp: new Date().toISOString()
      })
      
      return res.status(400).json({
        error: {
          code: 'BadRequest',
          message: 'Invalid request detected',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      })
    }
  }
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ]
  
  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      logger.error('Suspicious user agent detected:', {
        ip,
        url,
        userAgent,
        timestamp: new Date().toISOString()
      })
      
      return res.status(403).json({
        error: {
          code: 'Forbidden',
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      })
    }
  }
  
  next()
}

// IP whitelist/blacklist middleware
export const ipFiltering = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip
  
  // Blacklisted IPs (can be loaded from database or config)
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || []
  
  if (blacklistedIPs.includes(ip)) {
    logger.error('Blacklisted IP access attempt:', {
      ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    })
    
    return res.status(403).json({
      error: {
        code: 'Forbidden',
        message: 'Access denied',
        statusCode: 403,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  next()
}

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const securityData = {
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString(),
    headers: {
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP'),
      'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
    }
  }
  
  // Log all requests to sensitive endpoints
  const sensitiveEndpoints = ['/api/auth/', '/api/user/', '/api/admin/']
  const isSensitive = sensitiveEndpoints.some(endpoint => req.url.startsWith(endpoint))
  
  if (isSensitive) {
    logger.info('Security log - sensitive endpoint access:', securityData)
  }
  
  next()
}