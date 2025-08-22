import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../../routes/auth';
import { userRouter } from '../../routes/user';
import { authMiddleware } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import { User } from '../../models/User';
import { authService } from '../../services/authService';

// Mock dependencies
vi.mock('../../models/User');
vi.mock('../../services/authService');
vi.mock('../../utils/redis');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/user', authMiddleware, userRouter);
app.use(errorHandler);

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    it('successfully registers a new user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        preferences: {},
      };
      
      (User.findByEmail as any).mockResolvedValue(null);
      (User.create as any).mockResolvedValue(mockUser);
      (authService.generateToken as any).mockReturnValue('jwt-token');
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201);
      
      expect(response.body).toEqual({
        user: mockUser,
        token: 'jwt-token',
      });
      
      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: expect.any(String), // hashed password
      });
    });

    it('prevents duplicate email registration', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
      };
      
      (User.findByEmail as any).mockResolvedValue(existingUser);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);
      
      expect(response.body.error.message).toContain('already exists');
    });

    it('validates email format during registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
      
      expect(response.body.error.message).toContain('valid email');
    });

    it('validates password strength during registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);
      
      expect(response.body.error.message).toContain('password');
    });
  });

  describe('User Login Flow', () => {
    it('successfully logs in with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        preferences: {},
      };
      
      (User.findByEmail as any).mockResolvedValue(mockUser);
      (authService.verifyPassword as any).mockResolvedValue(true);
      (authService.generateToken as any).mockReturnValue('jwt-token');
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);
      
      expect(response.body).toEqual({
        user: {
          id: 1,
          email: 'test@example.com',
          preferences: {},
        },
        token: 'jwt-token',
      });
    });

    it('rejects login with invalid email', async () => {
      (User.findByEmail as any).mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
      
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('rejects login with invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
      };
      
      (User.findByEmail as any).mockResolvedValue(mockUser);
      (authService.verifyPassword as any).mockResolvedValue(false);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password',
        })
        .expect(401);
      
      expect(response.body.error.message).toContain('Invalid credentials');
    });
  });

  describe('Protected Route Access', () => {
    it('allows access to protected routes with valid token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        preferences: {},
      };
      
      (authService.verifyToken as any).mockReturnValue({ userId: 1 });
      (User.findById as any).mockResolvedValue(mockUser);
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);
      
      expect(response.body).toEqual(mockUser);
    });

    it('denies access to protected routes without token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);
      
      expect(response.body.error.message).toContain('No token provided');
    });

    it('denies access to protected routes with invalid token', async () => {
      (authService.verifyToken as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error.message).toContain('Invalid token');
    });

    it('denies access when user no longer exists', async () => {
      (authService.verifyToken as any).mockReturnValue({ userId: 999 });
      (User.findById as any).mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(401);
      
      expect(response.body.error.message).toContain('User not found');
    });
  });

  describe('Session Management', () => {
    it('successfully logs out user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
      };
      
      (authService.verifyToken as any).mockReturnValue({ userId: 1 });
      (User.findById as any).mockResolvedValue(mockUser);
      (authService.invalidateToken as any).mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);
      
      expect(response.body).toEqual({ success: true });
      expect(authService.invalidateToken).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('refreshes authentication token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        preferences: {},
      };
      
      (authService.verifyToken as any).mockReturnValue({ userId: 1 });
      (User.findById as any).mockResolvedValue(mockUser);
      (authService.generateToken as any).mockReturnValue('new-jwt-token');
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);
      
      expect(response.body).toEqual({
        user: mockUser,
        token: 'new-jwt-token',
      });
    });
  });

  describe('User Preferences Management', () => {
    it('updates user preferences', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        preferences: { defaultView: 'map' },
      };
      
      const updatedPreferences = {
        defaultView: 'globe',
        biasThreshold: 60,
      };
      
      (authService.verifyToken as any).mockReturnValue({ userId: 1 });
      (User.findById as any).mockResolvedValue(mockUser);
      (User.updatePreferences as any).mockResolvedValue({
        ...mockUser,
        preferences: updatedPreferences,
      });
      
      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(updatedPreferences)
        .expect(200);
      
      expect(response.body.preferences).toEqual(updatedPreferences);
      expect(User.updatePreferences).toHaveBeenCalledWith(1, updatedPreferences);
    });

    it('validates preference values', async () => {
      (authService.verifyToken as any).mockReturnValue({ userId: 1 });
      (User.findById as any).mockResolvedValue({ id: 1 });
      
      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send({
          defaultView: 'invalid-view',
          biasThreshold: 150, // Invalid range
        })
        .expect(400);
      
      expect(response.body.error.message).toContain('Invalid');
    });
  });

  describe('Rate Limiting', () => {
    it('applies rate limiting to login attempts', async () => {
      (User.findByEmail as any).mockResolvedValue(null);
      
      // Make multiple rapid login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
      );
      
      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles database connection errors gracefully', async () => {
      (User.findByEmail as any).mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(500);
      
      expect(response.body.error.message).toContain('Internal server error');
    });

    it('handles malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);
      
      expect(response.body.error.message).toContain('Invalid JSON');
    });
  });
});