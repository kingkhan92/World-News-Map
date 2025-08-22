import { Request, Response, NextFunction } from 'express'
import { 
  securityHeaders, 
  requestSizeLimit, 
  suspiciousActivityDetection, 
  ipFiltering 
} from '../security.js'

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe('Security Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      url: '/test',
      method: 'GET',
      get: jest.fn(),
      query: {},
      body: {},
      params: {}
    }
    mockRes = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    mockNext = jest.fn()
  })

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      securityHeaders(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
      expect(mockRes.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin')
      expect(mockRes.removeHeader).toHaveBeenCalledWith('X-Powered-By')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requestSizeLimit', () => {
    it('should allow requests within size limit', () => {
      mockReq.get = jest.fn().mockReturnValue('1000') // 1KB

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject requests exceeding size limit', () => {
      mockReq.get = jest.fn().mockReturnValue('20971520') // 20MB

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(413)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'PayloadTooLarge',
          message: 'Request payload too large',
          statusCode: 413,
          timestamp: expect.any(String)
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('suspiciousActivityDetection', () => {
    it('should allow normal requests', () => {
      mockReq.url = '/api/news/articles'
      mockReq.query = { page: '1' }
      mockReq.body = { title: 'Normal article title' }
      mockReq.get = jest.fn().mockReturnValue('Mozilla/5.0')

      suspiciousActivityDetection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should block SQL injection attempts', () => {
      mockReq.url = '/api/news/articles'
      mockReq.query = { search: "'; DROP TABLE users; --" }
      mockReq.get = jest.fn().mockReturnValue('Mozilla/5.0')

      suspiciousActivityDetection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'BadRequest',
          message: 'Invalid request detected',
          statusCode: 400,
          timestamp: expect.any(String)
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block XSS attempts', () => {
      mockReq.body = { content: '<script>alert("xss")</script>' }
      mockReq.get = jest.fn().mockReturnValue('Mozilla/5.0')

      suspiciousActivityDetection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block suspicious user agents', () => {
      mockReq.get = jest.fn().mockReturnValue('sqlmap/1.0')

      suspiciousActivityDetection(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'Forbidden',
          message: 'Access denied',
          statusCode: 403,
          timestamp: expect.any(String)
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('ipFiltering', () => {
    it('should allow requests from non-blacklisted IPs', () => {
      process.env.BLACKLISTED_IPS = '192.168.1.100,10.0.0.50'
      mockReq.ip = '127.0.0.1'

      ipFiltering(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should block requests from blacklisted IPs', () => {
      process.env.BLACKLISTED_IPS = '192.168.1.100,127.0.0.1'
      mockReq.ip = '127.0.0.1'
      mockReq.get = jest.fn().mockReturnValue('Mozilla/5.0')

      ipFiltering(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'Forbidden',
          message: 'Access denied',
          statusCode: 403,
          timestamp: expect.any(String)
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})