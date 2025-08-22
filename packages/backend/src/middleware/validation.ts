import { Request, Response, NextFunction } from 'express'
import { body, query, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { ValidationError } from './errorHandler.js'
import { logger } from '../utils/logger.js'

// Validation result handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }))

    logger.warn('Validation errors:', {
      url: req.url,
      method: req.method,
      errors: errorMessages,
      ip: req.ip
    })

    throw new ValidationError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`)
  }
  next()
}

// Common validation rules
export const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email is required')

export const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')

export const idValidation = param('id')
  .isInt({ min: 1 })
  .withMessage('Valid ID is required')

// Date validation for news queries
export const dateValidation = query('date')
  .optional()
  .isISO8601()
  .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)')

// Geographic coordinates validation
export const coordinatesValidation = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 20000 })
    .withMessage('Radius must be between 1 and 20000 kilometers')
]

// Pagination validation
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'TooManyRequests',
      message: 'Too many requests from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    res.status(429).json({
      error: {
        code: 'TooManyRequests',
        message: 'Too many requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    })
  }
})

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: {
      code: 'TooManyAuthAttempts',
      message: 'Too many authentication attempts, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    res.status(429).json({
      error: {
        code: 'TooManyAuthAttempts',
        message: 'Too many authentication attempts, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    })
  }
})

// Strict rate limiting for sensitive endpoints
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per hour
  message: {
    error: {
      code: 'TooManyRequests',
      message: 'Too many requests to sensitive endpoint, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error('Strict rate limit exceeded - potential attack:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    })
    res.status(429).json({
      error: {
        code: 'TooManyRequests',
        message: 'Too many requests to sensitive endpoint, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    })
  }
})

// API endpoint rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  message: {
    error: {
      code: 'TooManyRequests',
      message: 'API rate limit exceeded, please slow down',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('API rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })
    res.status(429).json({
      error: {
        code: 'TooManyRequests',
        message: 'API rate limit exceeded, please slow down',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    })
  }
})

// Article validation rules
export const articleValidation = [
  body('title')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  body('content')
    .optional()
    .isString()
    .withMessage('Content must be a string'),
  body('summary')
    .optional()
    .isString()
    .withMessage('Summary must be a string'),
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .isLength({ max: 1000 })
    .withMessage('URL must be a valid HTTP/HTTPS URL with max 1000 characters'),
  body('source')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Source must be between 1 and 100 characters'),
  body('published_at')
    .isISO8601()
    .withMessage('Published date must be in ISO 8601 format'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('location_name')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Location name must be a string with max 200 characters'),
  body('bias_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Bias score must be an integer between 0 and 100'),
  body('bias_analysis')
    .optional()
    .isObject()
    .withMessage('Bias analysis must be an object'),
  body('bias_analysis.politicalLean')
    .optional()
    .isIn(['left', 'center', 'right'])
    .withMessage('Political lean must be one of: left, center, right'),
  body('bias_analysis.factualAccuracy')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Factual accuracy must be between 0 and 100'),
  body('bias_analysis.emotionalTone')
    .optional()
    .isFloat({ min: -100, max: 100 })
    .withMessage('Emotional tone must be between -100 and 100'),
  body('bias_analysis.confidence')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Confidence must be between 0 and 100'),
]

// Article filter validation for GET requests
export const articleFilterValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format'),
  query('source')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Source must be a string with max 100 characters'),
  query('biasScoreMin')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum bias score must be between 0 and 100'),
  query('biasScoreMax')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Maximum bias score must be between 0 and 100'),
  query('keyword')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Keyword must be a string with max 200 characters'),
  ...coordinatesValidation,
  ...paginationValidation,
]

// Enhanced input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any potential XSS attempts from string inputs
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=/gi, '')
        // Remove data: URLs that could contain scripts
        .replace(/data:text\/html/gi, '')
        // Remove vbscript: protocol
        .replace(/vbscript:/gi, '')
        // Remove expression() CSS
        .replace(/expression\s*\(/gi, '')
        // Remove import statements
        .replace(/@import/gi, '')
        // Remove HTML comments that could hide scripts
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Trim whitespace
        .trim()
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {}
      for (const key in value) {
        // Also sanitize object keys
        const sanitizedKey = typeof key === 'string' ? key.replace(/[<>'"&]/g, '') : key
        sanitized[sanitizedKey] = sanitizeValue(value[key])
      }
      return sanitized
    }
    return value
  }

  req.body = sanitizeValue(req.body)
  req.query = sanitizeValue(req.query)
  req.params = sanitizeValue(req.params)

  next()
}

// SQL injection prevention validation
export const sqlInjectionValidation = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\^)|(\()|(\))|(\+)|(=))/gi,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /((\%27)|(\'))union/gi
  ]

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value))
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue)
    }
    return false
  }

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    logger.error('SQL injection attempt detected:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString()
    })

    return res.status(400).json({
      error: {
        code: 'BadRequest',
        message: 'Invalid request format',
        statusCode: 400,
        timestamp: new Date().toISOString()
      }
    })
  }

  next()
}

// Path traversal prevention
export const pathTraversalValidation = (req: Request, res: Response, next: NextFunction) => {
  const pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    /%2e%2e\//gi,
    /%2e%2e\\/gi
  ]

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return pathTraversalPatterns.some(pattern => pattern.test(value))
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue)
    }
    return false
  }

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params) || checkValue(req.url)) {
    logger.error('Path traversal attempt detected:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    })

    return res.status(400).json({
      error: {
        code: 'BadRequest',
        message: 'Invalid path format',
        statusCode: 400,
        timestamp: new Date().toISOString()
      }
    })
  }

  next()
}