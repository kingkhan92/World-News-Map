import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.js';
import { AuthService } from '../../services/authService.js';

// Mock the AuthService
vi.mock('../../services/authService.js');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const mockAuthResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          preferences: {
            defaultView: 'map',
            preferredSources: [],
            biasThreshold: 50,
            autoRefresh: true,
          },
        },
        tokens: {
          accessToken: 'access.token.here',
          refreshToken: 'refresh.token.here',
        },
        sessionToken: 'session123',
      };

      vi.mocked(AuthService.register).mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toEqual(mockAuthResponse);
      expect(AuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for existing user', async () => {
      vi.mocked(AuthService.register).mockRejectedValue(
        new Error('User with this email already exists')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockAuthResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          preferences: {
            defaultView: 'map',
            preferredSources: [],
            biasThreshold: 50,
            autoRefresh: true,
          },
        },
        tokens: {
          accessToken: 'access.token.here',
          refreshToken: 'refresh.token.here',
        },
        sessionToken: 'session123',
      };

      vi.mocked(AuthService.login).mockResolvedValue(mockAuthResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toEqual(mockAuthResponse);
    });

    it('should return 401 for invalid credentials', async () => {
      vi.mocked(AuthService.login).mockRejectedValue(
        new Error('Invalid email or password')
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('LOGIN_ERROR');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      // Mock the authentication middleware by adding user to request
      const mockUser = { id: 1, email: 'test@example.com' };
      
      // We need to mock the middleware behavior
      vi.doMock('../../middleware/auth.js', () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          req.user = mockUser;
          next();
        },
      }));

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid.jwt.token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.user).toEqual(mockUser);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      vi.mocked(AuthService.logout).mockResolvedValue();

      // Mock the session authentication middleware
      vi.doMock('../../middleware/auth.js', () => ({
        authenticateSession: (req: any, res: any, next: any) => {
          req.sessionToken = 'session123';
          req.user = { id: 1, email: 'test@example.com' };
          next();
        },
      }));

      const response = await request(app)
        .post('/api/auth/logout')
        .set('x-session-token', 'session123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});