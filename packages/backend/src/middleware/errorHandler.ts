import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export class ValidationError extends Error {
  statusCode = 400
  isOperational = true

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  statusCode = 401
  isOperational = true

  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  statusCode = 403
  isOperational = true

  constructor(message: string = 'Access denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  isOperational = true

  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  isOperational = true

  constructor(message: string = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends Error {
  statusCode = 429
  isOperational = true

  constructor(message: string = 'Too many requests') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class ServiceUnavailableError extends Error {
  statusCode = 503
  isOperational = true

  constructor(message: string = 'Service temporarily unavailable') {
    super(message)
    this.name = 'ServiceUnavailableError'
  }
}

export class TimeoutError extends Error {
  statusCode = 408
  isOperational = true

  constructor(message: string = 'Request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class BadGatewayError extends Error {
  statusCode = 502
  isOperational = true

  constructor(message: string = 'Bad gateway') {
    super(message)
    this.name = 'BadGatewayError'
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500
  const isOperational = error.isOperational || false
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Enhanced error context
  const errorContext = {
    errorId,
    message: error.message,
    stack: error.stack,
    statusCode,
    isOperational,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.id,
    requestBody: req.method !== 'GET' ? req.body : undefined,
    queryParams: req.query
  }

  // Log error details with enhanced context
  logger.error('Error occurred:', errorContext)

  // Determine user-friendly message based on error type and status code
  const getUserFriendlyMessage = (error: AppError, statusCode: number): string => {
    if (isOperational) {
      return error.message
    }

    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.'
      case 401:
        return 'Authentication required. Please log in to continue.'
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        return 'Conflict detected. The resource already exists or is in use.'
      case 422:
        return 'Invalid data provided. Please check your input.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
        return 'Internal server error. Please try again later.'
      case 502:
        return 'Service temporarily unavailable. Please try again later.'
      case 503:
        return 'Service maintenance in progress. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  const userMessage = getUserFriendlyMessage(error, statusCode)
  const devMessage = process.env.NODE_ENV !== 'production' ? error.message : userMessage

  // Enhanced error response
  const errorResponse = {
    error: {
      id: errorId,
      code: error.name || getErrorCodeFromStatus(statusCode),
      message: userMessage,
      statusCode,
      timestamp: new Date().toISOString(),
      retryable: isRetryableError(statusCode),
      ...(process.env.NODE_ENV === 'development' && {
        devMessage,
        stack: error.stack,
        context: {
          url: req.url,
          method: req.method,
          userAgent: req.get('User-Agent')
        }
      })
    }
  }

  // Set appropriate headers for error responses
  res.set({
    'Content-Type': 'application/json',
    'X-Error-ID': errorId,
    'X-Retry-After': getRetryAfter(statusCode)
  })

  res.status(statusCode).json(errorResponse)
}

const getErrorCodeFromStatus = (statusCode: number): string => {
  const codes: { [key: number]: string } = {
    400: 'BadRequest',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'NotFound',
    409: 'Conflict',
    422: 'ValidationError',
    429: 'TooManyRequests',
    500: 'InternalServerError',
    502: 'BadGateway',
    503: 'ServiceUnavailable'
  }
  return codes[statusCode] || 'UnknownError'
}

const isRetryableError = (statusCode: number): boolean => {
  // Errors that can be retried
  return [408, 429, 500, 502, 503, 504].includes(statusCode)
}

const getRetryAfter = (statusCode: number): string => {
  switch (statusCode) {
    case 429: return '60' // Rate limit - retry after 60 seconds
    case 503: return '300' // Service unavailable - retry after 5 minutes
    default: return '30' // Default retry after 30 seconds
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  })

  res.status(404).json({
    error: {
      code: 'NotFound',
      message: `Route ${req.method} ${req.url} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString()
    }
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}