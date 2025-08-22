import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { NewsAggregationService } from './newsAggregationService.js';

export class NewsScheduler {
  private newsService: NewsAggregationService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  constructor() {
    this.newsService = new NewsAggregationService();
  }

  /**
   * Start the news scheduler with default schedule
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('News scheduler is already running');
      return;
    }

    logger.info('Starting news scheduler');
    this.isRunning = true;

    // Schedule news fetching every 30 minutes
    this.scheduleNewsAggregation('*/30 * * * *');
    
    // Schedule cleanup of old articles daily at 2 AM
    this.scheduleCleanup('0 2 * * *');
    
    logger.info('News scheduler started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('News scheduler is not running');
      return;
    }

    logger.info('Stopping news scheduler');
    
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped scheduled task: ${name}`);
    });
    
    this.scheduledTasks.clear();
    this.isRunning = false;
    
    logger.info('News scheduler stopped');
  }

  /**
   * Schedule news aggregation with custom cron expression
   */
  scheduleNewsAggregation(cronExpression: string): void {
    const taskName = 'news-aggregation';
    
    // Stop existing task if it exists
    if (this.scheduledTasks.has(taskName)) {
      this.scheduledTasks.get(taskName)?.stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.runNewsAggregation();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.scheduledTasks.set(taskName, task);
    task.start();
    
    logger.info(`Scheduled news aggregation with cron: ${cronExpression}`);
  }

  /**
   * Schedule cleanup of old articles
   */
  scheduleCleanup(cronExpression: string): void {
    const taskName = 'cleanup';
    
    // Stop existing task if it exists
    if (this.scheduledTasks.has(taskName)) {
      this.scheduledTasks.get(taskName)?.stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      await this.runCleanup();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.scheduledTasks.set(taskName, task);
    task.start();
    
    logger.info(`Scheduled cleanup with cron: ${cronExpression}`);
  }

  /**
   * Run news aggregation manually
   */
  async runNewsAggregation(): Promise<{ success: boolean; stats?: any; error?: string }> {
    logger.info('Running scheduled news aggregation');
    
    try {
      const startTime = Date.now();
      const stats = await this.newsService.aggregateAndSaveNews();
      const duration = Date.now() - startTime;
      
      logger.info('Scheduled news aggregation completed', {
        duration: `${duration}ms`,
        stats
      });
      
      return { success: true, stats };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error in scheduled news aggregation', { error: errorMessage });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Run cleanup of old articles (older than 30 days)
   */
  async runCleanup(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    logger.info('Running scheduled cleanup');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Import ArticleModel dynamically to avoid circular dependencies
      const { ArticleModel } = await import('../models/Article.js');
      const deletedCount = await ArticleModel.deleteOlderThan(thirtyDaysAgo);
      
      logger.info('Scheduled cleanup completed', { deletedCount });
      
      return { success: true, deletedCount };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error in scheduled cleanup', { error: errorMessage });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get status of all scheduled tasks
   */
  getStatus(): {
    isRunning: boolean;
    tasks: Array<{
      name: string;
      isRunning: boolean;
      nextRun?: Date;
    }>;
  } {
    const tasks = Array.from(this.scheduledTasks.entries()).map(([name, task]) => ({
      name,
      isRunning: task.getStatus() === 'scheduled',
      // Note: node-cron doesn't provide next run time, would need a different library for that
    }));

    return {
      isRunning: this.isRunning,
      tasks
    };
  }

  /**
   * Update schedule for news aggregation
   */
  updateNewsSchedule(cronExpression: string): void {
    logger.info(`Updating news aggregation schedule to: ${cronExpression}`);
    this.scheduleNewsAggregation(cronExpression);
  }

  /**
   * Update schedule for cleanup
   */
  updateCleanupSchedule(cronExpression: string): void {
    logger.info(`Updating cleanup schedule to: ${cronExpression}`);
    this.scheduleCleanup(cronExpression);
  }

  /**
   * Validate cron expression
   */
  static validateCronExpression(expression: string): boolean {
    try {
      return cron.validate(expression);
    } catch {
      return false;
    }
  }

  /**
   * Get predefined schedule options
   */
  static getScheduleOptions(): Array<{ label: string; value: string; description: string }> {
    return [
      {
        label: 'Every 15 minutes',
        value: '*/15 * * * *',
        description: 'Fetch news every 15 minutes'
      },
      {
        label: 'Every 30 minutes',
        value: '*/30 * * * *',
        description: 'Fetch news every 30 minutes (default)'
      },
      {
        label: 'Every hour',
        value: '0 * * * *',
        description: 'Fetch news every hour'
      },
      {
        label: 'Every 2 hours',
        value: '0 */2 * * *',
        description: 'Fetch news every 2 hours'
      },
      {
        label: 'Every 6 hours',
        value: '0 */6 * * *',
        description: 'Fetch news every 6 hours'
      },
      {
        label: 'Daily at 9 AM',
        value: '0 9 * * *',
        description: 'Fetch news once daily at 9 AM UTC'
      },
      {
        label: 'Twice daily',
        value: '0 9,21 * * *',
        description: 'Fetch news at 9 AM and 9 PM UTC'
      }
    ];
  }
}

// Global scheduler instance
let globalScheduler: NewsScheduler | null = null;

/**
 * Get or create the global news scheduler instance
 */
export function getNewsScheduler(): NewsScheduler {
  if (!globalScheduler) {
    globalScheduler = new NewsScheduler();
  }
  return globalScheduler;
}

/**
 * Initialize and start the news scheduler
 */
export function initializeNewsScheduler(): void {
  const scheduler = getNewsScheduler();
  
  // Only start if not already running
  if (!scheduler.getStatus().isRunning) {
    scheduler.start();
  }
}

/**
 * Shutdown the news scheduler gracefully
 */
export function shutdownNewsScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
    globalScheduler = null;
  }
}