import { Request, Response, NextFunction } from 'express'
import { 
  sanitizeInput, 
  sqlInjectionValidation, 
  pathTraversalValidation 
} from '../validation.js'

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe('Enhanced Validation Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      url: '/test',
      method: 'GET',
      query: {},
      body: {},
      params: {}
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    mockNext = jest.fn()
  })

  describe('sanitizeInput', () => {
    it('should sanitize XSS attempts in request body', () => {
      mockReq.body = {
        title: '<script>alert("xss")</script>Normal Title',
        content: 'javascript:alert("xss")',
        description: 'onclick="alert(1)" some text'
      }

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.body.title).toBe('Normal Title')
      expect(mockReq.body.content).toBe('alert("xss")')
      expect(mockReq.body.description).toBe(' some text')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should sanitize dangerous protocols', () => {
      mockReq.body = {
        url: 'vbscript:alert("test")',
        link: 'data:text/html,<script>alert(1)</script>'
      }

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.body.url).toBe('alert("test")')
      expect(mockReq.body.link).toBe(',')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: '<script>alert("nested")</script>John',
          profile: {
            bio: 'javascript:void(0) Bio text'
          }
        }
      }

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.body.user.name).toBe('John')
      expect(mockReq.body.user.profile.bio).toBe('void(0) Bio text')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should remove null bytes', () => {
      mockReq.body = {
        text: 'Normal text\0with null byte'
      }

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.body.text).toBe('Normal textwith null byte')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('sqlInjectionValidation', () => {
    it('should allow normal requests', () => {
      mockReq.body = { title: 'Normal article title', content: 'Regular content' }
      mockReq.query = { page: '1', limit: '10' }

      sqlInjectionValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should block SQL injection in body', () => {
      mockReq.body = { 
        search: "'; DROP TABLE users; --",
        title: 'Normal title'
      }

      sqlInjectionValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'BadRequest',
          message: 'Invalid request format',
          statusCode: 400,
          timestamp: expect.any(String)
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block SQL injection in query parameters', () => {
      mockReq.query = { 
        filter: "1' OR '1'='1",
        page: '1'
      }

      sqlInjectionValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block UNION-based SQL injection', () => {
      mockReq.body = { 
        id: "1 UNION SELECT password FROM users"
      }

      sqlInjectionValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('pathTraversalValidation', () => {
    it('should allow normal paths', () => {
      mockReq.url = '/api/news/articles'
      mockReq.body = { filename: 'document.pdf' }
      mockReq.query = { path: 'uploads/images' }

      pathTraversalValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should block path traversal in URL', () => {
      mockReq.url = '/api/files/../../../etc/passwd'

      pathTraversalValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'BadRequest',
          message: 'Invalid path format',
          statusCode: 400,
          timestamp: expect.any(String)
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block path traversal in body', () => {
      mockReq.body = { 
        filepath: '../../../etc/passwd',
        name: 'normal_file.txt'
      }

      pathTraversalValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block URL-encoded path traversal', () => {
      mockReq.query = { 
        file: '%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      }

      pathTraversalValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should block Windows-style path traversal', () => {
      mockReq.body = { 
        path: '..\\..\\windows\\system32\\config\\sam'
      }

      pathTraversalValidation(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})