import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserSession } from '../UserSession';
import { db } from '../../database/connection';

// Mock database connection
vi.mock('../../database/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    where: vi.fn(),
    from: vi.fn(),
    returning: vi.fn(),
  },
}));

describe('UserSession Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup method chaining for query builder
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      first: vi.fn(),
    };
    
    (db as any).mockReturnValue(mockQuery);
    Object.assign(db, mockQuery);
  });

  describe('create', () => {
    it('creates a new user session', async () => {
      const sessionData = {
        userId: 1,
        sessionToken: 'session-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
      
      const mockSession = {
        id: 1,
        ...sessionData,
        createdAt: new Date(),
      };
      
      (db.insert as any).mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSession]),
      });
      
      const result = await UserSession.create(sessionData);
      
      expect(db.insert).toHaveBeenCalledWith(sessionData);
      expect(result).toEqual(mockSession);
    });

    it('generates unique session token', async () => {
      const sessionData = {
        userId: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      
      const mockSession = {
        id: 1,
        ...sessionData,
        sessionToken: expect.any(String),
        createdAt: new Date(),
      };
      
      (db.insert as any).mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSession]),
      });
      
      const result = await UserSession.create(sessionData);
      
      expect(result.sessionToken).toBeDefined();
      expect(result.sessionToken.length).toBeGreaterThan(20);
    });
  });

  describe('findByToken', () => {
    it('finds session by token', async () => {
      const mockSession = {
        id: 1,
        userId: 1,
        sessionToken: 'session-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockSession),
          }),
        }),
      });
      
      const result = await UserSession.findByToken('session-token-123');
      
      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('returns null for non-existent token', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      });
      
      const result = await UserSession.findByToken('non-existent-token');
      
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('finds all sessions for a user', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          sessionToken: 'token-1',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          sessionToken: 'token-2',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions),
        }),
      });
      
      const result = await UserSession.findByUserId(1);
      
      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
    });
  });

  describe('deleteByToken', () => {
    it('deletes session by token', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(1), // 1 row affected
      });
      
      const result = await UserSession.deleteByToken('session-token-123');
      
      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('returns false when no session found', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(0), // 0 rows affected
      });
      
      const result = await UserSession.deleteByToken('non-existent-token');
      
      expect(result).toBe(false);
    });
  });

  describe('deleteExpired', () => {
    it('deletes all expired sessions', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(5), // 5 rows affected
      });
      
      const result = await UserSession.deleteExpired();
      
      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });

  describe('isExpired', () => {
    it('returns true for expired session', () => {
      const expiredSession = {
        id: 1,
        userId: 1,
        sessionToken: 'token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date(),
      };
      
      const result = UserSession.isExpired(expiredSession);
      
      expect(result).toBe(true);
    });

    it('returns false for valid session', () => {
      const validSession = {
        id: 1,
        userId: 1,
        sessionToken: 'token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        createdAt: new Date(),
      };
      
      const result = UserSession.isExpired(validSession);
      
      expect(result).toBe(false);
    });
  });

  describe('extend', () => {
    it('extends session expiration time', async () => {
      const newExpirationTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      (db.update as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 1,
            userId: 1,
            sessionToken: 'token',
            expiresAt: newExpirationTime,
            createdAt: new Date(),
          }]),
        }),
      });
      
      const result = await UserSession.extend('token', newExpirationTime);
      
      expect(db.update).toHaveBeenCalledWith({ expiresAt: newExpirationTime });
      expect(result.expiresAt).toEqual(newExpirationTime);
    });
  });

  describe('cleanup', () => {
    it('removes old expired sessions', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(10), // 10 rows affected
      });
      
      const result = await UserSession.cleanup();
      
      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });
});