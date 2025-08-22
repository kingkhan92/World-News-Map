import { vi } from 'vitest';
import { authService } from '../authService';
import { apiClient } from '../apiClient';

// Mock the API client
vi.mock('../apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock session manager
vi.mock('../../../utils/sessionManager', () => ({
  sessionManager: {
    setToken: vi.fn(),
    getToken: vi.fn(),
    removeToken: vi.fn(),
    setUser: vi.fn(),
    getUser: vi.fn(),
    removeUser: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in user', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com' },
          token: 'jwt-token',
        },
      };
      
      (apiClient.post as any).mockResolvedValue(mockResponse);
      
      const result = await authService.login('test@example.com', 'password123');
      
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
      
      expect(result).toEqual(mockResponse.data);
      
      const { sessionManager } = require('../../../utils/sessionManager');
      expect(sessionManager.setToken).toHaveBeenCalledWith('jwt-token');
      expect(sessionManager.setUser).toHaveBeenCalledWith(mockResponse.data.user);
    });

    it('handles login failure', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Invalid credentials'));
      
      await expect(authService.login('test@example.com', 'wrong-password'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('successfully registers user', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, email: 'test@example.com' },
          token: 'jwt-token',
        },
      };
      
      (apiClient.post as any).mockResolvedValue(mockResponse);
      
      const result = await authService.register('test@example.com', 'password123');
      
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
        email: 'test@example.com',
        password: 'password123',
      });
      
      expect(result).toEqual(mockResponse.data);
      
      const { sessionManager } = require('../../../utils/sessionManager');
      expect(sessionManager.setToken).toHaveBeenCalledWith('jwt-token');
      expect(sessionManager.setUser).toHaveBeenCalledWith(mockResponse.data.user);
    });

    it('handles registration failure', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Email already exists'));
      
      await expect(authService.register('test@example.com', 'password123'))
        .rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('successfully logs out user', async () => {
      (apiClient.post as any).mockResolvedValue({ data: { success: true } });
      
      await authService.logout();
      
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout');
      
      const { sessionManager } = require('../../../utils/sessionManager');
      expect(sessionManager.removeToken).toHaveBeenCalled();
      expect(sessionManager.removeUser).toHaveBeenCalled();
    });

    it('clears session even if API call fails', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Network error'));
      
      await authService.logout();
      
      const { sessionManager } = require('../../../utils/sessionManager');
      expect(sessionManager.removeToken).toHaveBeenCalled();
      expect(sessionManager.removeUser).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user profile', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      (apiClient.get as any).mockResolvedValue({ data: mockUser });
      
      const result = await authService.getCurrentUser();
      
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/profile');
      expect(result).toEqual(mockUser);
    });

    it('handles unauthorized access', async () => {
      (apiClient.get as any).mockRejectedValue(new Error('Unauthorized'));
      
      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('refreshToken', () => {
    it('refreshes authentication token', async () => {
      const mockResponse = {
        data: {
          token: 'new-jwt-token',
          user: { id: 1, email: 'test@example.com' },
        },
      };
      
      (apiClient.post as any).mockResolvedValue(mockResponse);
      
      const result = await authService.refreshToken();
      
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh');
      expect(result).toEqual(mockResponse.data);
      
      const { sessionManager } = require('../../../utils/sessionManager');
      expect(sessionManager.setToken).toHaveBeenCalledWith('new-jwt-token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when user has valid token', () => {
      const { sessionManager } = require('../../../utils/sessionManager');
      sessionManager.getToken.mockReturnValue('valid-token');
      sessionManager.getUser.mockReturnValue({ id: 1 });
      
      const result = authService.isAuthenticated();
      
      expect(result).toBe(true);
    });

    it('returns false when no token exists', () => {
      const { sessionManager } = require('../../../utils/sessionManager');
      sessionManager.getToken.mockReturnValue(null);
      
      const result = authService.isAuthenticated();
      
      expect(result).toBe(false);
    });
  });
});