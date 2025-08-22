import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({
      url: redisUrl,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  /**
   * Store session data in Redis
   */
  async setSession(sessionToken: string, userId: number, expirationSeconds: number): Promise<void> {
    await this.client.setEx(`session:${sessionToken}`, expirationSeconds, userId.toString());
  }

  /**
   * Get session data from Redis
   */
  async getSession(sessionToken: string): Promise<number | null> {
    const userId = await this.client.get(`session:${sessionToken}`);
    return userId ? parseInt(userId, 10) : null;
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionToken: string): Promise<void> {
    await this.client.del(`session:${sessionToken}`);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: number): Promise<void> {
    const keys = await this.client.keys(`session:*`);
    const pipeline = this.client.multi();
    
    for (const key of keys) {
      const storedUserId = await this.client.get(key);
      if (storedUserId === userId.toString()) {
        pipeline.del(key);
      }
    }
    
    await pipeline.exec();
  }

  /**
   * Check if session exists and is valid
   */
  async sessionExists(sessionToken: string): Promise<boolean> {
    const exists = await this.client.exists(`session:${sessionToken}`);
    return exists === 1;
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionToken: string, expirationSeconds: number): Promise<void> {
    await this.client.expire(`session:${sessionToken}`, expirationSeconds);
  }

  /**
   * Get connection status
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Set a key with expiration
   */
  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setEx(key, seconds, value);
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Delete one or more keys
   */
  async del(keys: string | string[]): Promise<number> {
    return await this.client.del(keys);
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  /**
   * Get Redis info
   */
  async info(section?: string): Promise<string> {
    return await this.client.info(section);
  }

  /**
   * Create a multi/pipeline for batch operations
   */
  multi() {
    return this.client.multi();
  }
}

// Create and export a singleton instance
export const redisClient = new RedisClient();

// Helper function to ensure Redis is connected
export async function ensureRedisConnection(): Promise<void> {
  if (!redisClient.isReady()) {
    await redisClient.connect();
  }
}