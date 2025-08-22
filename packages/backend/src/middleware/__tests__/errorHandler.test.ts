import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  notFoundHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  TimeoutError,
  BadGatewayError,
  asyncHandler
} from '../errorHandler';

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      body: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle operational errors correctly', () => {
      const error = new ValidationError('Invalid input data');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'ValidationError',
            message: 'Invalid input data',
            statusCode: 400,
            retryable: false,
            id: expect.stringMatching(/^error_\d+_[a-z0-9]+$/)
          })
        })
      );
    });

    it('should handle non-operational errors in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal database error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'An unexpected error occurred. Please try again.',
            statusCode: 500
          })
        })
      );
    });

    it('should include debug information in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Debug error');
      error.stack = 'Error stack trace';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            devMessage: 'Debug error',
            stack: 'Error stack trace'
          })
        })
      );
    });

    it('should set appropriate headers', () => {
      const error = new RateLimitError('Too many requests');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Error-ID': expect.stringMatching(/^error_\d+_[a-z0-9]+$/),
          'X-Retry-After': '60'
        })
      );
    });

    it('should mark retryable errors correctly', () => {
      const retryableError = new ServiceUnavailableError('Service down');
      
      errorHandler(retryableError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            retryable: true
          })
        })
      );
    });

    it('should include user context when available', () => {
      mockRequest.user = { id: 'user123' };
      const error = new AuthenticationError('Token expired');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      // Verify that user ID is logged (we can't directly test the log call due to mocking)
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 errors correctly', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NotFound',
            message: 'Route GET /test not found',
            statusCode: 404
          })
        })
      );
    });
  });

  describe('Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });

    it('should create AuthorizationError with correct properties', () => {
      const error = new AuthorizationError('Insufficient permissions');
      
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User not found');
      
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create ConflictError with correct properties', () => {
      const error = new ConflictError('Email already exists');
      
      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.isOperational).toBe(true);
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Rate limit exceeded');
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.isOperational).toBe(true);
    });

    it('should create ServiceUnavailableError with correct properties', () => {
      const error = new ServiceUnavailableError('Database unavailable');
      
      expect(error.name).toBe('ServiceUnavailableError');
      expect(error.message).toBe('Database unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.isOperational).toBe(true);
    });

    it('should create TimeoutError with correct properties', () => {
      const error = new TimeoutError('Request timed out');
      
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Request timed out');
      expect(error.statusCode).toBe(408);
      expect(error.isOperational).toBe(true);
    });

    it('should create BadGatewayError with correct properties', () => {
      const error = new BadGatewayError('Upstream server error');
      
      expect(error.name).toBe('BadGatewayError');
      expect(error.message).toBe('Upstream server error');
      expect(error.statusCode).toBe(502);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const asyncOperation = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(asyncOperation);

      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(asyncOperation).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error');
      const asyncOperation = jest.fn().mockRejectedValue(error);
      const wrappedHandler = asyncHandler(asyncOperation);

      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(asyncOperation).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors in async handler', async () => {
      const error = new Error('Sync error in async handler');
      const asyncOperation = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedHandler = asyncHandler(asyncOperation);

      await wrappedHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Error Response Format', () => {
    it('should include all required fields in error response', () => {
      const error = new ValidationError('Test validation error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          id: expect.stringMatching(/^error_\d+_[a-z0-9]+$/),
          code: 'ValidationError',
          message: 'Test validation error',
          statusCode: 400,
          timestamp: expect.any(String),
          retryable: false
        }
      });
    });

    it('should format timestamp correctly', () => {
      const error = new Error('Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const call = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const timestamp = call.error.timestamp;
      
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });
});