import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserInteraction } from '../UserInteraction';
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
    orderBy: vi.fn(),
    limit: vi.fn(),
  },
}));

describe('UserInteraction Model', () => {
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
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      first: vi.fn(),
    };
    
    (db as any).mockReturnValue(mockQuery);
    Object.assign(db, mockQuery);
  });

  describe('create', () => {
    it('creates a new user interaction', async () => {
      const interactionData = {
        userId: 1,
        articleId: 123,
        interactionType: 'view' as const,
      };
      
      const mockInteraction = {
        id: 1,
        ...interactionData,
        createdAt: new Date(),
      };
      
      (db.insert as any).mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockInteraction]),
      });
      
      const result = await UserInteraction.create(interactionData);
      
      expect(db.insert).toHaveBeenCalledWith(interactionData);
      expect(result).toEqual(mockInteraction);
    });

    it('validates interaction type', async () => {
      const interactionData = {
        userId: 1,
        articleId: 123,
        interactionType: 'invalid-type' as any,
      };
      
      await expect(UserInteraction.create(interactionData))
        .rejects.toThrow('Invalid interaction type');
    });
  });

  describe('findByUserId', () => {
    it('finds all interactions for a user', async () => {
      const mockInteractions = [
        {
          id: 1,
          userId: 1,
          articleId: 123,
          interactionType: 'view',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          articleId: 124,
          interactionType: 'bookmark',
          createdAt: new Date(),
        },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockInteractions),
          }),
        }),
      });
      
      const result = await UserInteraction.findByUserId(1);
      
      expect(result).toEqual(mockInteractions);
      expect(result).toHaveLength(2);
    });

    it('limits results when specified', async () => {
      const mockInteractions = [
        {
          id: 1,
          userId: 1,
          articleId: 123,
          interactionType: 'view',
          createdAt: new Date(),
        },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockInteractions),
            }),
          }),
        }),
      });
      
      const result = await UserInteraction.findByUserId(1, { limit: 10 });
      
      expect(db.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockInteractions);
    });

    it('filters by interaction type', async () => {
      const mockInteractions = [
        {
          id: 1,
          userId: 1,
          articleId: 123,
          interactionType: 'bookmark',
          createdAt: new Date(),
        },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockInteractions),
            }),
          }),
        }),
      });
      
      const result = await UserInteraction.findByUserId(1, { type: 'bookmark' });
      
      expect(result).toEqual(mockInteractions);
    });
  });

  describe('findByArticleId', () => {
    it('finds all interactions for an article', async () => {
      const mockInteractions = [
        {
          id: 1,
          userId: 1,
          articleId: 123,
          interactionType: 'view',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 2,
          articleId: 123,
          interactionType: 'share',
          createdAt: new Date(),
        },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockInteractions),
          }),
        }),
      });
      
      const result = await UserInteraction.findByArticleId(123);
      
      expect(result).toEqual(mockInteractions);
      expect(result).toHaveLength(2);
    });
  });

  describe('findUserArticleInteraction', () => {
    it('finds specific user-article interaction', async () => {
      const mockInteraction = {
        id: 1,
        userId: 1,
        articleId: 123,
        interactionType: 'bookmark',
        createdAt: new Date(),
      };
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(mockInteraction),
              }),
            }),
          }),
        }),
      });
      
      const result = await UserInteraction.findUserArticleInteraction(1, 123, 'bookmark');
      
      expect(result).toEqual(mockInteraction);
    });

    it('returns null when interaction not found', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(null),
              }),
            }),
          }),
        }),
      });
      
      const result = await UserInteraction.findUserArticleInteraction(1, 999, 'view');
      
      expect(result).toBeNull();
    });
  });

  describe('getInteractionCounts', () => {
    it('returns interaction counts for an article', async () => {
      const mockCounts = [
        { interactionType: 'view', count: '15' },
        { interactionType: 'bookmark', count: '3' },
        { interactionType: 'share', count: '7' },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockCounts),
          }),
        }),
      });
      
      const result = await UserInteraction.getInteractionCounts(123);
      
      expect(result).toEqual({
        view: 15,
        bookmark: 3,
        share: 7,
      });
    });
  });

  describe('getUserStats', () => {
    it('returns user interaction statistics', async () => {
      const mockStats = [
        { interactionType: 'view', count: '25' },
        { interactionType: 'bookmark', count: '8' },
        { interactionType: 'share', count: '12' },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockStats),
          }),
        }),
      });
      
      const result = await UserInteraction.getUserStats(1);
      
      expect(result).toEqual({
        view: 25,
        bookmark: 8,
        share: 12,
        total: 45,
      });
    });
  });

  describe('deleteUserInteraction', () => {
    it('deletes specific user interaction', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(1), // 1 row affected
          }),
        }),
      });
      
      const result = await UserInteraction.deleteUserInteraction(1, 123, 'bookmark');
      
      expect(result).toBe(true);
    });

    it('returns false when interaction not found', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(0), // 0 rows affected
          }),
        }),
      });
      
      const result = await UserInteraction.deleteUserInteraction(1, 999, 'view');
      
      expect(result).toBe(false);
    });
  });

  describe('getRecentInteractions', () => {
    it('returns recent interactions across all users', async () => {
      const mockInteractions = [
        {
          id: 3,
          userId: 2,
          articleId: 125,
          interactionType: 'view',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: 1,
          articleId: 124,
          interactionType: 'bookmark',
          createdAt: new Date(),
        },
      ];
      
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockInteractions),
          }),
        }),
      });
      
      const result = await UserInteraction.getRecentInteractions(10);
      
      expect(db.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(db.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockInteractions);
    });
  });

  describe('cleanup', () => {
    it('removes old interactions', async () => {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(50), // 50 rows affected
      });
      
      const result = await UserInteraction.cleanup(cutoffDate);
      
      expect(db.delete).toHaveBeenCalled();
      expect(result).toBe(50);
    });
  });
});