import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../authService.js';
import { UserModel } from '../../models/User.js';
import { UserSessionModel } from '../../models/UserSession.js';

// Mock the models and utilities
vi.mock('../../models/User.js');
vi.mock('../../models/UserSession.js');
vi.mock('../../utils/redis.js', () => ({
  redisClient: {
    setSession: vi.fn(),
    deleteSession: vi.fn(),
    deleteUserSessions: vi.fn(),
    extendSession: vi.fn(),
    getSession: vi.fn(),
  },
  ensureRedisConnection: vi.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        preferences: {
          defaultView: 'map',
          preferredSources: [],
          biasThreshold: 50,
          autoRefresh: true,
        },
      };

      // Mock UserModel methods
      vi.mocked(UserModel.findByEmail).mockResolvedValue(null);
      vi.mocked(UserModel.create).mockResolvedValue(mockUser);
      vi.mocked(UserSessionModel.create).mockResolvedValue({
        id: 1,
        user_id: 1,
        session_token: 'session123',
        expires_at: new Date(),
        created_at: new Date(),
      });

      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.sessionToken).toBeDefined();
      expect(UserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(UserModel.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        preferences: {},
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(existingUser);

      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$validhashedpassword',
        created_at: new Date(),
        preferences: {
          defaultView: 'map',
          preferredSources: [],
          biasThreshold: 50,
          autoRefresh: true,
        },
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(UserSessionModel.create).mockResolvedValue({
        id: 1,
        user_id: 1,
        session_token: 'session123',
        expires_at: new Date(),
        created_at: new Date(),
      });

      // Mock bcrypt.compare to return true
      const bcrypt = await import('bcrypt');
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.sessionToken).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      vi.mocked(UserModel.findByEmail).mockResolvedValue(null);

      await expect(
        AuthService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$validhashedpassword',
        created_at: new Date(),
        preferences: {},
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser);

      // Mock bcrypt.compare to return false
      const bcrypt = await import('bcrypt');
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      vi.mocked(UserSessionModel.deleteByToken).mockResolvedValue(true);

      await expect(AuthService.logout('session123')).resolves.not.toThrow();
      expect(UserSessionModel.deleteByToken).toHaveBeenCalledWith('session123');
    });
  });

  describe('logoutAll', () => {
    it('should logout all user sessions', async () => {
      vi.mocked(UserSessionModel.deleteAllByUserId).mockResolvedValue(3);

      await expect(AuthService.logoutAll(1)).resolves.not.toThrow();
      expect(UserSessionModel.deleteAllByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('validateSession', () => {
    it('should validate session and return user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        preferences: {},
      };

      const mockSession = {
        id: 1,
        user_id: 1,
        session_token: 'session123',
        expires_at: new Date(Date.now() + 86400000), // 24 hours from now
        created_at: new Date(),
      };

      vi.mocked(UserSessionModel.findByToken).mockResolvedValue(mockSession);
      vi.mocked(UserModel.findById).mockResolvedValue(mockUser);

      const result = await AuthService.validateSession('session123');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for invalid session', async () => {
      vi.mocked(UserSessionModel.findByToken).mockResolvedValue(null);

      const result = await AuthService.validateSession('invalidsession');

      expect(result).toBeNull();
    });
  });
});