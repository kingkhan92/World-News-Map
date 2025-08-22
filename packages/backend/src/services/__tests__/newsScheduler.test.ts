import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';
import { NewsScheduler, getNewsScheduler, initializeNewsScheduler, shutdownNewsScheduler } from '../newsScheduler.js';
import { NewsAggregationService } from '../newsAggregationService.js';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
    validate: vi.fn()
  }
}));

// Mock NewsAggregationService
vi.mock('../newsAggregationService.js', () => ({
  NewsAggregationService: vi.fn().mockImplementation(() => ({
    aggregateAndSaveNews: vi.fn()
  }))
}));

// Mock ArticleModel
vi.mock('../../models/Article.js', () => ({
  ArticleModel: {
    deleteOlderThan: vi.fn()
  }
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('NewsScheduler', () => {
  let scheduler: NewsScheduler;
  let mockTask: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTask = {
      start: vi.fn(),
      stop: vi.fn(),
      getStatus: vi.fn().mockReturnValue('scheduled')
    };
    
    vi.mocked(cron.schedule).mockReturnValue(mockTask);
    vi.mocked(cron.validate).mockReturnValue(true);
    
    scheduler = new NewsScheduler();
  });

  afterEach(() => {
    scheduler.stop();
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('should start the scheduler successfully', () => {
      scheduler.start();
      
      expect(cron.schedule).toHaveBeenCalledTimes(2); // news aggregation + cleanup
      expect(mockTask.start).toHaveBeenCalledTimes(2);
      
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.tasks).toHaveLength(2);
    });

    it('should not start if already running', () => {
      scheduler.start();
      scheduler.start(); // Second call should be ignored
      
      expect(cron.schedule).toHaveBeenCalledTimes(2); // Only from first call
    });
  });

  describe('stop', () => {
    it('should stop all scheduled tasks', () => {
      scheduler.start();
      scheduler.stop();
      
      expect(mockTask.stop).toHaveBeenCalledTimes(2);
      
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.tasks).toHaveLength(0);
    });

    it('should handle stop when not running', () => {
      scheduler.stop(); // Should not throw error
      
      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('scheduleNewsAggregation', () => {
    it('should schedule news aggregation with custom cron', () => {
      const customCron = '0 */2 * * *'; // Every 2 hours
      
      scheduler.scheduleNewsAggregation(customCron);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        customCron,
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'UTC'
        })
      );
      expect(mockTask.start).toHaveBeenCalled();
    });

    it('should replace existing news aggregation schedule', () => {
      scheduler.scheduleNewsAggregation('*/30 * * * *');
      scheduler.scheduleNewsAggregation('0 * * * *'); // Replace with hourly
      
      expect(mockTask.stop).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  describe('runNewsAggregation', () => {
    it('should run news aggregation successfully', async () => {
      const mockStats = { total: 10, saved: 8, errors: 0 };
      const mockNewsService = new NewsAggregationService();
      vi.mocked(mockNewsService.aggregateAndSaveNews).mockResolvedValue(mockStats);
      
      // Replace the service instance
      (scheduler as any).newsService = mockNewsService;
      
      const result = await scheduler.runNewsAggregation();
      
      expect(result.success).toBe(true);
      expect(result.stats).toEqual(mockStats);
      expect(mockNewsService.aggregateAndSaveNews).toHaveBeenCalled();
    });

    it('should handle errors in news aggregation', async () => {
      const mockNewsService = new NewsAggregationService();
      vi.mocked(mockNewsService.aggregateAndSaveNews).mockRejectedValue(new Error('Aggregation failed'));
      
      (scheduler as any).newsService = mockNewsService;
      
      const result = await scheduler.runNewsAggregation();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Aggregation failed');
    });
  });

  describe('runCleanup', () => {
    it('should run cleanup successfully', async () => {
      // Mock dynamic import
      const mockArticleModel = {
        deleteOlderThan: vi.fn().mockResolvedValue(5)
      };
      
      vi.doMock('../../models/Article.js', () => ({
        ArticleModel: mockArticleModel
      }));
      
      const result = await scheduler.runCleanup();
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(5);
    });

    it('should handle errors in cleanup', async () => {
      // Mock dynamic import with error
      vi.doMock('../../models/Article.js', () => {
        throw new Error('Database error');
      });
      
      const result = await scheduler.runCleanup();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getStatus', () => {
    it('should return correct status when running', () => {
      scheduler.start();
      
      const status = scheduler.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.tasks).toHaveLength(2);
      expect(status.tasks[0]).toMatchObject({
        name: 'news-aggregation',
        isRunning: true
      });
      expect(status.tasks[1]).toMatchObject({
        name: 'cleanup',
        isRunning: true
      });
    });

    it('should return correct status when stopped', () => {
      const status = scheduler.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.tasks).toHaveLength(0);
    });
  });

  describe('updateNewsSchedule', () => {
    it('should update news aggregation schedule', () => {
      scheduler.start();
      
      const newCron = '0 */4 * * *'; // Every 4 hours
      scheduler.updateNewsSchedule(newCron);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        newCron,
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'UTC'
        })
      );
    });
  });

  describe('updateCleanupSchedule', () => {
    it('should update cleanup schedule', () => {
      scheduler.start();
      
      const newCron = '0 3 * * *'; // 3 AM daily
      scheduler.updateCleanupSchedule(newCron);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        newCron,
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'UTC'
        })
      );
    });
  });

  describe('validateCronExpression', () => {
    it('should validate correct cron expressions', () => {
      expect(NewsScheduler.validateCronExpression('*/30 * * * *')).toBe(true);
      expect(NewsScheduler.validateCronExpression('0 9 * * *')).toBe(true);
    });

    it('should reject invalid cron expressions', () => {
      vi.mocked(cron.validate).mockReturnValue(false);
      
      expect(NewsScheduler.validateCronExpression('invalid')).toBe(false);
    });

    it('should handle validation errors', () => {
      vi.mocked(cron.validate).mockImplementation(() => {
        throw new Error('Invalid expression');
      });
      
      expect(NewsScheduler.validateCronExpression('*/30 * * * *')).toBe(false);
    });
  });

  describe('getScheduleOptions', () => {
    it('should return predefined schedule options', () => {
      const options = NewsScheduler.getScheduleOptions();
      
      expect(options).toBeInstanceOf(Array);
      expect(options.length).toBeGreaterThan(0);
      
      const option = options[0];
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('description');
    });
  });
});

describe('Global scheduler functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shutdownNewsScheduler(); // Ensure clean state
  });

  afterEach(() => {
    shutdownNewsScheduler();
  });

  describe('getNewsScheduler', () => {
    it('should return the same instance on multiple calls', () => {
      const scheduler1 = getNewsScheduler();
      const scheduler2 = getNewsScheduler();
      
      expect(scheduler1).toBe(scheduler2);
    });
  });

  describe('initializeNewsScheduler', () => {
    it('should initialize and start the scheduler', () => {
      const mockTask = {
        start: vi.fn(),
        stop: vi.fn(),
        getStatus: vi.fn().mockReturnValue('scheduled')
      };
      
      vi.mocked(cron.schedule).mockReturnValue(mockTask);
      
      initializeNewsScheduler();
      
      expect(cron.schedule).toHaveBeenCalled();
      expect(mockTask.start).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      const mockTask = {
        start: vi.fn(),
        stop: vi.fn(),
        getStatus: vi.fn().mockReturnValue('scheduled')
      };
      
      vi.mocked(cron.schedule).mockReturnValue(mockTask);
      
      initializeNewsScheduler();
      initializeNewsScheduler(); // Second call should not start again
      
      // Should only be called once from the first initialization
      expect(cron.schedule).toHaveBeenCalledTimes(2); // news + cleanup
    });
  });

  describe('shutdownNewsScheduler', () => {
    it('should shutdown the scheduler', () => {
      const mockTask = {
        start: vi.fn(),
        stop: vi.fn(),
        getStatus: vi.fn().mockReturnValue('scheduled')
      };
      
      vi.mocked(cron.schedule).mockReturnValue(mockTask);
      
      initializeNewsScheduler();
      shutdownNewsScheduler();
      
      expect(mockTask.stop).toHaveBeenCalled();
    });

    it('should handle shutdown when no scheduler exists', () => {
      // Should not throw error
      expect(() => shutdownNewsScheduler()).not.toThrow();
    });
  });
});